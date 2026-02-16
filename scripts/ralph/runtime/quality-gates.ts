import { join } from "node:path";
import { appendLog } from "./artifacts";
import { runProcess } from "./process";

export async function runQualityGates(params: {
  rootDir: string;
  logPath: string;
  printLogs: boolean;
}): Promise<{ passed: boolean; failedStep?: string; details: string }> {
  const steps: Array<{ name: string; cmd: string[]; cwd: string }> = [
    { name: "format", cmd: ["bun", "run", "format"], cwd: params.rootDir },
    { name: "lint", cmd: ["bun", "run", "lint"], cwd: params.rootDir },
    {
      name: "frontend-check-types",
      cmd: ["bun", "run", "check-types"],
      cwd: join(params.rootDir, "frontend"),
    },
    {
      name: "server-check-types",
      cmd: ["bun", "run", "check-types"],
      cwd: join(params.rootDir, "server"),
    },
    { name: "test", cmd: ["bun", "run", "test"], cwd: params.rootDir },
  ];

  for (const step of steps) {
    const result = await runProcess({
      cmd: step.cmd,
      cwd: step.cwd,
      streamOutput: params.printLogs,
    });

    await appendLog(
      params.logPath,
      `Quality Gate: ${step.name}`,
      [
        `CWD: ${step.cwd}`,
        `Command: ${step.cmd.join(" ")}`,
        "",
        "STDOUT:",
        result.stdout || "(empty)",
        "",
        "STDERR:",
        result.stderr || "(empty)",
        "",
        `Exit Code: ${result.exitCode}`,
      ].join("\n"),
    );

    if (result.exitCode !== 0) {
      return {
        passed: false,
        failedStep: step.name,
        details: `${step.name} failed with exit code ${result.exitCode}`,
      };
    }
  }

  return { passed: true, details: "all checks passed" };
}
