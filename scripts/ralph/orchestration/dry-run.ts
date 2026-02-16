import type { TasksDocument } from "../types";

export function printDryRun(
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
