import { describe, expect, it } from "bun:test";
import { buildStepArtifacts, sanitizeForFilename } from "../runtime/artifacts";
import type { RunState } from "../types";

const baseState: RunState = {
  schemaVersion: 1,
  runId: "run-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  status: "running",
  branch: "main",
  planPath: "/plan.md",
  tasksPath: "/tasks.json",
  retryLimit: 1,
  runDir: "/tmp/ralph/run-1",
  logDir: "/tmp/ralph/run-1/logs",
  messageDir: "/tmp/ralph/run-1/messages",
  handoffPath: "/tmp/ralph/run-1/HANDOFF.md",
  phases: [],
  tasks: [],
};

describe("runtime/artifacts", () => {
  it("sanitizes filenames", () => {
    expect(sanitizeForFilename("phase 1/task@id")).toBe("phase-1-task-id");
  });

  it("builds deterministic artifact paths", () => {
    const artifacts = buildStepArtifacts({
      state: baseState,
      phaseId: "phase 1",
      taskId: "task/001",
      attempt: 2,
      stepSequence: 3,
      agent: "implementer",
    });

    expect(artifacts.logPath).toBe(
      "/tmp/ralph/run-1/logs/phase-1/task-001.attempt-2.step-03.implementer.log",
    );
    expect(artifacts.messagePath).toBe(
      "/tmp/ralph/run-1/messages/phase-1/task-001.attempt-2.step-03.implementer.md",
    );
    expect(artifacts.commitMessagePath).toBe(
      "/tmp/ralph/run-1/messages/phase-1/task-001.attempt-2.step-03.implementer.commit.json",
    );
  });
});
