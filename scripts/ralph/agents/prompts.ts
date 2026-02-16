import type { AgentName, AgentPromptInput, AgentSpec } from "./types";

export const MAX_VERIFIER_CYCLES = 5;

function buildImplementerPrompt(input: AgentPromptInput): string {
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

const AGENTS: Record<AgentName, AgentSpec> = {
  implementer: {
    name: "implementer",
    mode: "mutating",
    buildPrompt: buildImplementerPrompt,
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

export function buildAgentPrompt(
  agent: AgentName,
  input: AgentPromptInput,
): string {
  return AGENTS[agent].buildPrompt(input);
}
