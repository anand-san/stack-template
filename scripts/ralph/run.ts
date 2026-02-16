import { basename } from "node:path";
import { parseRunnerOptions } from "./config";
import {
  currentBranch,
  ensureCleanWorkingTree,
  ensureGitRepo,
  hasChanges,
} from "./git";
import { executeRun } from "./orchestration/run-executor";
import {
  buildRunId,
  buildRunPaths,
  createInitialRunState,
  ensureRunDirectories,
  loadRunState,
  saveRunState,
} from "./state";
import type { RunState, TasksDocument } from "./types";
import { loadTasksDocument } from "./validate";

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

async function resolveRunInputs(
  options: ReturnType<typeof parseRunnerOptions>,
): Promise<{
  state: RunState;
  statePath: string;
  document: TasksDocument;
}> {
  let state: RunState;
  let statePath: string;
  let document: TasksDocument;

  if (options.command === "start") {
    document = await loadTasksDocument(options.tasksPath);
    const runId = buildRunId();
    const branch = await currentBranch(process.cwd());
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
    return { state, statePath, document };
  }

  statePath = options.statePath as string;
  state = await loadRunState(statePath);
  document = await loadTasksDocument(state.tasksPath);
  await ensureRunDirectories(state);
  const branch = await currentBranch(process.cwd());
  if (branch !== state.branch) {
    throw new Error(
      `Resume must run on ${state.branch}. Current branch is ${branch}.`,
    );
  }

  return { state, statePath, document };
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const options = parseRunnerOptions(Bun.argv.slice(2));

  await ensureGitRepo(rootDir);

  if (options.command === "start") {
    const document = await loadTasksDocument(options.tasksPath);
    if (options.dryRun) {
      printDryRun(document, options.maxPhases, options.maxTasks);
      return;
    }
  } else {
    const resumeStatePath = options.statePath as string;
    const state = await loadRunState(resumeStatePath);
    const document = await loadTasksDocument(state.tasksPath);
    if (options.dryRun) {
      printDryRun(document, options.maxPhases, options.maxTasks);
      return;
    }
  }

  if (!options.allowDirty) {
    await ensureCleanWorkingTree(rootDir);
  }

  const { state, statePath, document } = await resolveRunInputs(options);

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
