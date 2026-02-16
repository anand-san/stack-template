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

interface ConventionalCommitMessage {
  subject: string;
  body: string;
}

const conventionalSubjectPattern =
  /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\([a-z0-9._-]+\)!?: .+/i;

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

async function runCodexAttempt(params: {
  rootDir: string;
  prompt: string;
  logPath: string;
  messagePath: string;
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  printLogs: boolean;
}): Promise<ProcessResult> {
  const args = [
    "exec",
    "--full-auto",
    "-C",
    params.rootDir,
    "-o",
    params.messagePath,
  ];
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

  await appendLog(
    params.logPath,
    "Codex Exec",
    [
      `Command: codex ${args.join(" ")}`,
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

  return result;
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
  if (/task-\d+/i.test(subject) || /phase-\d+/i.test(subject) || /ralph/i.test(subject)) {
    throw new Error(
      `Commit subject contains forbidden token generated by codex: ${subject}`,
    );
  }

  return { subject, body };
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
  const diffStat = params.diffStat.trim().length > 0 ? params.diffStat : "(empty)";
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

async function runCodexCommitMessage(params: {
  rootDir: string;
  logPath: string;
  outputPath: string;
  task: PlanTask;
  changedFiles: string[];
  diffStat: string;
  diffPatch: string;
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  printLogs: boolean;
}): Promise<ConventionalCommitMessage> {
  const prompt = buildCommitMessagePrompt({
    task: params.task,
    changedFiles: params.changedFiles,
    diffStat: params.diffStat,
    diffPatch: params.diffPatch,
  });
  const args = [
    "exec",
    "--full-auto",
    "-C",
    params.rootDir,
    "-o",
    params.outputPath,
  ];
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
    stdin: prompt,
    streamOutput: params.printLogs,
  });

  let rawMessage = "";
  try {
    rawMessage = await readFile(params.outputPath, "utf8");
  } catch {
    rawMessage = result.stdout;
  }

  await appendLog(
    params.logPath,
    "Codex Commit Message",
    [
      `Command: codex ${args.join(" ")}`,
      "",
      "Codex Output:",
      rawMessage || "(empty)",
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
    throw new Error(`codex commit message generation failed (${result.exitCode})`);
  }

  return parseConventionalCommit(rawMessage);
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
    await saveRunState(params.statePath, params.state);

    const safePhase = sanitizeForFilename(params.phase.id);
    const safeTask = sanitizeForFilename(params.task.id);
    const logPath = join(
      params.state.logDir,
      safePhase,
      `${safeTask}.attempt-${nextAttempt}.log`,
    );
    const messagePath = join(
      params.state.messageDir,
      safePhase,
      `${safeTask}.attempt-${nextAttempt}.md`,
    );
    const commitMessagePath = join(
      params.state.messageDir,
      safePhase,
      `${safeTask}.commit-message.attempt-${nextAttempt}.json`,
    );

    const prompt = buildTaskPrompt({
      planPath: params.state.planPath,
      tasksPath: params.state.tasksPath,
      phase: params.phase,
      task: params.task,
      attempt: nextAttempt,
      maxAttempts,
      failureContext: lastFailure.length > 0 ? lastFailure : undefined,
    });

    const codexResult = await runCodexAttempt({
      rootDir: params.rootDir,
      prompt,
      logPath,
      messagePath,
      model: params.model,
      sandbox: params.sandbox,
      printLogs: params.printLogs,
    });

    taskState.lastLogPath = logPath;
    taskState.lastMessagePath = messagePath;
    taskState.lastCodexExitCode = codexResult.exitCode;
    await saveRunState(params.statePath, params.state);

    if (codexResult.exitCode !== 0) {
      taskState.status = "failed";
      taskState.lastError = `codex exec failed with code ${codexResult.exitCode}`;
      lastFailure = taskState.lastError;
      await saveRunState(params.statePath, params.state);
      continue;
    }

    const changedFiles = await listChangedFiles(params.rootDir);
    taskState.changedFiles = changedFiles;
    if (changedFiles.length === 0) {
      taskState.status = "failed";
      taskState.lastError =
        "No repository changes detected after codex attempt";
      lastFailure = taskState.lastError;
      await saveRunState(params.statePath, params.state);
      await appendLog(logPath, "Task Failure", taskState.lastError);
      continue;
    }

    if (!params.skipQualityGates) {
      const qualityGate = await runQualityGates({
        rootDir: params.rootDir,
        logPath,
        printLogs: params.printLogs,
      });
      if (!qualityGate.passed) {
        taskState.status = "failed";
        taskState.lastQualityGate = qualityGate.failedStep;
        taskState.lastError = qualityGate.details;
        lastFailure = `Quality gate failed at ${qualityGate.failedStep}: ${qualityGate.details}`;
        await saveRunState(params.statePath, params.state);
        continue;
      }
    }

    try {
      await stageAll(params.rootDir);
      const diffStat = await stagedDiffStat(params.rootDir);
      const diffPatch = truncateText(await stagedDiff(params.rootDir), 12000);
      const commitMessage = await runCodexCommitMessage({
        rootDir: params.rootDir,
        logPath,
        outputPath: commitMessagePath,
        task: params.task,
        changedFiles,
        diffStat,
        diffPatch,
        model: params.model,
        sandbox: params.sandbox,
        printLogs: params.printLogs,
      });
      await commitStaged(
        commitMessage.subject,
        commitMessage.body,
        params.rootDir,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      taskState.status = "failed";
      taskState.lastError = message;
      lastFailure = `git commit failed: ${message}`;
      await saveRunState(params.statePath, params.state);
      continue;
    }

    const commitHash = await headCommit(params.rootDir);
    taskState.status = "passed";
    taskState.lastCommit = commitHash;
    taskState.lastError = undefined;
    await saveRunState(params.statePath, params.state);
    return { success: true, commitHash, changedFiles };
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
