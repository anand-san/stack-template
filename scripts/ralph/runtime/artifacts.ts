import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { AgentName, AgentStepArtifacts } from "../agents/types";
import type {
  PlanPhase,
  PlanTask,
  RunState,
  TaskAttemptResult,
} from "../types";

export async function appendLog(
  logPath: string,
  title: string,
  body: string,
): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true });
  const content = [
    "",
    `### ${new Date().toISOString()} ${title}`,
    "",
    body.trimEnd(),
    "",
  ].join("\n");
  await appendFile(logPath, content, "utf8");
}

export function sanitizeForFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function buildStepArtifacts(params: {
  state: RunState;
  phaseId: string;
  taskId: string;
  attempt: number;
  stepSequence: number;
  agent: AgentName;
}): AgentStepArtifacts {
  const safePhase = sanitizeForFilename(params.phaseId);
  const safeTask = sanitizeForFilename(params.taskId);
  const safeAgent = sanitizeForFilename(params.agent);
  const safeStep = params.stepSequence.toString().padStart(2, "0");
  const base = `${safeTask}.attempt-${params.attempt}.step-${safeStep}.${safeAgent}`;

  return {
    logPath: join(params.state.logDir, safePhase, `${base}.log`),
    messagePath: join(params.state.messageDir, safePhase, `${base}.md`),
    commitMessagePath: join(
      params.state.messageDir,
      safePhase,
      `${base}.commit.json`,
    ),
  };
}

export async function writeHandoff(params: {
  state: RunState;
  phase: PlanPhase;
  task: PlanTask;
  failure: TaskAttemptResult;
}): Promise<void> {
  const safeTitle = params.task.title.replace(/\s+/g, " ").trim();
  const suggestedTaskId = `${params.task.id}-fix-1`;
  const lines = [
    "# Ralph Handoff",
    "",
    `Run ID: ${params.state.runId}`,
    `Branch: ${params.state.branch}`,
    `Phase: ${params.phase.id} - ${params.phase.name}`,
    `Blocked Task: ${params.task.id} - ${safeTitle}`,
    `Failure Category: ${params.failure.failureCategory ?? "unknown"}`,
    `Failure Details: ${params.failure.failureDetails ?? "No details captured"}`,
    "",
    "## Suggested Follow-up Task",
    "",
    `- id: ${suggestedTaskId}`,
    `- title: Fix ${params.task.id} and complete acceptance criteria`,
    `- description: Investigate failure logs, patch implementation for ${params.task.id}, rerun gates, then resume Ralph.`,
    "",
    "## Runtime Artifacts",
    "",
    `- State: ${params.state.runId}.state.json`,
    `- Logs root: ${params.state.logDir}`,
    `- Messages root: ${params.state.messageDir}`,
    "",
    "## Resume Command",
    "",
    `bun run ralph:resume -- --state ${resolve("docs/ralph/runs", `${params.state.runId}.state.json`)} --allow-dirty`,
    "",
  ];
  await writeFile(params.state.handoffPath, lines.join("\n"), "utf8");
}
