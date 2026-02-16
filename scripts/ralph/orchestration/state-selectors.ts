import type { RunState, TaskRuntimeState } from "../types";

export function getTaskState(
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

export function getPhaseState(
  state: RunState,
  phaseId: string,
): RunState["phases"][number] {
  const found = state.phases.find((phase) => phase.id === phaseId);
  if (!found) {
    throw new Error(`Phase runtime state not found for ${phaseId}`);
  }
  return found;
}
