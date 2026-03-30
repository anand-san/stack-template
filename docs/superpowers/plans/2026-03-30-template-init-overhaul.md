# Template Init Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the stack-template repo easy to scaffold new apps via an interactive `bun run init` command that renames scope, toggles features (Firebase, Sentry, sample code, Docker), regenerates docs, and produces a clean project with passing tests.

**Architecture:** An init script (`scripts/init.ts`) using Bun's built-in readline collects project config, then performs file deletions, marker-based block removal, scope renaming, doc regeneration, and git re-initialization. Feature-specific code is demarcated with `@init:` comment markers so the script can surgically remove blocks. Clean file variants (Layout, Home, loggers) are stored alongside originals and swapped in based on choices.

**Tech Stack:** Bun (runtime + test runner), TypeScript, node:fs, node:readline, node:path

**Spec:** `docs/superpowers/specs/2026-03-30-template-init-overhaul-design.md`

---

## File Structure

### New files to create:

- `scripts/init.ts` — main init script (interactive CLI, feature toggling, scope rename, doc generation)
- `scripts/init.test.ts` — tests for init script helper functions (marker removal, scope rename, file operations)
- `scripts/test-init-matrix.sh` — shell script to test all 16 feature toggle combinations
- `frontend/src/pages/Layout.clean.tsx` — Layout without auth (simple Outlet + ThemeToggle)
- `frontend/src/pages/Home.clean.tsx` — Home without sample code or auth (empty page shell)
- `frontend/src/pages/Home.clean-with-auth.tsx` — Home without sample code but with auth available
- `frontend/src/utils/logger.clean.ts` — Console-only logger (no Sentry)
- `server/services/logger/loggerService.clean.ts` — Console-only logger (no Sentry)
- `docs/ai/patterns.md` — Pattern documentation for Claude Code

### Existing files to modify (add markers):

- `server/app.ts` — add `@init:firebase-start/end` and `@init:sample-start/end` markers
- `server/env.ts` — add `@init:firebase-start/end` and `@init:sentry-start/end` markers
- `frontend/src/main.tsx` — add `@init:firebase-start/end` markers
- `frontend/src/api/client.ts` — add `@init:firebase-start/end` markers
- `frontend/src/pages/Layout.tsx` — add `@init:firebase-start/end` markers (entire file is firebase-dependent, replaced by Layout.clean.tsx)
- `frontend/src/vite-env.d.ts` — add `@init:firebase-start/end` and `@init:sentry-start/end` markers
- `shared/types/index.ts` — add `@init:sample-start/end` markers

### Existing files to modify (cleanup/docs):

- `package.json` (root) — remove ralph scripts, add `init` script
- `.gitignore` — remove `docs/ideation/*` and `docs/ralph/runs/*` entries
- `CLAUDE.md` — overhaul with merged AGENTS.md content, feature-conditional sections
- `docs/ai/frontend.md` — update with feature-conditional sections
- `docs/ai/server.md` — update with feature-conditional sections
- `docs/ai/shared.md` — update
- `frontend/index.html` — no code change needed, init script handles replacement at runtime

### Files to delete:

- `AGENTS.md` — content merged into CLAUDE.md

---

## Task 1: Cleanup — Remove dead references and standardize

**Files:**

- Modify: `package.json:23-24` (remove ralph scripts)
- Modify: `.gitignore:122-126` (remove ralph/ideation entries)
- Delete: `AGENTS.md`

- [ ] **Step 1: Remove ralph script entries from root package.json**

In `package.json`, remove these two lines:

```json
    "ralph:start": "bun scripts/ralph/run.ts start",
    "ralph:resume": "bun scripts/ralph/run.ts resume",
```

- [ ] **Step 2: Add init script entry to root package.json**

In `package.json`, add in the scripts section (after the `test:frontend` line):

```json
    "init": "bun scripts/init.ts",
```

- [ ] **Step 3: Remove ralph/ideation gitignore entries**

In `.gitignore`, remove lines 122-126:

```
docs/ralph/runs/*
!docs/ralph/runs/.gitkeep
!docs/ralph/runs/README.md

docs/ideation/*
```

- [ ] **Step 4: Delete AGENTS.md**

Delete `AGENTS.md` from root. Its content will be merged into CLAUDE.md in Task 8.

- [ ] **Step 5: Rename server/.env.template to server/.env.example if it exists**

Check if `server/.env.template` exists. If so, rename to `server/.env.example`. (It may already be gitignored/missing — skip if not found.)

- [ ] **Step 6: Verify and commit**

Run: `bun install && bun test`
Expected: All tests still pass, no changes to behavior.

```bash
git add -A && git commit -m "chore: remove dead references, delete AGENTS.md, add init script entry"
```

