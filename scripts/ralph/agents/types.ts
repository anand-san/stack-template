import type { PlanPhase, PlanTask, TaskAttemptResult } from "../types";

export type AgentName = "implementer" | "verifier" | "refactor" | "bug_fixer";
export type AgentMode = "mutating" | "read_only";
export type VerifierStatus = "DONE" | "REFACTOR" | "ISSUES";

export interface AgentSpec {
  name: AgentName;
  mode: AgentMode;
  buildPrompt: (input: AgentPromptInput) => string;
}

export interface AgentPromptInput {
  planPath: string;
  tasksPath: string;
  phase: PlanPhase;
  task: PlanTask;
  attempt: number;
  maxAttempts: number;
  verifierCycle: number;
  maxVerifierCycles: number;
  notes: string[];
  failureContext?: string;
}

export interface AgentStepArtifacts {
  logPath: string;
  messagePath: string;
  commitMessagePath: string;
}

export interface ConventionalCommitMessage {
  subject: string;
  body: string;
}

export interface VerifierDecision {
  status: VerifierStatus;
  notes: string[];
}

export interface StepFailure {
  category: TaskAttemptResult["failureCategory"];
  details: string;
}

export interface MutatingStepSuccess {
  commitHash: string;
  changedFiles: string[];
}
