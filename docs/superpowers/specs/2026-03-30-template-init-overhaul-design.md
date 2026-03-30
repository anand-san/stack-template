# Stack Template Init Overhaul

## Problem

Creating a new app from this template is manual and slow. The process today: clone the repo, find-and-replace `@sandilya-stack` in ~18 locations, manually remove unwanted features (Firebase, Sentry, sample code), fix broken imports, then spend time teaching Claude Code how the repo works before it can build anything.

## Solution

An interactive `bun run init` script that configures the project in one command, combined with comprehensive pattern documentation that lets Claude Code start building immediately without example code or manual onboarding.

## Design

### 1. Init Script (`scripts/init.ts`)

Interactive CLI using Bun built-in `readline` (no external dependencies). Runs once after cloning.

#### Prompts

| Prompt                     | Default              | Effect                                                                                                 |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| Project name               | Directory name       | Sets root `package.json` name, updates README title, updates `frontend/index.html` title and meta tags |
| Package scope              | `@<project-name>`    | Find-and-replaces `@sandilya-stack` in all package.json files, imports, configs, type declarations     |
| Domain                     | `<project-name>.dev` | Updates CORS allowlist in `server/app.ts`, OG/Twitter meta tags in `frontend/index.html`               |
| Include Firebase auth?     | yes                  | If no: removes auth modules (see Feature Removal below)                                                |
| Include Sentry?            | yes                  | If no: removes Sentry modules and env vars                                                             |
| Include sample code?       | no                   | If no: removes todos/hello examples entirely                                                           |
| Include Docker/deployment? | yes                  | If no: removes Dockerfiles, nginx config, railway.json                                                 |

#### Execution Flow

