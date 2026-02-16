import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { parseRunnerOptions } from "./config";
import {
  commitStaged,
  currentBranch,
  ensureCleanWorkingTree,
  ensureGitRepo,
  hasChanges,
  headCommit,
  listChangedFiles,
  stageAll,
  stagedDiff,
  stagedDiffStat,
} from "./git";
import { buildTaskPrompt } from "./prompt";
import {
  buildRunId,
  buildRunPaths,
  createInitialRunState,
  ensureRunDirectories,
  loadRunState,
  saveRunState,
} from "./state";
import type {
  PlanPhase,
  PlanTask,
  ProcessResult,
  RunState,
  TaskAttemptResult,
  TaskRuntimeState,
  TasksDocument,
} from "./types";
import { loadTasksDocument } from "./validate";

type AgentName = "implementer" | "verifier" | "refactor" | "bug_fixer";
type AgentMode = "mutating" | "read_only";
type VerifierStatus = "DONE" | "REFACTOR" | "ISSUES";

interface AgentSpec {
  name: AgentName;
  mode: AgentMode;
  buildPrompt: (input: AgentPromptInput) => string;
}

interface AgentPromptInput {
  planPath: string;
  tasksPath: string;
  phase: PlanPhase;
  task: PlanTask;
  attempt: number;
  maxAttempts: number;
  verifierCycle: number;
  maxVerifierCycles: number;
  notes: string[];
  failureContext?: string;
}

interface AgentStepArtifacts {
  logPath: string;
  messagePath: string;
  commitMessagePath: string;
}

interface ConventionalCommitMessage {
  subject: string;
  body: string;
}

interface VerifierDecision {
  status: VerifierStatus;
  notes: string[];
}

interface StepFailure {
  category: TaskAttemptResult["failureCategory"];
  details: string;
}

interface MutatingStepSuccess {
  commitHash: string;
  changedFiles: string[];
}

const MAX_VERIFIER_CYCLES = 5;

const conventionalSubjectPattern =
  /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\([a-z0-9._-]+\)!?: .+/i;

