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

export interface InitConfig {
  projectName: string;
  scope: string;
  domain: string;
  includeFirebase: boolean;
  includeSentry: boolean;
  includeSampleCode: boolean;
  includeDocker: boolean;
}

export function removeFirebase(root: string): void {
  removeDirs([
    join(root, "frontend/src/context/auth"),
    join(root, "frontend/src/components/auth"),
    join(root, "server/middlewares/auth"),
    join(root, "server/custom-modules/firebase"),
  ]);

  removeFiles([
    join(root, "frontend/src/lib/firebase.ts"),
    join(root, "server/services/firebase.ts"),
    join(root, "docs/ai/authentication.md"),
    join(root, "server/__tests__/mocks/firebase-admin.ts"),
    join(root, "server/__tests__/setup.ts"),
  ]);

  const markerFiles = [
    join(root, "server/app.ts"),
    join(root, "server/env.ts"),
    join(root, "frontend/src/main.tsx"),
    join(root, "frontend/src/vite-env.d.ts"),
  ];
  for (const f of markerFiles) {
    removeFeatureMarkers(f, "firebase");
  }

  replaceFile(
    join(root, "frontend/src/pages/Layout.tsx"),
    join(root, "frontend/src/pages/Layout.clean.tsx"),
  );

  const clientPath = join(root, "frontend/src/api/client.ts");
  if (existsSync(clientPath)) {
    let content = readFileSync(clientPath, "utf-8");
    content = removeMarkerBlocks(content, "firebase");
    content = uncommentMarkerBlock(content, "no-firebase");
    content = removeMarkerBlocks(content, "no-firebase");
    writeFileSync(clientPath, content);
  }

  removeFirebaseDeps(root);
}

function removeFirebaseDeps(root: string): void {
  const pkgPath = join(root, "frontend/package.json");
  if (!existsSync(pkgPath)) return;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const firebaseDeps = ["firebase"];
  for (const dep of firebaseDeps) {
    delete pkg.dependencies?.[dep];
    delete pkg.devDependencies?.[dep];
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

export function removeSentry(root: string): void {
  removeDirs([join(root, "server/custom-modules/sentry")]);

  const markerFiles = [
    join(root, "server/env.ts"),
    join(root, "frontend/src/vite-env.d.ts"),
  ];
  for (const f of markerFiles) {
    removeFeatureMarkers(f, "sentry");
  }

  replaceFile(
    join(root, "server/services/logger/loggerService.ts"),
    join(root, "server/services/logger/loggerService.clean.ts"),
  );

  replaceFile(
    join(root, "frontend/src/utils/logger.ts"),
    join(root, "frontend/src/utils/logger.clean.ts"),
  );

  removeSentryDeps(root);
}

function removeSentryDeps(root: string): void {
  const frontendPkgPath = join(root, "frontend/package.json");
  if (existsSync(frontendPkgPath)) {
    const pkg = JSON.parse(readFileSync(frontendPkgPath, "utf-8"));
    delete pkg.dependencies?.["@sentry/react"];
    writeFileSync(frontendPkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }
}

export function removeSampleCode(root: string, includeFirebase: boolean): void {
  removeFiles([
    join(root, "server/routes/hello.ts"),
    join(root, "server/routes/todos.ts"),
    join(root, "shared/types/sampleSchema.ts"),
    join(root, "shared/types/todos.ts"),
    join(root, "frontend/src/api/hello.ts"),
    join(root, "server/__tests__/routes/todos.test.ts"),
    join(root, "frontend/src/__tests__/pages/Home.test.tsx"),
  ]);

  removeDirs([join(root, "server/services/firestoreDemo")]);

  const markerFiles = [
    join(root, "server/app.ts"),
    join(root, "shared/types/index.ts"),
  ];
  for (const f of markerFiles) {
    removeFeatureMarkers(f, "sample");
  }

  if (includeFirebase) {
    replaceFile(
      join(root, "frontend/src/pages/Home.tsx"),
      join(root, "frontend/src/pages/Home.clean-with-auth.tsx"),
    );
    removeFiles([join(root, "frontend/src/pages/Home.clean.tsx")]);
  } else {
    replaceFile(
      join(root, "frontend/src/pages/Home.tsx"),
      join(root, "frontend/src/pages/Home.clean.tsx"),
    );
    removeFiles([join(root, "frontend/src/pages/Home.clean-with-auth.tsx")]);
  }
}

export function removeDocker(root: string): void {
  removeFiles([
    join(root, "Dockerfile.frontend"),
    join(root, "Dockerfile.server"),
    join(root, "railway.json"),
    join(root, ".dockerignore"),
  ]);

  removeDirs([join(root, "deployments")]);
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
