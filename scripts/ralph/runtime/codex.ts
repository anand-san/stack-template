import { readFile } from "node:fs/promises";
import type { ProcessResult } from "../types";
import { appendLog } from "./artifacts";
import { runProcess } from "./process";

async function readOutputFileOrFallback(
  outputPath: string,
  fallback: string,
): Promise<string> {
  try {
    return await readFile(outputPath, "utf8");
  } catch {
    return fallback;
  }
}

export interface CodexExecParams {
  rootDir: string;
  prompt: string;
  logPath: string;
  outputPath: string;
  model?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  printLogs: boolean;
  logTitle: string;
}

export async function runCodexExec(params: CodexExecParams): Promise<{
  result: ProcessResult;
  output: string;
}> {
  const args = [
    "exec",
    "--full-auto",
    "-C",
    params.rootDir,
    "-o",
    params.outputPath,
  ];
  if (params.model) {
    args.push("-m", params.model);
  }
  if (params.sandbox) {
    args.push("-s", params.sandbox);
  }
  args.push("-");

  const result = await runProcess({
    cmd: ["codex", ...args],
    cwd: params.rootDir,
    stdin: params.prompt,
    streamOutput: params.printLogs,
  });

  const output = await readOutputFileOrFallback(
    params.outputPath,
    result.stdout,
  );

  await appendLog(
    params.logPath,
    params.logTitle,
    [
      `Command: codex ${args.join(" ")}`,
      "",
      "OUTPUT:",
      output || "(empty)",
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

  return { result, output };
}
