import {
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

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

export function generateEnvFiles(root: string, config: InitConfig): void {
  generateFrontendEnv(root, config);
  generateServerEnv(root, config);
}

function generateFrontendEnv(root: string, config: InitConfig): void {
  let content = `VITE_API_ENDPOINT=http://localhost:3000\n`;

  if (config.includeFirebase) {
    content += `VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
`;
  }

  if (config.includeSentry) {
    content += `VITE_SENTRY_ENABLED=false
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development
`;
  }

  writeFileSync(join(root, "frontend/.env.example"), content);
  writeFileSync(join(root, "frontend/.env"), content);
}

function generateServerEnv(root: string, config: InitConfig): void {
  let content = `PORT=3000
FRONTEND_URL=http://localhost:5173
`;

  if (config.includeFirebase) {
    content += `FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="your-private-key"
`;
  }

  if (config.includeSentry) {
    content += `SENTRY_ENABLED=false
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
`;
  }

  writeFileSync(join(root, "server/.env.example"), content);
  writeFileSync(join(root, "server/.env"), content);
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

async function prompt(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultValue: string,
): Promise<string> {
  const answer = await rl.question(`${question} [${defaultValue}]: `);
  return answer.trim() || defaultValue;
}

async function promptYesNo(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultYes: boolean,
): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await rl.question(`${question} [${hint}]: `);
  const trimmed = answer.trim().toLowerCase();
  if (trimmed === "") return defaultYes;
  return trimmed === "y" || trimmed === "yes";
}

async function collectConfig(
  rl: ReturnType<typeof createInterface>,
): Promise<InitConfig> {
  const dirName = basename(ROOT);

  console.log("\n🔧 Stack Template Init\n");

  const projectName = await prompt(rl, "Project name", dirName);
  let scope = await prompt(rl, "Package scope", `@${projectName}`);
  if (!scope.startsWith("@")) scope = `@${scope}`;
  const domain = await prompt(rl, "Domain (for CORS)", `${projectName}.dev`);
  const includeFirebase = await promptYesNo(rl, "Include Firebase auth?", true);
  const includeSentry = await promptYesNo(rl, "Include Sentry?", true);
  const includeSampleCode = await promptYesNo(
    rl,
    "Include sample code?",
    false,
  );
  const includeDocker = await promptYesNo(
    rl,
    "Include Docker/deployment?",
    true,
  );

  return {
    projectName,
    scope,
    domain,
    includeFirebase,
    includeSentry,
    includeSampleCode,
    includeDocker,
  };
}

function printSummary(config: InitConfig): void {
  console.log("\n📋 Configuration Summary:\n");
  console.log(`  Project name:    ${config.projectName}`);
  console.log(`  Package scope:   ${config.scope}`);
  console.log(`  Domain:          ${config.domain}`);
  console.log(`  Firebase auth:   ${config.includeFirebase ? "yes" : "no"}`);
  console.log(`  Sentry:          ${config.includeSentry ? "yes" : "no"}`);
  console.log(`  Sample code:     ${config.includeSampleCode ? "yes" : "no"}`);
  console.log(`  Docker:          ${config.includeDocker ? "yes" : "no"}`);
  console.log("");
}

function cleanupCleanVariants(root: string): void {
  removeFiles([
    join(root, "frontend/src/pages/Layout.clean.tsx"),
    join(root, "frontend/src/pages/Home.clean.tsx"),
    join(root, "frontend/src/pages/Home.clean-with-auth.tsx"),
    join(root, "frontend/src/utils/logger.clean.ts"),
    join(root, "server/services/logger/loggerService.clean.ts"),
  ]);
}

function cleanupRemainingMarkers(root: string): void {
  const markerFiles = findFilesWithPattern(
    root,
    [".ts", ".tsx", ".md"],
    "@init:",
  );
  for (const f of markerFiles) {
    let content = readFileSync(f, "utf-8");
    content = content.replace(
      /^[ \t]*\/\/ @init:\S+-(?:start|end)\s*\n?/gm,
      "",
    );
    content = content.replace(
      /^[ \t]*\{\/\* @init:\S+-(?:start|end) \*\/\}\s*\n?/gm,
      "",
    );
    content = content.replace(
      /^[ \t]*<!-- @init:\S+-(?:start|end) -->\s*\n?/gm,
      "",
    );
    content = content.replace(/\n{3,}/g, "\n\n").trim() + "\n";
    writeFileSync(f, content);
  }
}

async function main(): Promise<void> {
  const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  if (rootPkg.initialized) {
    console.error("This project has already been initialized.");
    process.exit(1);
  }

  const isDryRun = process.argv.includes("--dry-run");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const config = await collectConfig(rl);
  printSummary(config);

  const confirm = await promptYesNo(rl, "Proceed?", true);
  rl.close();

  if (!confirm) {
    console.log("Aborted.");
    process.exit(0);
  }

  if (isDryRun) {
    console.log("\n🔍 Dry run — no files modified.\n");
    if (!config.includeFirebase)
      console.log("  Would remove: Firebase auth modules");
    if (!config.includeSentry) console.log("  Would remove: Sentry modules");
    if (!config.includeSampleCode)
      console.log("  Would remove: Sample code (todos, hello)");
    if (!config.includeDocker)
      console.log("  Would remove: Docker/deployment configs");
    console.log(`  Would rename scope: @sandilya-stack → ${config.scope}`);
    console.log(`  Would update domain: sandilya.dev → ${config.domain}`);
    console.log(
      `  Would update project name: sandilya-stack → ${config.projectName}`,
    );
    console.log("  Would regenerate: CLAUDE.md, docs/ai/*, .env files");
    console.log("  Would reset git history");
    process.exit(0);
  }

  console.log("\n⚡ Initializing project...\n");

  if (!config.includeFirebase) {
    console.log("  Removing Firebase auth...");
    removeFirebase(ROOT);
  } else {
    const clientPath = join(ROOT, "frontend/src/api/client.ts");
    if (existsSync(clientPath)) {
      let content = readFileSync(clientPath, "utf-8");
      content = removeMarkerBlocks(content, "no-firebase");
      writeFileSync(clientPath, content);
    }
  }

  if (!config.includeSentry) {
    console.log("  Removing Sentry...");
    removeSentry(ROOT);
  }

  if (!config.includeSampleCode) {
    console.log("  Removing sample code...");
    removeSampleCode(ROOT, config.includeFirebase);
  }

  if (!config.includeDocker) {
    console.log("  Removing Docker/deployment configs...");
    removeDocker(ROOT);
  }

  console.log("  Renaming scope...");
  renameScope(ROOT, config.scope);

  console.log("  Updating project name...");
  updateProjectName(ROOT, config.projectName);

  console.log("  Updating domain...");
  updateDomain(ROOT, config.domain);

  console.log("  Generating env files...");
  generateEnvFiles(ROOT, config);

  console.log("  Regenerating docs...");
  regenerateDocs(ROOT, config);

  console.log("  Cleaning up variants and markers...");
  cleanupCleanVariants(ROOT);
  cleanupRemainingMarkers(ROOT);

  console.log("  Marking as initialized...");
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  pkg.initialized = true;
  delete pkg.scripts?.init;
  writeFileSync(
    join(ROOT, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
  );

  console.log("  Running bun install...");
  const installResult = Bun.spawnSync(["bun", "install"], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (installResult.exitCode !== 0) {
    console.warn("  ⚠️  bun install had issues. Check output above.");
  }

  console.log("  Running tests...");
  const testResult = Bun.spawnSync(["bun", "run", "test"], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (testResult.exitCode !== 0) {
    console.warn("  ⚠️  Some tests failed. Check output above.");
  }

  console.log("  Removing init script...");
  removeFiles([
    join(ROOT, "scripts/init.ts"),
    join(ROOT, "scripts/init.test.ts"),
  ]);

  console.log("  Resetting git history...");
  rmSync(join(ROOT, ".git"), { recursive: true, force: true });
  Bun.spawnSync(["git", "init"], { cwd: ROOT, stdout: "pipe" });
  Bun.spawnSync(["git", "add", "-A"], { cwd: ROOT, stdout: "pipe" });
  Bun.spawnSync(
    ["git", "commit", "-m", `chore: initialize ${config.projectName}`],
    { cwd: ROOT, stdout: "pipe" },
  );

  console.log(
    `\n✅ Project "${config.projectName}" initialized successfully!\n`,
  );
  console.log("  Next steps:");
  console.log("  1. Update .env files with your actual credentials");
  console.log("  2. Run: bun run dev");
  console.log("");
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Init failed:", err);
    process.exit(1);
  });
}
