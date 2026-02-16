import { describe, expect, it } from "bun:test";
import {
  buildCommitMessagePrompt,
  extractJsonPayload,
  parseConventionalCommit,
  parseVerifierDecision,
  truncateText,
} from "../agents/parsers";

describe("agents/parsers", () => {
  it("extracts fenced JSON payload", () => {
    const raw = '```json\n{"status":"DONE","notes":[]}\n```';
    expect(extractJsonPayload(raw)).toBe('{"status":"DONE","notes":[]}');
  });

  it("parses verifier DONE with empty notes", () => {
    expect(parseVerifierDecision('{"status":"DONE","notes":[]}')).toEqual({
      status: "DONE",
      notes: [],
    });
  });

  it("rejects verifier REFACTOR without notes", () => {
    expect(() =>
      parseVerifierDecision('{"status":"REFACTOR","notes":[]}'),
    ).toThrow("Verifier REFACTOR requires notes");
  });

  it("parses valid conventional commit", () => {
    expect(
      parseConventionalCommit('{"subject":"feat(api): add handler","body":""}'),
    ).toEqual({
      subject: "feat(api): add handler",
      body: "",
    });
  });

  it("rejects forbidden token in commit subject", () => {
    expect(() =>
      parseConventionalCommit(
        '{"subject":"feat(api): ralph cleanup","body":""}',
      ),
    ).toThrow("forbidden token");
  });

  it("truncates long text", () => {
    const text = "abcdefghijklmnopqrstuvwxyz";
    expect(truncateText(text, 5)).toBe("abcde\n\n[truncated]");
    expect(truncateText(text, 26)).toBe(text);
  });

  it("builds commit prompt with required sections", () => {
    const prompt = buildCommitMessagePrompt({
      task: { title: "Do thing" },
      changedFiles: ["a.ts", "b.ts"],
      diffStat: "2 files changed",
      diffPatch: "diff --git",
    });

    expect(prompt).toContain(
      "Generate a conventional commit message as strict JSON.",
    );
    expect(prompt).toContain("Task title: Do thing");
    expect(prompt).toContain("- a.ts");
    expect(prompt).toContain("2 files changed");
  });
});
