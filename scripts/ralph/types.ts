export type InputTaskStatus = "todo" | "done" | "pending";

export interface PlanTask {
  id: string;
  status: InputTaskStatus;
  title: string;
  description: string;
  notes: string[];
}

export interface PlanPhase {
  id: string;
  name: string;
  goal: string;
  exitCriteria: string[];
  tasks: PlanTask[];
}

export interface TasksDocument {
  idea: string;
  generatedAt: string;
  repo: string;
  phases: PlanPhase[];
}

export type PhaseRunStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked";

export type TaskRunStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "blocked";

export interface PhaseRuntimeState {
  id: string;
  name: string;
  status: PhaseRunStatus;
}

export interface TaskRuntimeState {
  id: string;
  phaseId: string;
  title: string;
  status: TaskRunStatus;
  attempts: number;
  lastError?: string;
  lastCodexExitCode?: number;
  lastQualityGate?: string;
  lastCommit?: string;
  changedFiles: string[];
  lastLogPath?: string;
  lastMessagePath?: string;
}

export type RunOverallStatus = "running" | "completed" | "blocked";

export interface RunState {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  updatedAt: string;
  status: RunOverallStatus;
  branch: string;
  planPath: string;
  tasksPath: string;
  retryLimit: number;
  runDir: string;
  logDir: string;
  messageDir: string;
  handoffPath: string;
  phases: PhaseRuntimeState[];
  tasks: TaskRuntimeState[];
}

export interface RunnerOptions {
  command: "start" | "resume";
  planPath: string;
  tasksPath: string;
  statePath?: string;
  retry: number;
  maxPhases?: number;
  maxTasks?: number;
  dryRun: boolean;
  allowDirty: boolean;
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  branchPrefix: string;
  skipQualityGates: boolean;
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface TaskAttemptResult {
  success: boolean;
  commitHash?: string;
  changedFiles: string[];
  failureCategory?:
    | "codex_error"
    | "quality_gate"
    | "no_changes"
    | "git_conflict";
  failureDetails?: string;
}