---

## Task 2: Add comment markers to source files

**Files:**

- Modify: `server/app.ts`
- Modify: `server/env.ts`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/vite-env.d.ts`
- Modify: `shared/types/index.ts`

- [ ] **Step 1: Add markers to server/app.ts**

Wrap the firebase import and middleware:

```typescript
// @init:firebase-start
import { authenticateUser } from "./middlewares/auth/getUser";
// @init:firebase-end
```

Wrap the auth middleware usage (line 19):

```typescript
// @init:firebase-start
app.use("/api/*", authenticateUser);
// @init:firebase-end
```

Wrap the sample route imports (lines 5-6):

```typescript
// @init:sample-start
import { helloRoute } from "./routes/hello";
import { todosRoute } from "./routes/todos";
// @init:sample-end
```

Wrap the sample route registrations (lines 49-51):

```typescript
// @init:sample-start
  .route('/hello', helloRoute)
  .route('/todos', todosRoute)
// @init:sample-end
```

Note: the `.route('/todos', todosRoute)` line currently has a comment above it. Remove the comment and use the marker instead.

- [ ] **Step 2: Add markers to server/env.ts**

Wrap Firebase env vars (lines 8-10):

```typescript
  // @init:firebase-start
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  FIREBASE_PRIVATE_KEY: z.string(),
  // @init:firebase-end
```

Wrap Sentry env vars (lines 5-7):

```typescript
  // @init:sentry-start
  SENTRY_ENABLED: z.string().default('false').optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  // @init:sentry-end
```

- [ ] **Step 3: Add markers to frontend/src/main.tsx**

Wrap the AuthProvider import (line 5):

```typescript
// @init:firebase-start
import { AuthProvider } from "./context/auth/AuthContextProvider.tsx";
// @init:firebase-end
```

Wrap the AuthProvider JSX wrapper (lines 10, 14). The result after marker removal should leave the ThemeProvider wrapping App directly:

```tsx
{
  /* @init:firebase-start */
}
<AuthProvider>
  {/* @init:firebase-end */}
  <ThemeProvider defaultTheme="light" storageKey="ui-theme">
    <App />
  </ThemeProvider>
  {/* @init:firebase-start */}
</AuthProvider>;
{
  /* @init:firebase-end */
}
```

- [ ] **Step 4: Add markers to frontend/src/api/client.ts**

The entire file needs restructuring with markers. The firebase-specific parts are the import (line 3) and the custom fetch with Bearer token (lines 11-21). When firebase is removed, the client should be a plain `hc` call:

```typescript
import { hc } from "hono/client";
import { type ApiRoutes } from "@server/app";
// @init:firebase-start
import { getCurrentUserIdToken } from "@/lib/firebase";
// @init:firebase-end

const baseUrl = import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000";

// @init:firebase-start
const client = hc<ApiRoutes>(baseUrl, {
  init: {
    credentials: "include",
  },
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getCurrentUserIdToken();
    const headers = new Headers(init?.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(input, {
      ...init,
      headers,
    });
  },
});
// @init:firebase-end
// @init:no-firebase-start
// const client = hc<ApiRoutes>(baseUrl);
// @init:no-firebase-end
export const api = client.api;
```

Note: We use `@init:no-firebase-start/end` for the replacement block. The init script will: remove `@init:firebase-start/end` blocks when firebase is excluded, and remove `@init:no-firebase-start/end` blocks (and uncomment their content) when firebase is included.

- [ ] **Step 5: Add markers to frontend/src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // @init:firebase-start
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  // @init:firebase-end
  readonly VITE_API_ENDPOINT?: string;
  // @init:sentry-start
  readonly VITE_SENTRY_ENABLED?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  // @init:sentry-end
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 6: Add markers to shared/types/index.ts**

```typescript
// @init:sample-start
export * from "./sampleSchema";
export * from "./todos";
// @init:sample-end
```

- [ ] **Step 7: Verify markers don't break anything**

Run: `bun install && bun test`
Expected: All tests still pass. Markers are just comments — no behavior change.

```bash
git add -A && git commit -m "chore: add @init comment markers to source files"
```

---

## Task 3: Create clean file variants

**Files:**

- Create: `frontend/src/pages/Layout.clean.tsx`
- Create: `frontend/src/pages/Home.clean.tsx`
- Create: `frontend/src/pages/Home.clean-with-auth.tsx`
- Create: `frontend/src/utils/logger.clean.ts`
- Create: `server/services/logger/loggerService.clean.ts`

- [ ] **Step 1: Create Layout.clean.tsx**

```tsx
import { ThemeToggle } from "@/components/ToggleTheme";
import { Outlet } from "react-router-dom";

