import { saveRunState } from "../state";
import type {
  RunnerOptions,
  RunState,
  TaskAttemptResult,
  TasksDocument,
} from "../types";
import { writeHandoff } from "../runtime/artifacts";
import { executeTaskWithRetry } from "./task-runner";
import { getPhaseState, getTaskState } from "./state-selectors";

export interface RunExecutorDependencies {
  saveRunState: typeof saveRunState;
  executeTaskWithRetry: typeof executeTaskWithRetry;
  writeHandoff: typeof writeHandoff;
}

const defaultRunExecutorDependencies: RunExecutorDependencies = {
  saveRunState,
  executeTaskWithRetry,
  writeHandoff,
};

export async function executeRun(
  params: {
    rootDir: string;
    state: RunState;
    statePath: string;
    document: TasksDocument;
    options: RunnerOptions;
  },
  deps: RunExecutorDependencies = defaultRunExecutorDependencies,
): Promise<void> {
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
    await deps.saveRunState(params.statePath, params.state);

    for (const task of phase.tasks) {
      const taskState = getTaskState(params.state, phase.id, task.id);
      if (taskState.status === "passed") {
        continue;
      }
      if (
        params.options.maxTasks !== undefined &&
        tasksVisited >= params.options.maxTasks
      ) {
        await deps.saveRunState(params.statePath, params.state);
        return;
      }
      tasksVisited += 1;

      const attempt: TaskAttemptResult = await deps.executeTaskWithRetry({
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
        await deps.writeHandoff({
          state: params.state,
          phase,
          task,
          failure: attempt,
        });
        await deps.saveRunState(params.statePath, params.state);
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
    await deps.saveRunState(params.statePath, params.state);
  }

  const finished = params.state.phases.every(
    (phase) => phase.status === "completed",
  );
  if (finished) {
    params.state.status = "completed";
    await deps.saveRunState(params.statePath, params.state);
  }
}
