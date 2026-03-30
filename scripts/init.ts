import {
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

export function removeMarkerBlocks(content: string, feature: string): string {
  const tsPattern = new RegExp(
    `^[ \\t]*\\/\\/ @init:${feature}-start[ \\t]*\\n[\\s\\S]*?^[ \\t]*\\/\\/ @init:${feature}-end[ \\t]*\\n?`,
    "gm",
  );
  let result = content.replace(tsPattern, "");

  const jsxPattern = new RegExp(
    `^[ \\t]*\\{/\\* @init:${feature}-start \\*/\\}[ \\t]*\\n[\\s\\S]*?^[ \\t]*\\{/\\* @init:${feature}-end \\*/\\}[ \\t]*\\n?`,
    "gm",
  );
  result = result.replace(jsxPattern, "");

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function uncommentMarkerBlock(content: string, feature: string): string {
  const pattern = new RegExp(
    `^[ \\t]*\\/\\/ @init:${feature}-start[ \\t]*\\n([\\s\\S]*?)^[ \\t]*\\/\\/ @init:${feature}-end[ \\t]*\\n?`,
    "gm",
  );
  return content.replace(pattern, (_match, block: string) => {
    return block
      .split("\n")
      .map((line) => line.replace(/^(\s*)\/\/\s?/, "$1"))
      .join("\n");
  });
}

export function replaceScope(
  content: string,
  oldScope: string,
  newScope: string,
): string {
  return content.replaceAll(oldScope, newScope);
}