export const AppLayout = () => {
  return (
    <>
      <div className="flex absolute top-4 right-4 space-x-2">
        <ThemeToggle />
      </div>
      <Outlet />
    </>
  );
};
```

- [ ] **Step 2: Create Home.clean.tsx**

```tsx
export default function Home() {
  return (
    <div className="flex justify-center items-center flex-col">
      <p>Welcome</p>
    </div>
  );
}
```

- [ ] **Step 3: Create Home.clean-with-auth.tsx**

```tsx
import { useAuth } from "@/context/auth/useAuth";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex justify-center items-center flex-col">
      <p>Welcome{user?.displayName ? `, ${user.displayName}` : ""}</p>
    </div>
  );
}
```

- [ ] **Step 4: Create frontend/src/utils/logger.clean.ts**

Console-only logger with the same interface:

```typescript
class LoggerService {
  private static instance: LoggerService;

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public initialize() {}

  public logError(error: unknown, context?: Record<string, string>) {
    console.error(error, context);
  }

  public logWarning(message: string, context?: Record<string, string>) {
    console.warn(message, context);
  }

  public logInfo(message: string, context?: Record<string, string>) {
    console.info(message, context);
  }

  public setUser(_id: string, _email?: string, _username?: string) {}

  public setExtra(_key: string, _value: string | number) {}

  public setTag(_key: string, _value: string) {}
}

export const logger = LoggerService.getInstance();
```

- [ ] **Step 5: Create server/services/logger/loggerService.clean.ts**

Console-only logger with the same interface:

```typescript
class LoggerService {
  private static instance: LoggerService;
  private initialized = false;

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }

  // eslint-disable-next-line no-console -- logging
  public logInfo(event: string, context?: Record<string, string>) {
    console.info(event, context);
  }

  // eslint-disable-next-line no-console -- logging
  public logWarning(event: string, context?: Record<string, string>) {
    console.warn(event, context);
  }

  // eslint-disable-next-line no-console -- logging
  public logUserEvent(
    event: string,
    _userId: string,
    context?: Record<string, string>,
  ) {
    console.log(event, context);
  }

  // eslint-disable-next-line no-console -- logging
  public logError(error: unknown, context?: Record<string, string>) {
    console.error(error, context);
  }

  public setUser(_id: string, _email?: string, _username?: string) {}

  public setExtra(_key: string, _value: string | number) {}

  public setTag(_key: string, _value: string) {}
}

export const loggerService = LoggerService.getInstance();
loggerService.initialize();
```

- [ ] **Step 6: Verify clean variants compile**

Run type checks to ensure clean variants have no import errors:

Run: `cd frontend && bun run check-types && cd ../server && bun run check-types`

Note: Clean variants won't be imported by anything yet — just verify they have no syntax errors by checking that `bun build --no-bundle` doesn't fail on them individually.

```bash
git add -A && git commit -m "feat: add clean file variants for init script"
```

---

## Task 4: Build init script — core helpers

**Files:**

- Create: `scripts/init.ts`
- Create: `scripts/init.test.ts`

This task builds the utility functions. Task 5 adds the interactive flow and orchestration.

- [ ] **Step 1: Write test for removeMarkerBlocks**

Create `scripts/init.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { removeMarkerBlocks, replaceScope, uncommentMarkerBlock } from "./init";

