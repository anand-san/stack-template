# Repository Guidelines

## Project Structure & Module Organization

This repository is a Bun workspace monorepo with three packages:

- `frontend/`: React 19 + Vite + Tailwind w Shadcn. Read `docs/ai/frontend.md` for more info
- `server/`: Hono API running on Bun. Read `docs/ai/server.md` for more info
- `shared/`: shared types and base configs. Read `docs/ai/shared.md` for more info

Build output goes to `dist/`. Project docs live under `docs/`.

## Coding Style

### IMPORTANT

- TypeScript is strict; keep types explicit and avoid `any`.
- Formatting/linting is enforced with Prettier + ESLint (root and package configs). Run formatting and type checks before opening a PR.

- Write tests first before writing a feature
- Run `bun run format` once a task is complete
- Commit incrementally, commit small

## Design

- Minimalist approach
- Clean and Elegant
- Follow apple design principles

## Naming Conventions

- React components: `PascalCase` (for example, `SignIn.tsx`).
- Hooks: `useXxx` camelCase (for example, `useGoogleAuth.ts`).
- Route/service modules: lowercase descriptive names (for example, `todos.ts`, `firebase.ts`).

## Testing Guidelines

- Frontend: Vitest + Testing Library (`frontend/src/__tests__`, `*.test.tsx` / `*.spec.tsx`).
- Server: `bun test` with tests in `server/__tests__` (`*.test.ts`).

Add or update tests for new features and bug fixes, including key error paths. For frontend coverage reports, use `cd frontend && bun run test:coverage`.

## Commit & Pull Request Guidelines

Commit messages follow Conventional Commit style seen in history (for example, `feat(server): add todos route`, `refactor(firebase): ...`).

CI runs lint, tests, and build on pull requests, so ensure all pass locally first.