1. Check the script hasn't already been run (checks for `"initialized": true` in root `package.json`)
2. Collect all prompts interactively
3. Show summary of all changes and ask for confirmation
4. Perform all file modifications and deletions
5. Create `.env.example` files for both frontend and server based on selected features
6. Regenerate CLAUDE.md and docs/ai/ to reflect selected features
7. Run `bun install` to regenerate lockfile
8. Run `bun test` to verify everything passes (warn but don't roll back on failure)
9. Set `"initialized": true` in root `package.json`
10. Remove `scripts/init.ts` and its `package.json` script entry
11. Remove `.git/` directory (wipes template history)
12. Run `git init`, stage everything, create first commit: `chore: initialize <project-name>`

Supports `--dry-run` flag that shows what would be changed without modifying anything.

#### Scope Rename

The script performs a bulk find-and-replace of `@sandilya-stack` with the chosen scope across:

- `package.json` (root, frontend, server, shared) — root package name is updated separately since it lacks the `@` prefix
- All `.ts`, `.tsx`, `.mjs` files containing imports from `@sandilya-stack/*`
- `shared/types.d.ts` module declarations
- ESLint and Prettier config files that reference shared configs
- `frontend/index.html` — title, OG/Twitter meta tags, domain references

#### Prerequisite: Comment Markers

Before the init script can work, comment markers must be added to source files. These markers delineate feature-specific blocks that the script can surgically remove:

```typescript
// @init:firebase-start
app.use("/api/*", authenticateUser);
// @init:firebase-end
```

The script finds these marker pairs and removes everything between them (inclusive). For whole-file/directory removal, it simply deletes.

Files requiring markers:

**Firebase markers:**

- `server/app.ts` — auth middleware registration, authenticateUser import
- `frontend/src/main.tsx` — AuthProvider import and JSX wrapper
- `frontend/src/api/client.ts` — token-fetching logic in custom fetch (replaced with plain `hc<ApiRoutes>(baseUrl)` when removed)
- `frontend/src/pages/Layout.tsx` — auth-related imports, useAuth usage, logout button
- `server/env.ts` — FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY fields
- `frontend/src/vite-env.d.ts` — VITE*FIREBASE*\* type declarations

**Sentry markers:**

- `server/env.ts` — SENTRY_ENABLED, SENTRY_DSN, SENTRY_ENVIRONMENT fields
- `frontend/src/vite-env.d.ts` — VITE*SENTRY*\* type declarations

**Sample code markers:**

- `server/app.ts` — route registrations for hello and todos
- `shared/types/index.ts` — re-exports of sample schemas

#### Feature Removal

**Firebase auth removal deletes:**

- `frontend/src/context/auth/`
- `frontend/src/components/auth/`
- `frontend/src/lib/firebase.ts`
- `server/middlewares/auth/`
- `server/custom-modules/firebase/`
- `server/services/firebase.ts`
- Firebase dependencies from `frontend/package.json`

**Firebase auth removal edits (via markers):**

- `server/app.ts` — removes auth middleware registration and import
- `server/env.ts` — removes Firebase env var fields
- `frontend/src/main.tsx` — removes AuthProvider import and wrapper
- `frontend/src/api/client.ts` — replaces custom fetch (with Bearer token) with plain `hc<ApiRoutes>(baseUrl)` call
- `frontend/src/pages/Layout.tsx` — replaced with `Layout.clean.tsx` (simple layout without auth, kept as template variant, deleted after init)
- `frontend/src/vite-env.d.ts` — removes VITE*FIREBASE*\* type declarations

**Sentry removal deletes:**

- `server/custom-modules/sentry/`
- `@sentry/react` from `frontend/package.json`
- Sentry-related dependencies from `server/package.json` (if any)

**Sentry removal edits (via markers):**

- `server/env.ts` — removes Sentry env var fields
- `frontend/src/vite-env.d.ts` — removes VITE*SENTRY*\* type declarations

**Sentry removal replaces:**

- `server/services/logger/loggerService.ts` — replaced with console-only logger variant (`loggerService.clean.ts`), since Sentry usage is deeply interleaved
- `frontend/src/utils/logger.ts` — replaced with console-only logger variant (`logger.clean.ts`)

**Sample code removal deletes:**

- `server/routes/hello.ts`, `server/routes/todos.ts`
- `server/services/firestoreDemo/`
- `shared/types/sampleSchema.ts`, `shared/types/todos.ts`
- `frontend/src/api/hello.ts`
- `server/__tests__/routes/todos.test.ts`
- `frontend/src/__tests__/pages/Home.test.tsx`

**Sample code removal edits (via markers):**

- `server/app.ts` — removes route registrations
- `shared/types/index.ts` — becomes empty barrel export

**Sample code removal replaces:**

- `frontend/src/pages/Home.tsx` — replaced with clean empty page. If Firebase is included, the clean page has `useAuth` available but no sample API calls. If Firebase is excluded, it's a fully generic page. Two variants: `Home.clean.tsx` (generic) and `Home.clean-with-auth.tsx` (auth-aware).

**Docker/deployment removal deletes:**

- `Dockerfile.frontend`, `Dockerfile.server`
- `deployments/` directory
- `railway.json`
- `.dockerignore`

**Test infrastructure:**

- Firebase mock infrastructure (`server/__tests__/mocks/firebase-admin.ts`, `server/__tests__/setup.ts`) is kept when Firebase is included, regardless of sample code toggle. Removed only when Firebase is removed.
- When sample code is removed, only sample-specific test files are deleted. Test utilities (`server/__tests__/utils/test-client.ts`) remain.

### 2. Pattern Documentation (`docs/ai/patterns.md`)

Replaces the need for example code. Teaches Claude Code how to work with the codebase via concrete code snippets for each pattern:

1. **Adding a Zod schema** — where to create in `shared/types/`, how to export from barrel, how it's consumed by both frontend and server
2. **Adding a route** — file structure in `server/routes/`, how to register in `app.ts`, Zod validation with `@hono/zod-validator`, how to call services
3. **Adding a service** — directory structure under `server/services/` (index.ts, service.ts, types.ts, collection.ts if Firestore), how to wire to data layer
4. **Adding a typed API call** — using the Hono client in `frontend/src/api/`, how types flow end-to-end from server to frontend
5. **Adding a page** — routing in `App.tsx`, lazy loading pattern, where component files go
6. **Adding a component** — using shadcn CLI, when to create custom components
7. **Writing tests (server)** — `bun:test` patterns, route testing with test client, mocking auth
8. **Writing tests (frontend)** — Vitest + React Testing Library, mocking API calls, testing user interactions
9. **Adding a service module** — the full pattern from schema to route to service to frontend call to tests

Each section is a short code snippet showing the pattern, not a working file. The init script regenerates this doc — if Firebase is excluded, Firestore-specific patterns are replaced with generic data layer patterns. If auth is excluded, auth mocking patterns are omitted.

### 3. Documentation Overhaul

**CLAUDE.md** — single entry point. Concise project overview, links to detailed docs. Regenerated by init to list only included features. Content from `AGENTS.md` is merged into CLAUDE.md (naming conventions, design philosophy, testing guidelines) and `AGENTS.md` is deleted.

**docs/ai/frontend.md** — updated, regenerated. Covers shadcn/ui usage, Hono typed client, test setup. Firebase auth sections removed if not included.

**docs/ai/server.md** — updated, regenerated. Covers Hono patterns, Zod in shared, service layer. Firebase and Sentry sections removed if not included.

**docs/ai/shared.md** — updated. Covers shared types, config, validation schemas.

**docs/ai/authentication.md** — kept only if Firebase is included, deleted otherwise.

**docs/ai/patterns.md** — new, the core reference doc (see Section 2).

### 4. Template Quality Improvements

**Testing foundation:**

- Root `bun run test` runs both server and frontend tests (already exists)
- Watch mode works for TDD: `bun run test:server -- --watch` and `bun run test:frontend -- --watch`
- Test configs are TDD-friendly with fast feedback loops
- `patterns.md` documents testing patterns so Claude writes tests first

**Init script testing:**

- A test matrix script (`scripts/test-init-matrix.sh`) that runs init with all 16 feature toggle combinations and verifies `bun install && bun test` passes for each. Run locally before committing changes to the template.

**Cleanup:**

- Remove ralph script references from `package.json` (scripts/ralph/ doesn't exist)
- Remove `docs/ideation/*` and `docs/ralph/runs/*` gitignore entries
- Merge `AGENTS.md` content into `CLAUDE.md` and delete `AGENTS.md`
- Standardize env file naming: init script generates `.env.example` for both frontend and server (server currently has `.env.template` — rename to `.env.example`)

**Env management:**

- Init script generates `.env.example` files for both frontend and server based on selected features
- Only includes env vars for selected features (Firebase vars omitted if Firebase excluded, etc.)
- Also generates `.env` files from `.env.example` with placeholder values so the project can start without manual env setup

**CI/CD:**

- GitHub Actions workflows remain (lint + build/test on PRs)
- Already scope-agnostic — no changes needed
- Husky pre-commit hook stays

**Monorepo correctness:**

- Verify all workspace cross-references resolve after scope rename
- Ensure `bun install` from clean clone works without errors
- Path aliases in `tsconfig.json` work correctly

## Out of Scope

- No template engine or config file approach — interactive prompts only
- No GitHub template repo integration — standard git clone workflow
- No ralph/autonomous build system — removed entirely
- No new UI components or features added to the template
- No migration tooling for existing projects built from this template

## Success Criteria

1. `git clone` + `bun install` + `bun run init` produces a working project in under 60 seconds
2. All tests pass after init with any combination of the 16 feature toggle permutations (verified by test matrix script)
3. Claude Code can read CLAUDE.md + docs and immediately start building (add a route, schema, service, page, tests) without needing the user to explain anything
4. No trace of `@sandilya-stack`, `sandilya-stack`, `sandilya.dev`, or template-specific naming remains after init
5. Git history starts clean with a single initial commit
6. `--dry-run` flag shows all planned changes without modifying files