describe("removeMarkerBlocks", () => {
  test("removes content between markers inclusive", () => {
    const input = `line1
// @init:firebase-start
firebase code
// @init:firebase-end
line2`;
    const result = removeMarkerBlocks(input, "firebase");
    expect(result).toBe("line1\nline2");
  });

  test("removes JSX comment markers", () => {
    const input = `<StrictMode>
    {/* @init:firebase-start */}
    <AuthProvider>
    {/* @init:firebase-end */}
      <App />
    {/* @init:firebase-start */}
    </AuthProvider>
    {/* @init:firebase-end */}
</StrictMode>`;
    const result = removeMarkerBlocks(input, "firebase");
    expect(result).toBe(`<StrictMode>
      <App />
</StrictMode>`);
  });

  test("handles multiple blocks of same feature", () => {
    const input = `a
// @init:firebase-start
b
// @init:firebase-end
c
// @init:firebase-start
d
// @init:firebase-end
e`;
    const result = removeMarkerBlocks(input, "firebase");
    expect(result).toBe("a\nc\ne");
  });

  test("returns unchanged if no markers found", () => {
    const input = "no markers here";
    const result = removeMarkerBlocks(input, "firebase");
    expect(result).toBe("no markers here");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Shared/code/stack-template && bun test scripts/init.test.ts`
Expected: FAIL — `init.ts` doesn't export these functions yet.

- [ ] **Step 3: Implement removeMarkerBlocks**

In `scripts/init.ts`:

```typescript
import {
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
  statSync,
  renameSync,
} from "node:fs";
import { join, basename, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

export function removeMarkerBlocks(content: string, feature: string): string {
  const tsPattern = new RegExp(
    `^[ \\t]*\\/\\/ @init:${feature}-start\\s*\\n[\\s\\S]*?^[ \\t]*\\/\\/ @init:${feature}-end\\s*\\n?`,
    "gm",
  );
  let result = content.replace(tsPattern, "");

  const jsxPattern = new RegExp(
    `^[ \\t]*\\{/\\* @init:${feature}-start \\*/\\}\\s*\\n[\\s\\S]*?^[ \\t]*\\{/\\* @init:${feature}-end \\*/\\}\\s*\\n?`,
    "gm",
  );
  result = result.replace(jsxPattern, "");

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function uncommentMarkerBlock(content: string, feature: string): string {
  const pattern = new RegExp(
    `^[ \\t]*\\/\\/ @init:${feature}-start\\s*\\n([\\s\\S]*?)^[ \\t]*\\/\\/ @init:${feature}-end\\s*\\n?`,
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test scripts/init.test.ts`
Expected: PASS

- [ ] **Step 5: Write test for replaceScope**

Add to `scripts/init.test.ts`:

```typescript
describe("replaceScope", () => {
  test("replaces all occurrences of scope", () => {
    const input = `import { foo } from '@sandilya-stack/shared/types';
import { bar } from '@sandilya-stack/shared/config/eslint';`;
    const result = replaceScope(input, "@sandilya-stack", "@my-app");
    expect(result).toBe(`import { foo } from '@my-app/shared/types';
import { bar } from '@my-app/shared/config/eslint';`);
  });

  test("replaces in JSON content", () => {
    const input = `"name": "@sandilya-stack/frontend"`;
    const result = replaceScope(input, "@sandilya-stack", "@cool-app");
    expect(result).toBe(`"name": "@cool-app/frontend"`);
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test scripts/init.test.ts`
Expected: PASS

- [ ] **Step 7: Write test for uncommentMarkerBlock**

Add to `scripts/init.test.ts`:

```typescript
describe("uncommentMarkerBlock", () => {
  test("uncomments lines within marker block", () => {
    const input = `// @init:no-firebase-start
// const client = hc<ApiRoutes>(baseUrl);
// @init:no-firebase-end`;
    const result = uncommentMarkerBlock(input, "no-firebase");
    expect(result).toBe("const client = hc<ApiRoutes>(baseUrl);\n");
  });
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `bun test scripts/init.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add scripts/init.ts scripts/init.test.ts && git commit -m "feat: add init script core helpers with tests"
```

---

## Task 5: Build init script — file operation helpers

**Files:**

- Modify: `scripts/init.ts`
- Modify: `scripts/init.test.ts`

- [ ] **Step 1: Write test for removeFiles and removeDirs**

Add to `scripts/init.test.ts`:

```typescript
import {
  mkdirSync,
  writeFileSync as fsWrite,
  existsSync,
  rmSync as fsRm,
} from "node:fs";
import { join } from "node:path";
import {
  removeFiles,
  removeDirs,
  replaceFile,
  removeFeatureMarkers,
} from "./init";

describe("removeFiles", () => {
  const tmpDir = join(import.meta.dir, ".test-tmp");

  test("removes listed files", () => {
    mkdirSync(tmpDir, { recursive: true });
    const f1 = join(tmpDir, "a.ts");
    const f2 = join(tmpDir, "b.ts");
    fsWrite(f1, "content");
    fsWrite(f2, "content");

    removeFiles([f1, f2]);
    expect(existsSync(f1)).toBe(false);
    expect(existsSync(f2)).toBe(false);

    fsRm(tmpDir, { recursive: true, force: true });
  });

  test("skips non-existent files without error", () => {
    expect(() => removeFiles(["/nonexistent/file.ts"])).not.toThrow();
  });
});

describe("removeDirs", () => {
  const tmpDir = join(import.meta.dir, ".test-tmp-dirs");

  test("removes listed directories recursively", () => {
    const subDir = join(tmpDir, "sub");
    mkdirSync(subDir, { recursive: true });
    fsWrite(join(subDir, "file.ts"), "content");

    removeDirs([tmpDir]);
    expect(existsSync(tmpDir)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test scripts/init.test.ts`
Expected: FAIL — functions not exported yet.

- [ ] **Step 3: Implement file operation helpers**

Add to `scripts/init.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test scripts/init.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/init.ts scripts/init.test.ts && git commit -m "feat: add init script file operation helpers"
```

---

## Task 6: Build init script — feature removal logic

**Files:**

- Modify: `scripts/init.ts`
- Modify: `scripts/init.test.ts`

- [ ] **Step 1: Implement feature removal functions**

Add to `scripts/init.ts`:

```typescript
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
```

- [ ] **Step 2: Write test for removeDocker (simplest feature removal)**

Add to `scripts/init.test.ts`:

```typescript
import { removeDocker } from "./init";

describe("removeDocker", () => {
  const tmpDir = join(import.meta.dir, ".test-docker");

  test("removes docker-related files and dirs", () => {
    mkdirSync(join(tmpDir, "deployments"), { recursive: true });
    fsWrite(join(tmpDir, "Dockerfile.frontend"), "FROM node");
    fsWrite(join(tmpDir, "Dockerfile.server"), "FROM node");
    fsWrite(join(tmpDir, "railway.json"), "{}");
    fsWrite(join(tmpDir, ".dockerignore"), "*");
    fsWrite(join(tmpDir, "deployments/nginx.conf"), "server {}");

    removeDocker(tmpDir);

    expect(existsSync(join(tmpDir, "Dockerfile.frontend"))).toBe(false);
    expect(existsSync(join(tmpDir, "Dockerfile.server"))).toBe(false);
    expect(existsSync(join(tmpDir, "railway.json"))).toBe(false);
    expect(existsSync(join(tmpDir, ".dockerignore"))).toBe(false);
    expect(existsSync(join(tmpDir, "deployments"))).toBe(false);

    fsRm(tmpDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `bun test scripts/init.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add scripts/init.ts scripts/init.test.ts && git commit -m "feat: add feature removal functions to init script"
```

---

## Task 7: Build init script — scope rename and domain update

**Files:**

- Modify: `scripts/init.ts`
- Modify: `scripts/init.test.ts`

- [ ] **Step 1: Implement scope rename orchestration**

Add to `scripts/init.ts`:

```typescript
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
```

- [ ] **Step 2: Write test for updateDomain**

Add to `scripts/init.test.ts`:

```typescript
import { updateDomain, updateProjectName } from "./init";

describe("updateDomain", () => {
  const tmpDir = join(import.meta.dir, ".test-domain");

  test("replaces domain in server/app.ts", () => {
    mkdirSync(join(tmpDir, "server"), { recursive: true });
    fsWrite(
      join(tmpDir, "server/app.ts"),
      `if (origin.endsWith('.sandilya.dev')) {`,
    );

    updateDomain(tmpDir, "myapp.dev");

    const content = Bun.file(join(tmpDir, "server/app.ts")).text();
    expect(content).resolves.toContain(".myapp.dev");
    expect(content).resolves.not.toContain(".sandilya.dev");

    fsRm(tmpDir, { recursive: true, force: true });
  });

  test("replaces domain in frontend/index.html", () => {
    mkdirSync(join(tmpDir, "frontend"), { recursive: true });
    fsWrite(
      join(tmpDir, "frontend/index.html"),
      `<meta property="og:url" content="https://sandilya.dev" />
<meta property="twitter:domain" content="sandilya.dev" />`,
    );

    updateDomain(tmpDir, "cool.app");

    const content = Bun.file(join(tmpDir, "frontend/index.html")).text();
    expect(content).resolves.toContain("cool.app");
    expect(content).resolves.not.toContain("sandilya.dev");

    fsRm(tmpDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `bun test scripts/init.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add scripts/init.ts scripts/init.test.ts && git commit -m "feat: add scope rename and domain update to init script"
```

---

## Task 8: Build init script — doc generation

**Files:**

- Modify: `scripts/init.ts`
- Create: `docs/ai/patterns.md`
- Modify: `CLAUDE.md`
- Modify: `docs/ai/frontend.md`
- Modify: `docs/ai/server.md`
- Modify: `docs/ai/shared.md`

- [ ] **Step 1: Create docs/ai/patterns.md**

This is the core reference doc. Write the full content with all 9 pattern sections as described in the spec. Each section has a short code snippet. Use `@init:` markers for feature-conditional sections.

```markdown
# Development Patterns

Reference guide for adding features to this codebase. Each section shows the pattern with a concrete code snippet.

## 1. Adding a Zod Schema

Create a new file in `shared/types/`:

\`\`\`typescript
// shared/types/myFeature.ts
import { z } from 'zod';

export const createMyFeatureSchema = z.object({
name: z.string().min(1),
description: z.string().optional(),
});

export const updateMyFeatureSchema = createMyFeatureSchema.partial();

export const myFeatureIdSchema = z.object({
id: z.string().min(1),
});

export type CreateMyFeature = z.infer<typeof createMyFeatureSchema>;
export type UpdateMyFeature = z.infer<typeof updateMyFeatureSchema>;
\`\`\`

Then export from the barrel file:

\`\`\`typescript
// shared/types/index.ts
export \* from "./myFeature";
\`\`\`

The schemas are now available to both frontend and server via the shared package.

## 2. Adding a Route

Create a route file in `server/routes/`:

\`\`\`typescript
// server/routes/myFeature.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createMyFeatureSchema, myFeatureIdSchema } from '@sandilya-stack/shared/types';

const myFeatureRoute = new Hono()
.get('/', async c => {
// list items
return c.json({ items: [] });
})
.post('/', zValidator('json', createMyFeatureSchema), async c => {
const data = c.req.valid('json');
// create item
return c.json({ created: data }, 201);
})
.get('/:id', zValidator('param', myFeatureIdSchema), async c => {
const { id } = c.req.valid('param');
// get item by id
return c.json({ id });
});

export { myFeatureRoute };
\`\`\`

Register in `server/app.ts`:

\`\`\`typescript
const apiRoutes = app
.get('/health', c => c.text('OK', 201))
.basePath('/api')
.route('/my-feature', myFeatureRoute);
\`\`\`

<!-- @init:firebase-start -->

## 3. Adding a Service (Firestore)

Create a service directory under `server/services/`:

\`\`\`
server/services/myFeature/
index.ts - exports
service.ts - business logic
types.ts - service-specific types
collection.ts - Firestore collection reference
\`\`\`

\`\`\`typescript
// server/services/myFeature/collection.ts
import { getCollection } from '../firebase';

export const myFeatureCollection = getCollection('myFeatures');
\`\`\`

\`\`\`typescript
// server/services/myFeature/service.ts
import { myFeatureCollection } from './collection';
import type { CreateMyFeature } from '@sandilya-stack/shared/types';

export async function createMyFeature(userId: string, data: CreateMyFeature) {
return myFeatureCollection.add({ ...data, userId, createdAt: new Date().toISOString() });
}

export async function listMyFeatures(userId: string) {
return myFeatureCollection.where('userId', '==', userId).get();
}
\`\`\`

\`\`\`typescript
// server/services/myFeature/index.ts
export { createMyFeature, listMyFeatures } from './service';
\`\`\`

<!-- @init:firebase-end -->

<!-- @init:no-firebase-start -->

## 3. Adding a Service

Create a service directory under `server/services/`:

\`\`\`
server/services/myFeature/
index.ts - exports
service.ts - business logic
types.ts - service-specific types
\`\`\`

\`\`\`typescript
// server/services/myFeature/service.ts
import type { CreateMyFeature } from '@sandilya-stack/shared/types';

export async function createMyFeature(data: CreateMyFeature) {
// wire to your data layer here
}

export async function listMyFeatures() {
// query your data layer
}
\`\`\`

\`\`\`typescript
// server/services/myFeature/index.ts
export { createMyFeature, listMyFeatures } from './service';
\`\`\`

<!-- @init:no-firebase-end -->

## 4. Adding a Typed API Call

Create an API function in `frontend/src/api/`:

\`\`\`typescript
// frontend/src/api/myFeature.ts
import { api } from './client';

export async function listMyFeatures() {
const res = await api['my-feature'].$get();
if (!res.ok) throw new Error('Failed to fetch');
return res.json();
}

export async function createMyFeature(data: { name: string }) {
const res = await api['my-feature'].$post({ json: data });
if (!res.ok) throw new Error('Failed to create');
return res.json();
}
\`\`\`

Types flow automatically from the server route definitions through the Hono client.

## 5. Adding a Page

Create the page component:

\`\`\`typescript
// frontend/src/pages/MyFeature.tsx
export default function MyFeature() {
return <div>My Feature</div>;
}
\`\`\`

Add to router in `frontend/src/App.tsx` with lazy loading:

\`\`\`typescript
const MyFeature = lazy(() => import('./pages/MyFeature'));

// Inside Routes:
<Route path="/my-feature" element={<MyFeature />} />
\`\`\`

## 6. Adding a Component

Use shadcn CLI for UI primitives:

\`\`\`bash
npx shadcn@latest add <component-name>
\`\`\`

Components are added to `frontend/src/components/ui/`. For custom components, create them directly in `frontend/src/components/`.

## 7. Writing Tests (Server)

Server tests use `bun:test`. Create tests in `server/__tests__/`:

\`\`\`typescript
// server/**tests**/routes/myFeature.test.ts
import { describe, expect, test } from 'bun:test';
import app from '../../app';

describe('GET /api/my-feature', () => {
test('returns list of items', async () => {
const res = await app.request('/api/my-feature', {
headers: { Authorization: 'Bearer test-token' },
});
expect(res.status).toBe(200);
const body = await res.json();
expect(body).toHaveProperty('items');
});
});
\`\`\`

<!-- @init:firebase-start -->

Auth is mocked in `server/__tests__/setup.ts` — tests automatically get a mock user context.

<!-- @init:firebase-end -->

Run: `cd server && bun test`
Watch mode: `cd server && bun test --watch`

## 8. Writing Tests (Frontend)

Frontend tests use Vitest + React Testing Library. Create tests in `frontend/src/__tests__/`:

\`\`\`typescript
// frontend/src/**tests**/pages/MyFeature.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import MyFeature from '../../pages/MyFeature';

describe('MyFeature', () => {
test('renders the page', () => {
render(<MyFeature />);
expect(screen.getByText('My Feature')).toBeInTheDocument();
});
});
\`\`\`

Run: `cd frontend && bun run test`
Watch mode: `cd frontend && bun run test:watch`
Coverage: `cd frontend && bun run test:coverage`

## 9. Full Feature Pattern

End-to-end flow for adding a complete feature:

1. Define Zod schema in `shared/types/` (Section 1)
2. Write failing route test (Section 7)
3. Create route in `server/routes/` (Section 2)
4. Create service in `server/services/` (Section 3)
5. Wire route to service, make test pass
6. Create typed API call in `frontend/src/api/` (Section 4)
7. Write failing page test (Section 8)
8. Create page in `frontend/src/pages/` (Section 5)
9. Wire page to API call, make test pass
10. Register route in `App.tsx` (Section 5)
11. Commit
```

- [ ] **Step 2: Implement doc generation function in init.ts**

Add to `scripts/init.ts`:

```typescript
export function regenerateDocs(root: string, config: InitConfig): void {
  if (!config.includeFirebase) {
    removeFeatureMarkers(join(root, "docs/ai/patterns.md"), "firebase");
    const patternsPath = join(root, "docs/ai/patterns.md");
    if (existsSync(patternsPath)) {
      let content = readFileSync(patternsPath, "utf-8");
      content = removeMarkerBlocks(content, "firebase");
      content = uncommentMarkerBlock(content, "no-firebase");
      content = removeMarkerBlocks(content, "no-firebase");
      writeFileSync(patternsPath, content);
    }
  } else {
    const patternsPath = join(root, "docs/ai/patterns.md");
    if (existsSync(patternsPath)) {
      let content = readFileSync(patternsPath, "utf-8");
      content = removeMarkerBlocks(content, "no-firebase");
      writeFileSync(patternsPath, content);
    }
  }

  generateClaudeMd(root, config);
  generateFrontendDoc(root, config);
  generateServerDoc(root, config);

  if (!config.includeFirebase) {
    removeFiles([join(root, "docs/ai/authentication.md")]);
  }
}
```

- [ ] **Step 3: Implement CLAUDE.md generation**

Add to `scripts/init.ts`:

```typescript
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
```

- [ ] **Step 4: Implement frontend doc generation**

Add to `scripts/init.ts`:

```typescript
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
```

- [ ] **Step 5: Implement server doc generation**

Add to `scripts/init.ts`:

```typescript
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
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add pattern documentation and doc generation to init script"
```

---

## Task 9: Build init script — env file generation

**Files:**

- Modify: `scripts/init.ts`

- [ ] **Step 1: Implement env file generation**

Add to `scripts/init.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/init.ts && git commit -m "feat: add env file generation to init script"
```

---

## Task 10: Build init script — interactive CLI and main orchestration

**Files:**

- Modify: `scripts/init.ts`

- [ ] **Step 1: Implement the interactive prompt system**

Add to `scripts/init.ts`:

```typescript
import { createInterface } from "node:readline/promises";

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
  const scope = await prompt(rl, "Package scope", `@${projectName}`);
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
```

- [ ] **Step 2: Implement the main orchestration function**

Add to `scripts/init.ts`:

```typescript
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

main().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Commit**

```bash
git add scripts/init.ts && git commit -m "feat: add interactive CLI and main orchestration to init script"
```

---

## Task 11: Create test matrix script

**Files:**

- Create: `scripts/test-init-matrix.sh`

- [ ] **Step 1: Write the matrix test script**

Create `scripts/test-init-matrix.sh`:

```bash
#!/bin/bash
set -e

TEMPLATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORK_DIR=$(mktemp -d)
PASS=0
FAIL=0
TOTAL=16

echo "Testing all 16 feature toggle combinations..."
echo "Template: $TEMPLATE_DIR"
echo "Work dir: $WORK_DIR"
echo ""

for firebase in true false; do
  for sentry in true false; do
    for sample in true false; do
      for docker in true false; do
        COMBO="firebase=$firebase sentry=$sentry sample=$sample docker=$docker"
        TEST_DIR="$WORK_DIR/test-fb${firebase}-s${sentry}-sa${sample}-d${docker}"

        echo "Testing: $COMBO"

        cp -r "$TEMPLATE_DIR" "$TEST_DIR"
        cd "$TEST_DIR"

        # Create a non-interactive config and run init programmatically
        bun -e "
          import { removeFirebase, removeSentry, removeSampleCode, removeDocker, renameScope, updateProjectName, updateDomain, generateEnvFiles, regenerateDocs, cleanupCleanVariants, cleanupRemainingMarkers } from './scripts/init.ts';
          const root = '$TEST_DIR';
          const config = {
            projectName: 'test-app',
            scope: '@test-app',
            domain: 'test.dev',
            includeFirebase: $firebase,
            includeSentry: $sentry,
            includeSampleCode: $sample,
            includeDocker: $docker,
          };
          if (!config.includeFirebase) removeFirebase(root);
          if (!config.includeSentry) removeSentry(root);
          if (!config.includeSampleCode) removeSampleCode(root, config.includeFirebase);
          if (!config.includeDocker) removeDocker(root);
          renameScope(root, config.scope);
          updateProjectName(root, config.projectName);
          updateDomain(root, config.domain);
          generateEnvFiles(root, config);
          regenerateDocs(root, config);
        " 2>&1

        if bun install --frozen-lockfile 2>/dev/null || bun install 2>&1; then
          if bun run test 2>&1; then
            echo "  ✅ PASS"
            PASS=$((PASS + 1))
          else
            echo "  ❌ FAIL (tests)"
            FAIL=$((FAIL + 1))
          fi
        else
          echo "  ❌ FAIL (install)"
          FAIL=$((FAIL + 1))
        fi

        echo ""
      done
    done
  done
done

echo "Results: $PASS/$TOTAL passed, $FAIL/$TOTAL failed"
rm -rf "$WORK_DIR"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/test-init-matrix.sh`

- [ ] **Step 3: Commit**

```bash
git add scripts/test-init-matrix.sh && git commit -m "feat: add init matrix test script for all 16 toggle combinations"
```

---

## Task 12: Integration testing and cleanup

**Files:**

- All modified files from previous tasks

- [ ] **Step 1: Run bun install and verify no errors**

Run: `bun install`
Expected: Clean install, no resolution errors.

- [ ] **Step 2: Run all existing tests**

Run: `bun run test`
Expected: All tests pass. The markers and clean variants should not affect existing behavior.

- [ ] **Step 3: Run the init script tests**

Run: `bun test scripts/init.test.ts`
Expected: All unit tests pass.

- [ ] **Step 4: Test a dry run**

Run: `bun run init -- --dry-run`

Interact with prompts (use test values), verify the dry run output shows what would change without modifying files.

- [ ] **Step 5: Run format and type checks**

Run: `bun run format`
Run: `cd frontend && bun run check-types && cd ../server && bun run check-types`
Expected: No errors.

- [ ] **Step 6: Verify no template-specific naming in output**

Run a quick grep to ensure markers are properly placed:

```bash
grep -r "@init:" --include="*.ts" --include="*.tsx" --include="*.md" . | grep -v node_modules | grep -v scripts/init
```

Expected: Shows all marker locations in source files.

- [ ] **Step 7: Final commit**

```bash
git add -A && git commit -m "chore: integration testing and cleanup"
```

---

## Task 13: Remove docs/superpowers directory

**Files:**

- Delete: `docs/superpowers/` (spec and plan served their purpose, not needed in template)

- [ ] **Step 1: Remove superpowers docs**

Delete the entire `docs/superpowers/` directory. These are design/planning artifacts that should not ship with the template.

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore: remove design artifacts from template"
```

---

## Task 14: Final verification — end-to-end test

- [ ] **Step 1: Clone to a temp directory and run init**

```bash
TMPDIR=$(mktemp -d)
cp -r . "$TMPDIR/test-project"
cd "$TMPDIR/test-project"
bun install
bun run init
```

Walk through the prompts with test values. Verify:

- All prompts work
- Summary is accurate
- No errors during execution
- Tests pass
- Git history is clean (single commit)
- No traces of `sandilya-stack` or `sandilya.dev`

- [ ] **Step 2: Verify CLAUDE.md and docs are correct**

Read the generated CLAUDE.md and docs/ai/ files. Verify they accurately reflect the selected features.

- [ ] **Step 3: Clean up temp directory**

```bash
rm -rf "$TMPDIR"
```

- [ ] **Step 4: Return to original directory and push**

```bash
cd /Users/Shared/code/stack-template
git push -u origin feat/template-init-overhaul
```
