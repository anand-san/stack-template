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

export function renameScope(root: string, newScope: string): void {
  const oldScope = "@sandilya-stack";

  const scopeFiles = findFilesWithPattern(
    root,
    [".ts", ".tsx", ".mjs", ".json"],
    oldScope,
  );

  for (const f of scopeFiles) {
    processFileScope(f, oldScope, newScope);
  }

  const typesDecl = join(root, "shared/types.d.ts");
  if (existsSync(typesDecl)) {
    processFileScope(typesDecl, oldScope, newScope);
  }
}

export function updateProjectName(root: string, projectName: string): void {
  const rootPkg = join(root, "package.json");
  if (existsSync(rootPkg)) {
    const pkg = JSON.parse(readFileSync(rootPkg, "utf-8"));
    pkg.name = projectName;
    writeFileSync(rootPkg, JSON.stringify(pkg, null, 2) + "\n");
  }

  const readmePath = join(root, "README.md");
  if (existsSync(readmePath)) {
    let content = readFileSync(readmePath, "utf-8");
    content = content.replace(/^# .+$/m, `# ${projectName}`);
    writeFileSync(readmePath, content);
  }

  updateHtml(root, projectName);
}

function updateHtml(root: string, projectName: string): void {
  const htmlPath = join(root, "frontend/index.html");
  if (!existsSync(htmlPath)) return;
  let content = readFileSync(htmlPath, "utf-8");
  content = content.replaceAll("Sandilya Stack", projectName);
  writeFileSync(htmlPath, content);
}

export function regenerateDocs(root: string, config: InitConfig): void {
  const patternsPath = join(root, "docs/ai/patterns.md");
  if (existsSync(patternsPath)) {
    let content = readFileSync(patternsPath, "utf-8");
    if (!config.includeFirebase) {
      const htmlFirebasePattern =
        /^[ \t]*<!-- @init:firebase-start -->\s*\n[\s\S]*?^[ \t]*<!-- @init:firebase-end -->\s*\n?/gm;
      content = content.replace(htmlFirebasePattern, "");
      const htmlNoFirebasePattern =
        /^[ \t]*<!-- @init:no-firebase-start -->\s*\n([\s\S]*?)^[ \t]*<!-- @init:no-firebase-end -->\s*\n?/gm;
      content = content.replace(htmlNoFirebasePattern, "$1");
    } else {
      const htmlNoFirebasePattern =
        /^[ \t]*<!-- @init:no-firebase-start -->\s*\n[\s\S]*?^[ \t]*<!-- @init:no-firebase-end -->\s*\n?/gm;
      content = content.replace(htmlNoFirebasePattern, "");
      const htmlFirebaseMarkers =
        /^[ \t]*<!-- @init:firebase-(?:start|end) -->\s*\n?/gm;
      content = content.replace(htmlFirebaseMarkers, "");
    }
    content = content.replace(/\n{3,}/g, "\n\n").trim() + "\n";
    writeFileSync(patternsPath, content);
  }

  generateClaudeMd(root, config);
  generateFrontendDoc(root, config);
  generateServerDoc(root, config);

  if (!config.includeFirebase) {
    removeFiles([join(root, "docs/ai/authentication.md")]);
  }
}

function generateClaudeMd(root: string, config: InitConfig): void {
  const features: string[] = [];
  if (config.includeFirebase) features.push("Firebase Authentication");
  if (config.includeSentry) features.push("Sentry Error Tracking");
  if (config.includeDocker) features.push("Docker Deployment");

  const docLinks = [
    "- Frontend: docs/ai/frontend.md",
    "- Server: docs/ai/server.md",
    "- Shared: docs/ai/shared.md",
    "- Development Patterns: docs/ai/patterns.md",
  ];
  if (config.includeFirebase) {
    docLinks.push("- Authentication: docs/ai/authentication.md");
  }

  const content = `This is a full-stack monorepo using Bun as the runtime. It contains three packages:

- frontend/: React 19 + Vite + Tailwind + shadcn/ui
- server/: Hono API server running on Bun
- shared/: Shared types, Zod schemas, and config used by both frontend and server

${features.length > 0 ? `Includes: ${features.join(", ")}\n` : ""}
## Documentation

${docLinks.join("\n")}

## Coding Workflow

- TypeScript strict mode; avoid \`any\` types
- Write tests first (TDD recommended)
- Server tests: \`cd server && bun test\` (bun:test)
- Frontend tests: \`cd frontend && bun run test\` (Vitest + React Testing Library)
- Use conventional commit format (feat, fix, chore, etc.)
- Run \`bun run format\` before opening a PR
- Run \`bun run check-types\` in both frontend/ and server/ directories
- Keep commits atomic and focused

## Naming Conventions

- React components: PascalCase (e.g., SignIn.tsx)
- Hooks: useXxx camelCase (e.g., useGoogleAuth.ts)
- Route/service modules: lowercase descriptive names (e.g., todos.ts, firebase.ts)

## Design Principles

- Minimalist, clean, elegant
- Follow Apple design principles
- Use shadcn/ui components where possible (npx shadcn@latest add <component>)

## Available Scripts

- \`bun run dev\` — run frontend + server
- \`bun run test\` — run all tests
- \`bun run build\` — build both packages
- \`bun run format\` — format code
- \`bun run lint\` — lint code
`;

  writeFileSync(join(root, "CLAUDE.md"), content);
}

function generateFrontendDoc(root: string, config: InitConfig): void {
  let content = `# Frontend

- React 19 + Vite + Tailwind CSS + shadcn/ui
- Components in \`frontend/src/components/ui/\`. Add new ones: \`npx shadcn@latest add <component-name>\`

## Type-Safe API Communication

- Uses Hono client (\`hono/client\`) with types exported from the server (\`ApiRoutes\`)
- Client configured in \`frontend/src/api/client.ts\`
- All API calls are fully typed without manual type definitions
`;

  if (config.includeFirebase) {
    content += `- Authentication header is automatically added to all API calls by the client

## Authentication

- Firebase Authentication with email and Google sign-in
- Auth context in \`frontend/src/context/auth/\`
- Protected routes via Layout component
- See docs/ai/authentication.md for full flow
`;
  }

  content += `
## Tests

- Vitest + React Testing Library
- Tests in \`frontend/src/__tests__/\`
- Run: \`cd frontend && bun run test\`
- Watch: \`cd frontend && bun run test:watch\`
- Coverage: \`cd frontend && bun run test:coverage\`
`;

  writeFileSync(join(root, "docs/ai/frontend.md"), content);
}

function generateServerDoc(root: string, config: InitConfig): void {
  let content = `# Server

- Hono API server running on Bun
- Routes in \`server/routes/\`, services in \`server/services/\`
- Zod schemas for request validation live in the shared package
`;

  if (config.includeFirebase) {
    content += `
## Firebase

- Uses a lightweight custom REST client (not firebase-admin) in \`server/custom-modules/firebase/\`
- Auth middleware in \`server/middlewares/auth/\` verifies Bearer tokens
- Routes under \`/api/*\` are automatically protected
`;
  }

  if (config.includeSentry) {
    content += `
## Error Tracking

- Sentry integration via lightweight client in \`server/custom-modules/sentry/\`
- Logger service in \`server/services/logger/\` wraps Sentry calls
`;
  }

  content += `
## Tests

- Bun test runner (\`bun:test\`)
- Tests in \`server/__tests__/\`
- Run: \`cd server && bun test\`
- Watch: \`cd server && bun test --watch\`
`;

  writeFileSync(join(root, "docs/ai/server.md"), content);
}

export function updateDomain(root: string, domain: string): void {
  const appTs = join(root, "server/app.ts");
  if (existsSync(appTs)) {
    let content = readFileSync(appTs, "utf-8");
    content = content.replace(".sandilya.dev", `.${domain}`);
    writeFileSync(appTs, content);
  }

  const htmlPath = join(root, "frontend/index.html");
  if (existsSync(htmlPath)) {
    let content = readFileSync(htmlPath, "utf-8");
    content = content.replaceAll("sandilya.dev", domain);
    writeFileSync(htmlPath, content);
  }
}
