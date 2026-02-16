import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { RunState, TasksDocument } from "./types";

function isoNow(): string {
  return new Date().toISOString();
}

function makeTimestampId(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const hh = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const sec = now.getSeconds().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

export function buildRunId(): string {
  return makeTimestampId();
}

export function buildRunPaths(runId: string): {
  statePath: string;
  runDir: string;
  logDir: string;
  messageDir: string;
  handoffPath: string;
} {
  const runDir = resolve("docs/ralph/runs", runId);
  return {
    statePath: resolve("docs/ralph/runs", `${runId}.state.json`),
    runDir,
    logDir: join(runDir, "logs"),
    messageDir: join(runDir, "messages"),
    handoffPath: join(runDir, "HANDOFF.md"),
  };
}

export async function ensureRunDirectories(state: RunState): Promise<void> {
  await mkdir(state.runDir, { recursive: true });
  await mkdir(state.logDir, { recursive: true });
  await mkdir(state.messageDir, { recursive: true });
  await mkdir(dirname(state.handoffPath), { recursive: true });
}

export function createInitialRunState(params: {
  runId: string;
  branch: string;
  planPath: string;
  tasksPath: string;
  retryLimit: number;
  paths: {
    runDir: string;
    logDir: string;
    messageDir: string;
    handoffPath: string;
  };
  tasksDocument: TasksDocument;
}): RunState {
  const phases: RunState["phases"] = params.tasksDocument.phases.map(
    (phase) => {
      const status: RunState["phases"][number]["status"] = phase.tasks.every(
        (task) => task.status === "done",
      )
        ? "completed"
        : "pending";
      return {
        id: phase.id,
        name: phase.name,
        status,
      };
    },
  );

  const tasks: RunState["tasks"] = params.tasksDocument.phases.flatMap(
    (phase) =>
      phase.tasks.map((task) => {
        const status: RunState["tasks"][number]["status"] =
          task.status === "done" ? "passed" : "pending";
        return {
          id: task.id,
          phaseId: phase.id,
          title: task.title,
          status,
          attempts: 0,
          changedFiles: [],
        };
      }),
  );

  const now = isoNow();
  return {
    schemaVersion: 1,
    runId: params.runId,
    createdAt: now,
    updatedAt: now,
    status: "running",
    branch: params.branch,
    planPath: params.planPath,
    tasksPath: params.tasksPath,
    retryLimit: params.retryLimit,
    runDir: params.paths.runDir,
    logDir: params.paths.logDir,
    messageDir: params.paths.messageDir,
    handoffPath: params.paths.handoffPath,
    phases,
    tasks,
  };
}

export async function saveRunState(
  path: string,
  state: RunState,
): Promise<void> {
  state.updatedAt = isoNow();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function loadRunState(path: string): Promise<RunState> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as RunState;
  if (parsed.schemaVersion !== 1) {
    throw new Error(
      `Unsupported state schema version: ${parsed.schemaVersion}`,
    );
  }
  return parsed;
}
