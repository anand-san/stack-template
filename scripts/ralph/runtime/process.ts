import type { ProcessResult } from "../types";

export async function runProcess(params: {
  cmd: string[];
  cwd: string;
  stdin?: string;
  streamOutput?: boolean;
}): Promise<ProcessResult> {
  const proc = Bun.spawn(params.cmd, {
    cwd: params.cwd,
    stdin: params.stdin !== undefined ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (params.stdin !== undefined && proc.stdin) {
    proc.stdin.write(params.stdin);
    proc.stdin.end();
  }

  const readStream = async (
    stream: ReadableStream<Uint8Array> | null,
    writer?: (chunk: string) => void,
  ): Promise<string> => {
    if (!stream) {
      return "";
    }
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      const text = decoder.decode(chunk.value, { stream: true });
      buffer += text;
      if (writer) {
        writer(text);
      }
    }
    const tail = decoder.decode();
    if (tail.length > 0) {
      buffer += tail;
      if (writer) {
        writer(tail);
      }
    }
    return buffer;
  };

  const writeStdout = params.streamOutput
    ? (chunk: string) => process.stdout.write(chunk)
    : undefined;
  const writeStderr = params.streamOutput
    ? (chunk: string) => process.stderr.write(chunk)
    : undefined;

  const [stdout, stderr, exitCode] = await Promise.all([
    readStream(proc.stdout, writeStdout),
    readStream(proc.stderr, writeStderr),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}
