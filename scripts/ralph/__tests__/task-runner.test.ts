import { describe, expect, it } from "bun:test";
import {
  executeTaskWithRetry,
  type TaskRunnerDependencies,
} from "../orchestration/task-runner";
import type { PlanPhase, PlanTask, RunState } from "../types";

function makeTask(): PlanTask {
  return {
    id: "task-001",
    status: "todo",
    title: "Implement feature",
    description: "Do the thing",
    notes: [],
  };
}

function makePhase(task: PlanTask): PlanPhase {
  return {
    id: "phase-1",
    name: "Phase 1",
    goal: "Ship",
    exitCriteria: ["Done"],
    tasks: [task],
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
    runDir: `/tmp/ralph-tests-${process.pid}/run-1`,
    logDir: `/tmp/ralph-tests-${process.pid}/run-1/logs`,
    messageDir: `/tmp/ralph-tests-${process.pid}/run-1/messages`,
    handoffPath: `/tmp/ralph-tests-${process.pid}/run-1/HANDOFF.md`,
    phases: [{ id: "phase-1", name: "Phase 1", status: "pending" }],
    tasks: [
      {
        id: "task-001",
        phaseId: "phase-1",
        title: "Implement feature",
        status: "pending",
        attempts: 0,
        changedFiles: [],
      },
    ],
  };
}

function baseDeps(
  overrides: Partial<TaskRunnerDependencies>,
): TaskRunnerDependencies {
  return {
    runCodexExec: async () => ({
      result: { exitCode: 0, stdout: "", stderr: "" },
      output: "",
    }),
    runQualityGates: async () => ({ passed: true, details: "ok" }),
    saveRunState: async () => {},
    listChangedFiles: async () => ["server/index.ts"],
    stageAll: async () => {},
    stagedDiffStat: async () => "1 file changed",
    stagedDiff: async () => "diff --git",
    commitStaged: async () => {},
    headCommit: async () => "abc123",
    ...overrides,
  };
}

describe("executeTaskWithRetry", () => {
  it("succeeds with implementer -> verifier DONE", async () => {
    const task = makeTask();
    const phase = makePhase(task);
    const state = makeState();
    let commitSubject = "";

    const deps = baseDeps({
      runCodexExec: async (params) => {
        if (params.logTitle === "Codex Commit Message") {
          return {
            result: { exitCode: 0, stdout: "", stderr: "" },
            output: '{"subject":"feat(core): implement task","body":""}',
          };
        }
        if (params.logTitle === "Agent verifier") {
          return {
            result: { exitCode: 0, stdout: "", stderr: "" },
            output: '{"status":"DONE","notes":[]}',
          };
        }
        return {
          result: { exitCode: 0, stdout: "", stderr: "" },
          output: "ok",
        };
      },
      commitStaged: async (subject) => {
        commitSubject = subject;
      },
    });

    const result = await executeTaskWithRetry(
      {
        rootDir: process.cwd(),
        state,
        statePath: "/tmp/state.json",
        phase,
        task,
        retryLimit: 0,
        skipQualityGates: false,
        printLogs: false,
      },
      deps,
    );

    expect(result.success).toBe(true);
    expect(result.commitHash).toBe("abc123");
    expect(result.changedFiles).toEqual(["server/index.ts"]);
    expect(commitSubject).toBe("feat(core): implement task");
    expect(state.tasks[0]?.status).toBe("passed");
  });

  it("returns no_changes when mutating agent produces no file changes", async () => {
    const task = makeTask();
    const phase = makePhase(task);
    const state = makeState();

    const deps = baseDeps({
      listChangedFiles: async () => [],
    });

    const result = await executeTaskWithRetry(
      {
        rootDir: process.cwd(),
        state,
        statePath: "/tmp/state.json",
        phase,
        task,
        retryLimit: 0,
        skipQualityGates: true,
        printLogs: false,
      },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.failureCategory).toBe("no_changes");
    expect(result.failureDetails).toContain("No repository changes");
  });

  it("returns quality_gate when checks fail", async () => {
    const task = makeTask();
    const phase = makePhase(task);
    const state = makeState();

    const deps = baseDeps({
      runQualityGates: async () => ({
        passed: false,
        failedStep: "lint",
        details: "lint failed with exit code 1",
      }),
    });

    const result = await executeTaskWithRetry(
      {
        rootDir: process.cwd(),
        state,
        statePath: "/tmp/state.json",
        phase,
        task,
        retryLimit: 0,
        skipQualityGates: false,
        printLogs: false,
      },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.failureCategory).toBe("quality_gate");
    expect(result.failureDetails).toContain("lint failed");
  });

  it("passes failure context into second implementer attempt", async () => {
    const task = makeTask();
    const phase = makePhase(task);
    const state = makeState();
    const implementerPrompts: string[] = [];

    const deps = baseDeps({
      runCodexExec: async (params) => {
        if (params.logTitle.startsWith("Agent implementer")) {
          implementerPrompts.push(params.prompt);
        }
        return {
          result: { exitCode: 9, stdout: "", stderr: "" },
          output: "",
        };
      },
    });

    const result = await executeTaskWithRetry(
      {
        rootDir: process.cwd(),
        state,
        statePath: "/tmp/state.json",
        phase,
        task,
        retryLimit: 1,
        skipQualityGates: true,
        printLogs: false,
      },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.failureCategory).toBe("codex_error");
    expect(implementerPrompts.length).toBe(2);
    expect(implementerPrompts[1]).toContain(
      "codex implementer failed with code 9",
    );
  });
});
