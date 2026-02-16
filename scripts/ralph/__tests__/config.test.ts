import { describe, expect, it } from "bun:test";
import { parseRunnerOptions } from "../config";

describe("parseRunnerOptions", () => {
  it("parses start with defaults", () => {
    const options = parseRunnerOptions(["start"]);
    expect(options.command).toBe("start");
    expect(options.retry).toBe(1);
    expect(options.allowDirty).toBe(false);
    expect(options.printLogs).toBe(true);
  });

  it("supports --silent to disable live logs", () => {
    const options = parseRunnerOptions(["start", "--silent"]);
    expect(options.printLogs).toBe(false);
  });

  it("uses last flag when both --silent and --print-logs are provided", () => {
    const silentThenPrint = parseRunnerOptions([
      "start",
      "--silent",
      "--print-logs",
    ]);
    const printThenSilent = parseRunnerOptions([
      "start",
      "--print-logs",
      "--silent",
    ]);

    expect(silentThenPrint.printLogs).toBe(true);
    expect(printThenSilent.printLogs).toBe(false);
  });

  it("requires state on resume", () => {
    expect(() => parseRunnerOptions(["resume"])).toThrow(
      "--state is required for resume",
    );
  });

  it("parses explicit flags", () => {
    const options = parseRunnerOptions([
      "start",
      "--plan",
      "docs/custom/PLAN.md",
      "--tasks",
      "docs/custom/tasks.json",
      "--retry",
      "2",
      "--max-phases",
      "3",
      "--max-tasks",
      "4",
      "--allow-dirty",
      "--skip-quality-gates",
      "--print-logs",
      "--model",
      "gpt-5",
      "--sandbox",
      "workspace-write",
    ]);

    expect(options.retry).toBe(2);
    expect(options.maxPhases).toBe(3);
    expect(options.maxTasks).toBe(4);
    expect(options.allowDirty).toBe(true);
    expect(options.skipQualityGates).toBe(true);
    expect(options.printLogs).toBe(true);
    expect(options.model).toBe("gpt-5");
    expect(options.sandbox).toBe("workspace-write");
  });

  it("rejects invalid sandbox mode", () => {
    expect(() =>
      parseRunnerOptions(["start", "--sandbox", "bad-mode"]),
    ).toThrow("Invalid sandbox mode");
  });

  it("rejects negative retry", () => {
    expect(() => parseRunnerOptions(["start", "--retry", "-1"])).toThrow(
      "--retry must be >= 0",
    );
  });
});
