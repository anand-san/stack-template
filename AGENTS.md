# Repository Guidelines

## Project Structure & Module Organization

This repository is a Bun workspace monorepo with three packages:

- `frontend/`: React 19 + Vite + Tailwind app. Main code is in `frontend/src` (`components/`, `pages/`, `context/`, `hooks/`, `api/`), static assets in `frontend/public`.
- `server/`: Hono API running on Bun. Core areas include `routes/`, `middlewares/`, `services/`, and `custom-modules/`.
- `shared/`: shared types and base configs (`shared/types`, `shared/config`).

Build output goes to `dist/`. Project docs live under `docs/`.

## Build, Test, and Development Commands

Use Bun (not npm):

- `bun install`: install workspace dependencies.
- `bun run dev`: run frontend and server together.
- `bun run frontend:dev` / `bun run server:dev`: run a single app.
- `bun run build`: build all packages.
- `bun run test`: run server and frontend tests.
- `bun run lint`: run Prettier checks + ESLint.
- `bun run format`: apply Prettier + ESLint fixes.
- `cd frontend && bun run check-types`
- `cd server && bun run check-types`

## Coding Style

### IMPORTANT

- TypeScript is strict; keep types explicit and avoid `any`.
- Formatting/linting is enforced with Prettier + ESLint (root and package configs). Run formatting and type checks before opening a PR.

- Run `bun run format` once a task is complete
- Commit small changes iteratively

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