const AGENTS: Record<AgentName, AgentSpec> = {
  implementer: {
    name: "implementer",
    mode: "mutating",
    buildPrompt: (input) =>
      buildTaskPrompt({
        planPath: input.planPath,
        tasksPath: input.tasksPath,
        phase: input.phase,
        task: input.task,
        attempt: input.attempt,
        maxAttempts: input.maxAttempts,
        failureContext:
          input.failureContext && input.failureContext.length > 0
            ? input.failureContext
            : undefined,
      }),
  },
  verifier: {
    name: "verifier",
    mode: "read_only",
    buildPrompt: (input) => {
      const notesBlock =
        input.notes.length > 0
          ? input.notes.map((note) => `- ${note}`).join("\n")
          : "- (none)";
      return [
        "You are a verifier agent.",
        `Read ${input.planPath} and ${input.tasksPath} before reviewing.`,
        "Validate correctness, architecture fit, and production readiness for this task only.",
        "Focus on functional correctness, regressions, edge cases, and scope alignment.",
        "Return strict JSON only.",
        "Required JSON shape:",
        '{"status":"DONE|REFACTOR|ISSUES","notes":["..."]}',
        "Rules:",
        "- DONE: task is complete and safe to proceed.",
        "- REFACTOR: implementation works but should be improved; include exact refactor notes.",
        "- ISSUES: there are bugs or defects; include exact fix notes.",
        "- notes must be concrete and actionable.",
        "",
        `Phase: ${input.phase.id} - ${input.phase.name}`,
        `Phase goal: ${input.phase.goal}`,
        `Task ID: ${input.task.id}`,
        `Task title: ${input.task.title}`,
        `Task description: ${input.task.description}`,
        `Task notes: ${input.task.notes.length > 0 ? input.task.notes.join(" | ") : "None"}`,
        `Task attempt: ${input.attempt}/${input.maxAttempts}`,
        `Verifier cycle: ${input.verifierCycle}/${input.maxVerifierCycles}`,
        "",
        "Verifier notes from previous cycle:",
        notesBlock,
      ].join("\n");
    },
  },
  refactor: {
    name: "refactor",
    mode: "mutating",
    buildPrompt: (input) => {
      const notesBlock =
        input.notes.length > 0
          ? input.notes.map((note) => `- ${note}`).join("\n")
          : "- (none)";
      return [
        "You are a refactor agent.",
        `Read ${input.planPath} and ${input.tasksPath} before making changes.`,
        "Refactor only this task according to verifier notes.",
        "Do not expand scope to other tasks.",
        "",
        `Phase: ${input.phase.id} - ${input.phase.name}`,
        `Phase goal: ${input.phase.goal}`,
        `Task ID: ${input.task.id}`,
        `Task title: ${input.task.title}`,
        `Task description: ${input.task.description}`,
        `Task notes: ${input.task.notes.length > 0 ? input.task.notes.join(" | ") : "None"}`,
        `Task attempt: ${input.attempt}/${input.maxAttempts}`,
        `Verifier cycle: ${input.verifierCycle}/${input.maxVerifierCycles}`,
        "",
        "Refactor notes from verifier:",
        notesBlock,
        "",
        "Required behavior:",
        "- Apply exactly the requested refactors.",
        "- Keep behavior correct and production-ready.",
        "- Run relevant validations before finishing.",
      ].join("\n");
    },
  },
  bug_fixer: {
    name: "bug_fixer",
    mode: "mutating",
    buildPrompt: (input) => {
      const notesBlock =
        input.notes.length > 0
          ? input.notes.map((note) => `- ${note}`).join("\n")
          : "- (none)";
      return [
        "You are a bug-fixer agent.",
        `Read ${input.planPath} and ${input.tasksPath} before making changes.`,
        "Fix only the issues reported by verifier for this task.",
        "Do not expand scope to other tasks.",
        "",
        `Phase: ${input.phase.id} - ${input.phase.name}`,
        `Phase goal: ${input.phase.goal}`,
        `Task ID: ${input.task.id}`,
        `Task title: ${input.task.title}`,
        `Task description: ${input.task.description}`,
        `Task notes: ${input.task.notes.length > 0 ? input.task.notes.join(" | ") : "None"}`,
        `Task attempt: ${input.attempt}/${input.maxAttempts}`,
        `Verifier cycle: ${input.verifierCycle}/${input.maxVerifierCycles}`,
        "",
        "Issue notes from verifier:",
        notesBlock,
        "",
        "Required behavior:",
        "- Fix the listed defects directly.",
        "- Keep changes minimal and safe.",
        "- Run relevant validations before finishing.",
      ].join("\n");
    },
  },
};

function getTaskState(
  state: RunState,
  phaseId: string,
  taskId: string,
): TaskRuntimeState {
  const found = state.tasks.find(
    (task) => task.id === taskId && task.phaseId === phaseId,
  );
  if (!found) {
    throw new Error(`Task runtime state not found for ${phaseId}/${taskId}`);
  }
  return found;
}

function getPhaseState(
  state: RunState,
  phaseId: string,
): RunState["phases"][number] {
  const found = state.phases.find((phase) => phase.id === phaseId);
  if (!found) {
    throw new Error(`Phase runtime state not found for ${phaseId}`);
  }
  return found;
}

