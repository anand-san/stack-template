import { resolve } from "node:path";
import type { RunnerOptions } from "./types";

function parseNumber(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${flag}: ${value}`);
  }
  return parsed;
}

export function parseRunnerOptions(argv: string[]): RunnerOptions {
  const command = argv[0];
  if (command !== "start" && command !== "resume") {
    throw new Error("Usage: bun scripts/ralph/run.ts <start|resume> [options]");
  }

  let planPath = "docs/ideation/PLAN.md";
  let tasksPath = "docs/ideation/tasks.json";
  let statePath: string | undefined;
  let retry = 1;
  let maxPhases: number | undefined;
  let maxTasks: number | undefined;
  let dryRun = false;
  let allowDirty = false;
  let model: string | undefined;
  let sandbox: RunnerOptions["sandbox"];
  let branchPrefix = "ralph";
  let skipQualityGates = false;

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--allow-dirty") {
      allowDirty = true;
      continue;
    }
    if (arg === "--skip-quality-gates") {
      skipQualityGates = true;
      continue;
    }

    const next = argv[i + 1];
    if (!next) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--plan") {
      planPath = next;
    } else if (arg === "--tasks") {
      tasksPath = next;
    } else if (arg === "--state") {
      statePath = next;
    } else if (arg === "--retry") {
      retry = parseNumber(next, arg);
    } else if (arg === "--max-phases") {
      maxPhases = parseNumber(next, arg);
    } else if (arg === "--max-tasks") {
      maxTasks = parseNumber(next, arg);
    } else if (arg === "--model") {
      model = next;
    } else if (arg === "--sandbox") {
      if (
        next !== "read-only" &&
        next !== "workspace-write" &&
        next !== "danger-full-access"
      ) {
        throw new Error(`Invalid sandbox mode: ${next}`);
      }
      sandbox = next;
    } else if (arg === "--branch-prefix") {
      branchPrefix = next;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }

    i += 1;
  }

  if (retry < 0) {
    throw new Error("--retry must be >= 0");
  }
  if (maxPhases !== undefined && maxPhases <= 0) {
    throw new Error("--max-phases must be > 0");
  }
  if (maxTasks !== undefined && maxTasks <= 0) {
    throw new Error("--max-tasks must be > 0");
  }
  if (command === "resume" && !statePath) {
    throw new Error("--state is required for resume");
  }

  return {
    command,
    planPath: resolve(planPath),
    tasksPath: resolve(tasksPath),
    statePath: statePath ? resolve(statePath) : undefined,
    retry,
    maxPhases,
    maxTasks,
    dryRun,
    allowDirty,
    model,
    sandbox,
    branchPrefix,
    skipQualityGates,
  };
}
