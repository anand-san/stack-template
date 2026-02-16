import { describe, expect, it } from "bun:test";
import {
  executeRun,
  type RunExecutorDependencies,
} from "../orchestration/run-executor";
import type { RunState, RunnerOptions, TasksDocument } from "../types";

function makeOptions(overrides: Partial<RunnerOptions>): RunnerOptions {
  return {
    command: "start",
    planPath: "/tmp/PLAN.md",
    tasksPath: "/tmp/tasks.json",
    retry: 1,
    dryRun: false,
    allowDirty: false,
    skipQualityGates: false,
    printLogs: false,
    ...overrides,
  };
}

function makeDocument(): TasksDocument {
  return {
    idea: "idea",
    generatedAt: "2026-01-01T00:00:00.000Z",
    repo: "repo",
    phases: [
      {
        id: "phase-1",
        name: "Phase 1",
        goal: "Ship",
        exitCriteria: ["Done"],
        tasks: [
          {
            id: "task-001",
            status: "todo",
            title: "Task 1",
            description: "Do 1",
            notes: [],
          },
          {
            id: "task-002",
            status: "todo",
            title: "Task 2",
            description: "Do 2",
            notes: [],
          },
        ],
      },
    ],
  };
}

function makeState(): RunState {
  return {
    schemaVersion: 1,
    runId: "run-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "running",
    branch: "main",
    planPath: "/tmp/PLAN.md",
    tasksPath: "/tmp/tasks.json",
    retryLimit: 1,
    runDir: "/tmp/ralph/run-1",
    logDir: "/tmp/ralph/run-1/logs",
    messageDir: "/tmp/ralph/run-1/messages",
    handoffPath: "/tmp/ralph/run-1/HANDOFF.md",
    phases: [{ id: "phase-1", name: "Phase 1", status: "pending" }],
    tasks: [
      {
        id: "task-001",
        phaseId: "phase-1",
        title: "Task 1",
        status: "pending",
        attempts: 0,
        changedFiles: [],
      },
      {
        id: "task-002",
        phaseId: "phase-1",
        title: "Task 2",
        status: "pending",
        attempts: 0,
        changedFiles: [],
      },
    ],
  };
}

function depsWith(
  overrides: Partial<RunExecutorDependencies>,
): RunExecutorDependencies {
  return {
    saveRunState: async () => {},
    executeTaskWithRetry: async () => ({ success: true, changedFiles: [] }),
    writeHandoff: async () => {},
    ...overrides,
  };
}

describe("executeRun", () => {
  it("blocks run and writes handoff on failed task", async () => {
    const document = makeDocument();
    const state = makeState();
    let handoffWrites = 0;

    const deps = depsWith({
      executeTaskWithRetry: async () => ({
        success: false,
        changedFiles: [],
        failureCategory: "quality_gate",
        failureDetails: "lint failed",
      }),
      writeHandoff: async () => {
        handoffWrites += 1;
      },
    });

    await executeRun(
      {
        rootDir: process.cwd(),
        state,
        statePath: "/tmp/state.json",
        document,
        options: makeOptions({}),
      },
      deps,
    );

    expect(state.status).toBe("blocked");
    expect(state.phases[0]?.status).toBe("blocked");
    expect(state.tasks[0]?.status).toBe("blocked");
    expect(handoffWrites).toBe(1);
  });

  it("marks run completed when all tasks pass", async () => {
    const document = makeDocument();
    const state = makeState();

    const deps = depsWith({
      executeTaskWithRetry: async (params) => {
        const taskState = params.state.tasks.find(
          (task) => task.id === params.task.id,
        );
        if (taskState) {
          taskState.status = "passed";
        }
        return { success: true, changedFiles: ["x.ts"] };
      },
    });

    await executeRun(
      {
        rootDir: process.cwd(),
        state,
        statePath: "/tmp/state.json",
        document,
        options: makeOptions({}),
      },
      deps,
    );

    expect(state.phases[0]?.status).toBe("completed");
    expect(state.status).toBe("completed");
  });

  it("stops after maxTasks limit", async () => {
    const document = makeDocument();
    const state = makeState();
    let calls = 0;

    const deps = depsWith({
      executeTaskWithRetry: async (params) => {
        calls += 1;
        const taskState = params.state.tasks.find(
          (task) => task.id === params.task.id,
        );
        if (taskState) {
          taskState.status = "passed";
        }
        return { success: true, changedFiles: ["x.ts"] };
      },
    });

    await executeRun(
      {
        rootDir: process.cwd(),
        state,
        statePath: "/tmp/state.json",
        document,
        options: makeOptions({ maxTasks: 1 }),
      },
      deps,
    );

    expect(calls).toBe(1);
    expect(state.status).toBe("running");
  });
});