async function runProcess(params: {
  cmd: string[];
  cwd: string;
  stdin?: string;
  streamOutput?: boolean;
}): Promise<ProcessResult> {
  const proc = Bun.spawn(params.cmd, {
    cwd: params.cwd,
    stdin: params.stdin !== undefined ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (params.stdin !== undefined && proc.stdin) {
    proc.stdin.write(params.stdin);
    proc.stdin.end();
  }

  const readStream = async (
    stream: ReadableStream<Uint8Array> | null,
    writer?: (chunk: string) => void,
  ): Promise<string> => {
    if (!stream) {
      return "";
    }
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      const text = decoder.decode(chunk.value, { stream: true });
      buffer += text;
      if (writer) {
        writer(text);
      }
    }
    const tail = decoder.decode();
    if (tail.length > 0) {
      buffer += tail;
      if (writer) {
        writer(tail);
      }
    }
    return buffer;
  };

  const writeStdout = params.streamOutput
    ? (chunk: string) => process.stdout.write(chunk)
    : undefined;
  const writeStderr = params.streamOutput
    ? (chunk: string) => process.stderr.write(chunk)
    : undefined;

  const [stdout, stderr, exitCode] = await Promise.all([
    readStream(proc.stdout, writeStdout),
    readStream(proc.stderr, writeStderr),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}

async function appendLog(
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

function truncateText(input: string, maxChars: number): string {
  if (input.length <= maxChars) {
    return input;
  }
  return `${input.slice(0, maxChars)}\n\n[truncated]`;
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n");
    if (lines.length >= 3) {
      return lines.slice(1, -1).join("\n").trim();
    }
  }
  return trimmed;
}

function parseConventionalCommit(raw: string): ConventionalCommitMessage {
  const candidate = extractJsonPayload(raw);
  const parsed = JSON.parse(candidate) as {
    subject?: unknown;
    body?: unknown;
  };
  const subject =
    typeof parsed.subject === "string" ? parsed.subject.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";

  if (!conventionalSubjectPattern.test(subject)) {
    throw new Error(
      `Invalid conventional commit subject generated by codex: ${subject}`,
    );
  }
  if (
    /task-\d+/i.test(subject) ||
    /phase-\d+/i.test(subject) ||
    /ralph/i.test(subject)
  ) {
    throw new Error(
      `Commit subject contains forbidden token generated by codex: ${subject}`,
    );
  }

  return { subject, body };
}

function parseVerifierDecision(raw: string): VerifierDecision {
  const candidate = extractJsonPayload(raw);
  const parsed = JSON.parse(candidate) as {
    status?: unknown;
    notes?: unknown;
  };

  const rawStatus =
    typeof parsed.status === "string" ? parsed.status.trim().toUpperCase() : "";

  if (rawStatus !== "DONE" && rawStatus !== "REFACTOR" && rawStatus !== "ISSUES") {
    throw new Error(`Invalid verifier status: ${rawStatus}`);
  }

  let notes: string[] = [];
  if (Array.isArray(parsed.notes)) {
    notes = parsed.notes
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  } else if (typeof parsed.notes === "string" && parsed.notes.trim().length > 0) {
    notes = [parsed.notes.trim()];
  }

  if ((rawStatus === "REFACTOR" || rawStatus === "ISSUES") && notes.length === 0) {
    throw new Error(`Verifier ${rawStatus} requires notes.`);
  }

  return {
    status: rawStatus,
    notes,
  };
}

function buildCommitMessagePrompt(params: {
  task: PlanTask;
  changedFiles: string[];
  diffStat: string;
  diffPatch: string;
}): string {
  const files =
    params.changedFiles.length > 0
      ? params.changedFiles.map((file) => `- ${file}`).join("\n")
      : "- (none)";
  const diffStat =
    params.diffStat.trim().length > 0 ? params.diffStat : "(empty)";
  const diffPatch =
    params.diffPatch.trim().length > 0 ? params.diffPatch : "(empty)";

  return [
    "Generate a conventional commit message as strict JSON.",
    "Output JSON only. No markdown, no explanation.",
    "",
    "Required JSON shape:",
    '{"subject":"type(scope): summary","body":"optional body"}',
    "",
    "Rules:",
    "- subject must follow Conventional Commits format",
    "- subject must not include task IDs, phase IDs, or the word ralph",
    "- body should concisely describe what changed and why",
    "- body can be empty string when unnecessary",
    "",
    `Task title: ${params.task.title}`,
    "",
    "Changed files:",
    files,
    "",
    "Diff stat:",
    diffStat,
    "",
    "Patch excerpt:",
    diffPatch,
  ].join("\n");
}

async function readOutputFileOrFallback(
  outputPath: string,
  fallback: string,
): Promise<string> {
  try {
    return await readFile(outputPath, "utf8");
  } catch {
    return fallback;
  }
}

async function runCodexExec(params: {
  rootDir: string;
  prompt: string;
  logPath: string;
  outputPath: string;
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  printLogs: boolean;
  logTitle: string;
}): Promise<{ result: ProcessResult; output: string }> {
  const args = ["exec", "--full-auto", "-C", params.rootDir, "-o", params.outputPath];
  if (params.model) {
    args.push("-m", params.model);
  }
  if (params.sandbox) {
    args.push("-s", params.sandbox);
  }
  args.push("-");

  const result = await runProcess({
    cmd: ["codex", ...args],
    cwd: params.rootDir,
    stdin: params.prompt,
    streamOutput: params.printLogs,
  });

  const output = await readOutputFileOrFallback(params.outputPath, result.stdout);

  await appendLog(
    params.logPath,
    params.logTitle,
    [
      `Command: codex ${args.join(" ")}`,
      "",
      "OUTPUT:",
      output || "(empty)",
      "",
      "STDOUT:",
      result.stdout || "(empty)",
      "",
      "STDERR:",
      result.stderr || "(empty)",
      "",
      `Exit Code: ${result.exitCode}`,
    ].join("\n"),
  );

  return { result, output };
}

async function runQualityGates(params: {
  rootDir: string;
  logPath: string;
  printLogs: boolean;
}): Promise<{ passed: boolean; failedStep?: string; details: string }> {
  const steps: Array<{ name: string; cmd: string[]; cwd: string }> = [
    { name: "format", cmd: ["bun", "run", "format"], cwd: params.rootDir },
    { name: "lint", cmd: ["bun", "run", "lint"], cwd: params.rootDir },
    {
      name: "frontend-check-types",
      cmd: ["bun", "run", "check-types"],
      cwd: join(params.rootDir, "frontend"),
    },
    {
      name: "server-check-types",
      cmd: ["bun", "run", "check-types"],
      cwd: join(params.rootDir, "server"),
    },
    { name: "test", cmd: ["bun", "run", "test"], cwd: params.rootDir },
  ];

  for (const step of steps) {
    const result = await runProcess({
      cmd: step.cmd,
      cwd: step.cwd,
      streamOutput: params.printLogs,
    });

    await appendLog(
      params.logPath,
      `Quality Gate: ${step.name}`,
      [
        `CWD: ${step.cwd}`,
        `Command: ${step.cmd.join(" ")}`,
        "",
        "STDOUT:",
        result.stdout || "(empty)",
        "",
        "STDERR:",
        result.stderr || "(empty)",
        "",
        `Exit Code: ${result.exitCode}`,
      ].join("\n"),
    );

    if (result.exitCode !== 0) {
      return {
        passed: false,
        failedStep: step.name,
        details: `${step.name} failed with exit code ${result.exitCode}`,
      };
    }
  }

  return { passed: true, details: "all checks passed" };
}

function sanitizeForFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function buildStepArtifacts(params: {
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
    commitMessagePath: join(params.state.messageDir, safePhase, `${base}.commit.json`),
  };
}

function buildAgentPrompt(
  agent: AgentName,
  input: AgentPromptInput,
): string {
  return AGENTS[agent].buildPrompt(input);
}

async function generateAndCommitMessage(params: {
  rootDir: string;
  logPath: string;
  outputPath: string;
  task: PlanTask;
  changedFiles: string[];
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  printLogs: boolean;
}): Promise<string> {
  await stageAll(params.rootDir);
  const diffStat = await stagedDiffStat(params.rootDir);
  const diffPatch = truncateText(await stagedDiff(params.rootDir), 12000);

  const commitPrompt = buildCommitMessagePrompt({
    task: params.task,
    changedFiles: params.changedFiles,
    diffStat,
    diffPatch,
  });

  const commitResponse = await runCodexExec({
    rootDir: params.rootDir,
    prompt: commitPrompt,
    logPath: params.logPath,
    outputPath: params.outputPath,
    model: params.model,
    sandbox: params.sandbox,
    printLogs: params.printLogs,
    logTitle: "Codex Commit Message",
  });

  if (commitResponse.result.exitCode !== 0) {
    throw new Error(
      `codex commit message generation failed (${commitResponse.result.exitCode})`,
    );
  }

  const commitMessage = parseConventionalCommit(commitResponse.output);
  await commitStaged(commitMessage.subject, commitMessage.body, params.rootDir);
  return headCommit(params.rootDir);
}

async function executeMutatingAgentStep(params: {
  rootDir: string;
  state: RunState;
  statePath: string;
  phase: PlanPhase;
  task: PlanTask;
  attempt: number;
  maxAttempts: number;
  verifierCycle: number;
  notes: string[];
  failureContext?: string;
  agent: Extract<AgentName, "implementer" | "refactor" | "bug_fixer">;
  artifacts: AgentStepArtifacts;
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  skipQualityGates: boolean;
  printLogs: boolean;
}): Promise<{ ok: true; value: MutatingStepSuccess } | { ok: false; error: StepFailure }> {
  const prompt = buildAgentPrompt(params.agent, {
    planPath: params.state.planPath,
    tasksPath: params.state.tasksPath,
    phase: params.phase,
    task: params.task,
    attempt: params.attempt,
    maxAttempts: params.maxAttempts,
    verifierCycle: params.verifierCycle,
    maxVerifierCycles: MAX_VERIFIER_CYCLES,
    notes: params.notes,
    failureContext: params.failureContext,
  });

  const response = await runCodexExec({
    rootDir: params.rootDir,
    prompt,
    logPath: params.artifacts.logPath,
    outputPath: params.artifacts.messagePath,
    model: params.model,
    sandbox: params.sandbox,
    printLogs: params.printLogs,
    logTitle: `Agent ${params.agent}`,
  });

  const taskState = getTaskState(params.state, params.phase.id, params.task.id);
  taskState.lastLogPath = params.artifacts.logPath;
  taskState.lastMessagePath = params.artifacts.messagePath;
  taskState.lastCodexExitCode = response.result.exitCode;
  await saveRunState(params.statePath, params.state);

  if (response.result.exitCode !== 0) {
    return {
      ok: false,
      error: {
        category: "codex_error",
        details: `codex ${params.agent} failed with code ${response.result.exitCode}`,
      },
    };
  }

  const changedFiles = await listChangedFiles(params.rootDir);
  if (changedFiles.length === 0) {
    await appendLog(
      params.artifacts.logPath,
      "Task Failure",
      "No repository changes detected after agent step",
    );
    return {
      ok: false,
      error: {
        category: "no_changes",
        details: `No repository changes detected after ${params.agent}`,
      },
    };
  }

  if (!params.skipQualityGates) {
    const qualityGate = await runQualityGates({
      rootDir: params.rootDir,
      logPath: params.artifacts.logPath,
      printLogs: params.printLogs,
    });

    if (!qualityGate.passed) {
      return {
        ok: false,
        error: {
          category: "quality_gate",
          details: qualityGate.details,
        },
      };
    }
  }

  try {
    const commitHash = await generateAndCommitMessage({
      rootDir: params.rootDir,
      logPath: params.artifacts.logPath,
      outputPath: params.artifacts.commitMessagePath,
      task: params.task,
      changedFiles,
      model: params.model,
      sandbox: params.sandbox,
      printLogs: params.printLogs,
    });

    return {
      ok: true,
      value: {
        commitHash,
        changedFiles,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        category: "git_conflict",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function executeVerifierStep(params: {
  rootDir: string;
  state: RunState;
  statePath: string;
  phase: PlanPhase;
  task: PlanTask;
  attempt: number;
  maxAttempts: number;
  verifierCycle: number;
  notes: string[];
  artifacts: AgentStepArtifacts;
  model?: string;
  printLogs: boolean;
}): Promise<{ ok: true; value: VerifierDecision } | { ok: false; error: StepFailure }> {
  const prompt = buildAgentPrompt("verifier", {
    planPath: params.state.planPath,
    tasksPath: params.state.tasksPath,
    phase: params.phase,
    task: params.task,
    attempt: params.attempt,
    maxAttempts: params.maxAttempts,
    verifierCycle: params.verifierCycle,
    maxVerifierCycles: MAX_VERIFIER_CYCLES,
    notes: params.notes,
  });

  const response = await runCodexExec({
    rootDir: params.rootDir,
    prompt,
    logPath: params.artifacts.logPath,
    outputPath: params.artifacts.messagePath,
    model: params.model,
    sandbox: "read-only",
    printLogs: params.printLogs,
    logTitle: "Agent verifier",
  });

  const taskState = getTaskState(params.state, params.phase.id, params.task.id);
  taskState.lastLogPath = params.artifacts.logPath;
  taskState.lastMessagePath = params.artifacts.messagePath;
  taskState.lastCodexExitCode = response.result.exitCode;
  await saveRunState(params.statePath, params.state);

  if (response.result.exitCode !== 0) {
    return {
      ok: false,
      error: {
        category: "codex_error",
        details: `codex verifier failed with code ${response.result.exitCode}`,
      },
    };
  }

  try {
    const decision = parseVerifierDecision(response.output);
    return { ok: true, value: decision };
  } catch (error) {
    return {
      ok: false,
      error: {
        category: "codex_error",
        details:
          error instanceof Error
            ? `invalid verifier response: ${error.message}`
            : `invalid verifier response: ${String(error)}`,
      },
    };
  }
}

async function executeTaskWithRetry(params: {
  rootDir: string;
  state: RunState;
  statePath: string;
  phase: PlanPhase;
  task: PlanTask;
  retryLimit: number;
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  skipQualityGates: boolean;
  printLogs: boolean;
}): Promise<TaskAttemptResult> {
  const taskState = getTaskState(params.state, params.phase.id, params.task.id);
  const maxAttempts = params.retryLimit + 1;
  let lastFailure = "";

  for (
    let nextAttempt = taskState.attempts + 1;
    nextAttempt <= maxAttempts;
    nextAttempt += 1
  ) {
    taskState.status = "running";
    taskState.attempts = nextAttempt;
    taskState.lastError = undefined;
    taskState.lastQualityGate = undefined;
    taskState.changedFiles = [];
    await saveRunState(params.statePath, params.state);

    let stepSequence = 0;
    let verifierCycle = 0;
    let notesFromVerifier: string[] = [];
    let nextAgent: AgentName = "implementer";
    let latestCommitHash: string | undefined;
    const changedFilesSet = new Set<string>();
    let stepFailure: StepFailure | undefined;

    while (true) {
      if (nextAgent === "verifier") {
        verifierCycle += 1;
        if (verifierCycle > MAX_VERIFIER_CYCLES) {
          stepFailure = {
            category: "codex_error",
            details: `Verifier exceeded max cycles (${MAX_VERIFIER_CYCLES})`,
          };
          break;
        }

        stepSequence += 1;
        const artifacts = buildStepArtifacts({
          state: params.state,
          phaseId: params.phase.id,
          taskId: params.task.id,
          attempt: nextAttempt,
          stepSequence,
          agent: "verifier",
        });

        const verifierResult = await executeVerifierStep({
          rootDir: params.rootDir,
          state: params.state,
          statePath: params.statePath,
          phase: params.phase,
          task: params.task,
          attempt: nextAttempt,
          maxAttempts,
          verifierCycle,
          notes: notesFromVerifier,
          artifacts,
          model: params.model,
          printLogs: params.printLogs,
        });

        if (!verifierResult.ok) {
          stepFailure = verifierResult.error;
          break;
        }

        if (verifierResult.value.status === "DONE") {
          taskState.status = "passed";
          taskState.lastCommit = latestCommitHash;
          taskState.lastError = undefined;
          taskState.changedFiles = [...changedFilesSet];
          await saveRunState(params.statePath, params.state);
          return {
            success: true,
            commitHash: latestCommitHash,
            changedFiles: [...changedFilesSet],
          };
        }

        notesFromVerifier = verifierResult.value.notes;
        nextAgent =
          verifierResult.value.status === "REFACTOR" ? "refactor" : "bug_fixer";
        continue;
      }

      stepSequence += 1;
      const artifacts = buildStepArtifacts({
        state: params.state,
        phaseId: params.phase.id,
        taskId: params.task.id,
        attempt: nextAttempt,
        stepSequence,
        agent: nextAgent,
      });

      const mutatingResult = await executeMutatingAgentStep({
        rootDir: params.rootDir,
        state: params.state,
        statePath: params.statePath,
        phase: params.phase,
        task: params.task,
        attempt: nextAttempt,
        maxAttempts,
        verifierCycle,
        notes: notesFromVerifier,
        failureContext: nextAgent === "implementer" ? lastFailure : undefined,
        agent: nextAgent,
        artifacts,
        model: params.model,
        sandbox: params.sandbox,
        skipQualityGates: params.skipQualityGates,
        printLogs: params.printLogs,
      });

      if (!mutatingResult.ok) {
        stepFailure = mutatingResult.error;
        break;
      }

      latestCommitHash = mutatingResult.value.commitHash;
      for (const file of mutatingResult.value.changedFiles) {
        changedFilesSet.add(file);
      }
      notesFromVerifier = [];
      nextAgent = "verifier";
    }

    if (!stepFailure) {
      stepFailure = {
        category: "codex_error",
        details: "Task step failed with unknown state",
      };
    }

    taskState.status = "failed";
    taskState.lastError = stepFailure.details;
    if (stepFailure.category === "quality_gate") {
      taskState.lastQualityGate = "quality_gate";
    }
    taskState.changedFiles = [...changedFilesSet];
    await saveRunState(params.statePath, params.state);
    lastFailure = stepFailure.details;
  }

  return {
    success: false,
    changedFiles: taskState.changedFiles,
    failureCategory: taskState.lastQualityGate
      ? "quality_gate"
      : taskState.lastCodexExitCode && taskState.lastCodexExitCode !== 0
        ? "codex_error"
        : taskState.lastError?.includes("No repository changes")
          ? "no_changes"
          : "git_conflict",
    failureDetails: taskState.lastError,
  };
}

async function writeHandoff(params: {
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

function printDryRun(
  document: TasksDocument,
  maxPhases?: number,
  maxTasks?: number,
): void {
  let phaseCount = 0;
  let taskCount = 0;
  for (const phase of document.phases) {
    if (maxPhases !== undefined && phaseCount >= maxPhases) {
      break;
    }
    phaseCount += 1;
    console.log(`${phase.id} | ${phase.name}`);
    for (const task of phase.tasks) {
      if (maxTasks !== undefined && taskCount >= maxTasks) {
        return;
      }
      taskCount += 1;
      console.log(`  - ${task.id} [${task.status}] ${task.title}`);
    }
  }
}

async function executeRun(params: {
  rootDir: string;
  state: RunState;
  statePath: string;
  document: TasksDocument;
  options: ReturnType<typeof parseRunnerOptions>;
}): Promise<void> {
  let phasesVisited = 0;
  let tasksVisited = 0;

  for (const phase of params.document.phases) {
    const phaseState = getPhaseState(params.state, phase.id);
    if (phaseState.status === "completed") {
      continue;
    }
    if (
      params.options.maxPhases !== undefined &&
      phasesVisited >= params.options.maxPhases
    ) {
      break;
    }
    phasesVisited += 1;
    phaseState.status = "in_progress";
    await saveRunState(params.statePath, params.state);

    for (const task of phase.tasks) {
      const taskState = getTaskState(params.state, phase.id, task.id);
      if (taskState.status === "passed") {
        continue;
      }
      if (
        params.options.maxTasks !== undefined &&
        tasksVisited >= params.options.maxTasks
      ) {
        await saveRunState(params.statePath, params.state);
        return;
      }
      tasksVisited += 1;

      const attempt = await executeTaskWithRetry({
        rootDir: params.rootDir,
        state: params.state,
        statePath: params.statePath,
        phase,
        task,
        retryLimit: params.state.retryLimit,
        model: params.options.model,
        sandbox: params.options.sandbox,
        skipQualityGates: params.options.skipQualityGates,
        printLogs: params.options.printLogs,
      });

      if (!attempt.success) {
        taskState.status = "blocked";
        phaseState.status = "blocked";
        params.state.status = "blocked";
        await writeHandoff({
          state: params.state,
          phase,
          task,
          failure: attempt,
        });
        await saveRunState(params.statePath, params.state);
        return;
      }
    }

    const allPassed = phase.tasks.every((task) => {
      const taskState = getTaskState(params.state, phase.id, task.id);
      return taskState.status === "passed";
    });
    if (allPassed) {
      phaseState.status = "completed";
    }
    await saveRunState(params.statePath, params.state);
  }

  const finished = params.state.phases.every(
    (phase) => phase.status === "completed",
  );
  if (finished) {
    params.state.status = "completed";
    await saveRunState(params.statePath, params.state);
  }
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const options = parseRunnerOptions(Bun.argv.slice(2));

  await ensureGitRepo(rootDir);
  let state: RunState;
  let statePath: string;
  let document: TasksDocument;

  if (options.command === "start") {
    document = await loadTasksDocument(options.tasksPath);
    if (options.dryRun) {
      printDryRun(document, options.maxPhases, options.maxTasks);
      return;
    }
  } else {
    statePath = options.statePath as string;
    state = await loadRunState(statePath);
    document = await loadTasksDocument(state.tasksPath);
    if (options.dryRun) {
      printDryRun(document, options.maxPhases, options.maxTasks);
      return;
    }
  }

  if (!options.allowDirty) {
    await ensureCleanWorkingTree(rootDir);
  }

  if (options.command === "start") {
    const runId = buildRunId();
    const branch = await currentBranch(rootDir);
    if (branch !== "main") {
      throw new Error(
        `Ralph start must run on main. Current branch is ${branch}.`,
      );
    }
    const paths = buildRunPaths(runId);

    state = createInitialRunState({
      runId,
      branch,
      planPath: options.planPath,
      tasksPath: options.tasksPath,
      retryLimit: options.retry,
      paths: {
        runDir: paths.runDir,
        logDir: paths.logDir,
        messageDir: paths.messageDir,
        handoffPath: paths.handoffPath,
      },
      tasksDocument: document,
    });
    statePath = paths.statePath;
    await ensureRunDirectories(state);
    await saveRunState(statePath, state);
  } else {
    statePath = options.statePath as string;
    state = await loadRunState(statePath);
    await ensureRunDirectories(state);
    const branch = await currentBranch(rootDir);
    if (branch !== state.branch) {
      throw new Error(
        `Resume must run on ${state.branch}. Current branch is ${branch}.`,
      );
    }
  }

  await executeRun({
    rootDir,
    state,
    statePath,
    document,
    options,
  });

  const dirty = await hasChanges(rootDir);
  if (state.status !== "blocked" && dirty) {
    throw new Error(
      "Run ended with uncommitted changes. Inspect working tree and logs before continuing.",
    );
  }

  const statusLine = `Ralph run ${state.runId} finished with status: ${state.status}`;
  console.log(statusLine);
  console.log(`State file: ${basename(statePath)}`);
  if (state.status === "blocked") {
    console.log(`Handoff file: ${state.handoffPath}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
