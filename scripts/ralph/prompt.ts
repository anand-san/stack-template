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
    "You are Ralph, a long-running implementation agent for this repository.",
    "Implement exactly one task from docs/ideation/tasks.json and stop when done.",
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
    `- Read ${input.planPath} and ${input.tasksPath} for context.`,
    "- Implement only this task. Do not start any other task.",
    "- Use Bun workspace conventions in this repository.",
    "- Do not use TypeScript any type.",
    "- Keep changes scoped and production-ready.",
    "- Run required validations for this task before finishing.",
    "- In final response, include: summary, files changed, tests/checks run, unresolved risks.",
    retryBlock,
  ].join("\n");
}
