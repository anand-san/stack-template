import {
  buildCommitMessagePrompt,
  parseConventionalCommit,
  parseVerifierDecision,
  truncateText,
} from "../agents/parsers";
import { buildAgentPrompt, MAX_VERIFIER_CYCLES } from "../agents/prompts";
import type {
  AgentName,
  AgentStepArtifacts,
  MutatingStepSuccess,
  StepFailure,
  VerifierDecision,
} from "../agents/types";
import {
  commitStaged,
  headCommit,
  listChangedFiles,
  stageAll,
  stagedDiff,
  stagedDiffStat,
} from "../git";
import { saveRunState } from "../state";
import type {
  PlanPhase,
  PlanTask,
  RunState,
  TaskAttemptResult,
} from "../types";
import { getTaskState } from "./state-selectors";
import { buildStepArtifacts } from "../runtime/artifacts";
import { runCodexExec } from "../runtime/codex";
import { runQualityGates } from "../runtime/quality-gates";
import { appendLog } from "../runtime/artifacts";

interface GenerateCommitParams {
  rootDir: string;
  logPath: string;
  outputPath: string;
  task: PlanTask;
  changedFiles: string[];
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  printLogs: boolean;
}

export interface TaskRunnerDependencies {
  runCodexExec: typeof runCodexExec;
  runQualityGates: typeof runQualityGates;
  saveRunState: typeof saveRunState;
  listChangedFiles: typeof listChangedFiles;
  stageAll: typeof stageAll;
  stagedDiffStat: typeof stagedDiffStat;
  stagedDiff: typeof stagedDiff;
  commitStaged: typeof commitStaged;
  headCommit: typeof headCommit;
}

const defaultTaskRunnerDependencies: TaskRunnerDependencies = {
  runCodexExec,
  runQualityGates,
  saveRunState,
  listChangedFiles,
  stageAll,
  stagedDiffStat,
  stagedDiff,
  commitStaged,
  headCommit,
};

async function generateAndCommitMessage(
  params: GenerateCommitParams,
  deps: TaskRunnerDependencies,
): Promise<string> {
  await deps.stageAll(params.rootDir);
  const diffStat = await deps.stagedDiffStat(params.rootDir);
  const diffPatch = truncateText(await deps.stagedDiff(params.rootDir), 12000);

  const commitPrompt = buildCommitMessagePrompt({
    task: params.task,
    changedFiles: params.changedFiles,
    diffStat,
    diffPatch,
  });

  const commitResponse = await deps.runCodexExec({
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
  await deps.commitStaged(
    commitMessage.subject,
    commitMessage.body,
    params.rootDir,
  );
  return deps.headCommit(params.rootDir);
}

export async function executeMutatingAgentStep(
  params: {
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
  },
  deps: TaskRunnerDependencies = defaultTaskRunnerDependencies,
): Promise<
  { ok: true; value: MutatingStepSuccess } | { ok: false; error: StepFailure }
> {
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

  const response = await deps.runCodexExec({
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
  await deps.saveRunState(params.statePath, params.state);

  if (response.result.exitCode !== 0) {
    return {
      ok: false,
      error: {
        category: "codex_error",
        details: `codex ${params.agent} failed with code ${response.result.exitCode}`,
      },
    };
  }

  const changedFiles = await deps.listChangedFiles(params.rootDir);
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
    const qualityGate = await deps.runQualityGates({
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
    const commitHash = await generateAndCommitMessage(
      {
        rootDir: params.rootDir,
        logPath: params.artifacts.logPath,
        outputPath: params.artifacts.commitMessagePath,
        task: params.task,
        changedFiles,
        model: params.model,
        sandbox: params.sandbox,
        printLogs: params.printLogs,
      },
      deps,
    );

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

export async function executeVerifierStep(
  params: {
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
  },
  deps: TaskRunnerDependencies = defaultTaskRunnerDependencies,
): Promise<
  { ok: true; value: VerifierDecision } | { ok: false; error: StepFailure }
> {
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

  const response = await deps.runCodexExec({
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
  await deps.saveRunState(params.statePath, params.state);

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

export async function executeTaskWithRetry(
  params: {
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
  },
  deps: TaskRunnerDependencies = defaultTaskRunnerDependencies,
): Promise<TaskAttemptResult> {
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
    await deps.saveRunState(params.statePath, params.state);

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

        const verifierResult = await executeVerifierStep(
          {
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
          },
          deps,
        );

        if (!verifierResult.ok) {
          stepFailure = verifierResult.error;
          break;
        }

        if (verifierResult.value.status === "DONE") {
          taskState.status = "passed";
          taskState.lastCommit = latestCommitHash;
          taskState.lastError = undefined;
          taskState.changedFiles = [...changedFilesSet];
          await deps.saveRunState(params.statePath, params.state);
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

      const mutatingResult = await executeMutatingAgentStep(
        {
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
        },
        deps,
      );

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
    await deps.saveRunState(params.statePath, params.state);
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
