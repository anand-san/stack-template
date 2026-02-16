import type { PlanPhase, PlanTask } from "./types";

interface PromptInput {
  planPath: string;
  tasksPath: string;
  phase: PlanPhase;
  task: PlanTask;
  attempt: number;
  maxAttempts: number;
  failureContext?: string;
}

export function buildTaskPrompt(input: PromptInput): string {
  const retryBlock = input.failureContext
    ? [
        "",
        "Previous attempt failed. Fix only this task and address these failures:",
        input.failureContext,
      ].join("\n")
    : "";

  return [
    `- Read ${input.planPath} to understand the bigger plan for the app `,
    `- Read ${input.tasksPath} to understand all tasks that the team is working on.`,
    `"We are working in phase: ${input.phase.id} - ${input.phase.name}"`,
    `"The goal of this phase is: ${input.phase.goal}"`,
    "Under current phase, I have this task that I would like to implement",
    "",
    `Task ID: ${input.task.id}`,
    `Task Title: ${input.task.title}`,
    `Task Description: ${input.task.description}`,
    `Task Notes: ${input.task.notes.length > 0 ? input.task.notes.join(" | ") : "None"}`,
    `Phase: ${input.phase.id} - ${input.phase.name}`,
    `Phase Goal: ${input.phase.goal}`,
    `Attempt: ${input.attempt}/${input.maxAttempts}`,
    "",
    "Required behavior:",
    "- Implement only this task. Do not start any other task.",
    "- Keep changes scoped and production-ready.",
    "- Run required validations for this task before finishing.",
    "- In final response, include: summary, files changed, tests/checks run, unresolved risks.",
    retryBlock,
  ].join("\n");
}
