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

export function removeFiles(paths: string[]): void {
  for (const p of paths) {
    if (existsSync(p)) {
      rmSync(p);
    }
  }
}

export function removeDirs(paths: string[]): void {
  for (const p of paths) {
    if (existsSync(p)) {
      rmSync(p, { recursive: true, force: true });
    }
  }
}

export function replaceFile(target: string, source: string): void {
  if (!existsSync(source)) {
    throw new Error(`Clean variant not found: ${source}`);
  }
  const content = readFileSync(source, "utf-8");
  writeFileSync(target, content);
  rmSync(source);
}

export function removeFeatureMarkers(filePath: string, feature: string): void {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  const updated = removeMarkerBlocks(content, feature);
  writeFileSync(filePath, updated);
}

export function processFileScope(
  filePath: string,
  oldScope: string,
  newScope: string,
): void {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  const updated = replaceScope(content, oldScope, newScope);
  if (updated !== content) {
    writeFileSync(filePath, updated);
  }
}

export function findFilesWithPattern(
  dir: string,
  extensions: string[],
  pattern: string,
): string[] {
  const results: string[] = [];
  function walk(d: string) {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (entry === "node_modules" || entry === ".git" || entry === "dist")
        continue;
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (extensions.some((ext) => full.endsWith(ext))) {
        const content = readFileSync(full, "utf-8");
        if (content.includes(pattern)) {
          results.push(full);
        }
      }
    }
  }
  walk(dir);
  return results;
}
