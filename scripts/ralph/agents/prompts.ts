import type { AgentName, AgentPromptInput, AgentSpec } from "./types";

export const MAX_VERIFIER_CYCLES = 5;

function buildContextBlock(input: AgentPromptInput): string {
  const notes =
    input.task.notes.length > 0 ? input.task.notes.join(" | ") : "None";

  return [
    `<context>`,
    `  <phase_info>`,
    `    <id>${input.phase.id}</id>`,
    `    <name>${input.phase.name}</name>`,
    `    <goal>${input.phase.goal}</goal>`,
    `  </phase_info>`,
    `  <current_task>`,
    `    <id>${input.task.id}</id>`,
    `    <title>${input.task.title}</title>`,
    `    <description>${input.task.description}</description>`,
    `    <notes>${notes}</notes>`,
    `    <attempt_count>${input.attempt}/${input.maxAttempts}</attempt_count>`,
    `  </current_task>`,
    `  <files>`,
    `    <plan_path>${input.planPath}</plan_path>`,
    `    <tasks_path>${input.tasksPath}</tasks_path>`,
    `  </files>`,
    `</context>`,
  ].join("\n");
}

function buildImplementerPrompt(input: AgentPromptInput): string {
  const retryContext = input.failureContext
    ? [
        `<previous_failure_analysis>`,
        `  CRITICAL: The previous implementation failed.`,
        `  Reasons:`,
        `  ${input.failureContext}`,
        `  INSTRUCTION: You must address these failures specifically. Do not repeat the same mistakes.`,
        `</previous_failure_analysis>`,
      ].join("\n")
    : "";

  return [
    `Your goal is to implement the task defined in the context below.`,
    "",
    buildContextBlock(input),
    "",
    retryContext,
    "",
    `## Instructions`,
    `1. **Analyze Context**: Read ${input.planPath} to align with the global architecture and ${input.tasksPath} for dependency context.`,
    `2. **Scope Enforcement**: Implement ONLY the task described in <current_task>. Do not refactor unrelated code.`,
    `3. **Implementation Standards**:`,
    `   - Write strict, typed code (TypeScript preferences).`,
    `   - Ensure code compiles and lints correctly.`,
    `   - Handle edge cases and errors gracefully.`,
    `   - NO placeholders (e.g., "TODO", "implementation goes here"). Write full, working code.`,
    `4. **Validation**: Run necessary tests or validation scripts before submitting.`,
    "",
    `## Output Format`,
    `Provide your response with a summary of changes, the file content, and a verification that you met the requirements.`,
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
          : "- (No previous notes)";

      return [
        `Your job is to strictly validate the implementation of the task below. You are the gatekeeper for production.`,
        "",
        buildContextBlock(input),
        "",
        `<verifier_context>`,
        `  <cycle>${input.verifierCycle} of ${input.maxVerifierCycles}</cycle>`,
        `  <previous_notes>`,
        notesBlock,
        `  </previous_notes>`,
        `</verifier_context>`,
        "",
        `## Evaluation Criteria`,
        `Analyze the implementation against these strict pillars:`,
        `1. **Correctness**: Does it satisfy the specific <description> and <goal>?`,
        `2. **Safety**: Are there potential runtime errors, type errors, or memory leaks?`,
        `3. **Style**: Is the code clean, modular, and following best practices?`,
        `4. **Scope**: Did the implementer change files they shouldn't have?`,
        "",
        `## Output Rules`,
        `You must output purely valid JSON. No markdown formatting (like \`\`\`json).`,
        `Schema:`,
        `{`,
        `  "status": "DONE" | "REFACTOR" | "ISSUES",`,
        `  "notes": ["Specific, actionable item 1", "Specific item 2"]`,
        `}`,
        "",
        `## Decision Logic`,
        `- Return **DONE** only if the code is perfect and ready for production.`,
        `- Return **REFACTOR** if logic is correct but code style, variable naming, or structure is poor.`,
        `- Return **ISSUES** if there are bugs, type errors, or the requirement is not met.`,
      ].join("\n");
    },
  },
  refactor: {
    name: "refactor",
    mode: "mutating",
    buildPrompt: (input) => {
      const notesBlock = input.notes.map((note) => `- ${note}`).join("\n");
      return [
        `Your goal is to improve code structure and quality WITHOUT changing functional behavior.`,
        "",
        buildContextBlock(input),
        "",
        `<refactor_instructions>`,
        `  The team has verified existing implementation and has requested changes. Focus ONLY on these items:`,
        notesBlock,
        `</refactor_instructions>`,
        "",
        `## Constraints`,
        `- strictly follow the verifier's notes.`,
        `- Do NOT alter the business logic or external behavior of the code.`,
        `- Maintain all existing types and interfaces unless explicitly asked to change them.`,
        `- Ensure the code remains compilable after refactoring.`,
      ].join("\n");
    },
  },
  bug_fixer: {
    name: "bug_fixer",
    mode: "mutating",
    buildPrompt: (input) => {
      const notesBlock = input.notes.map((note) => `- ${note}`).join("\n");
      return [
        `Your goal is to fix defects identified by the QA team.`,
        "",
        buildContextBlock(input),
        "",
        `<defects_log>`,
        `  The QA Team found the following critical issues:`,
        notesBlock,
        `</defects_log>`,
        "",
        `## Instructions`,
        `- Fix the specific issues listed in the <defects_log>.`,
        `- Do not "refactor" for style; focus purely on correctness and functionality.`,
        `- Double-check edge cases that might have caused these bugs.`,
        `- Ensure your fix does not introduce regressions (breaking existing features).`,
      ].join("\n");
    },
  },
};

export function buildAgentPrompt(
  agent: AgentName,
  input: AgentPromptInput
): string {
  return AGENTS[agent].buildPrompt(input);
}
