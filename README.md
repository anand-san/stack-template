# Stack Template

A modern full-stack monorepo template using Bun, React 19, Hono, and Firebase. Scaffold new projects with a single command.

## Tech Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Runtime    | Bun 1.3                        |
| Frontend   | React 19 + Vite + Tailwind CSS |
| Backend    | Hono (HTTP framework)          |
| Validation | Zod                            |
| Database   | Firebase (Firestore)           |
| Auth       | Firebase Authentication        |
| UI         | shadcn/ui + Radix              |

## Quick Start

```bash
git clone git@github.com:anand-san/stack-template.git my-new-app
cd my-new-app
bun install
bun run init
```

The init script walks you through project setup:

- **Project name** and **package scope** — renames `@sandilya-stack` everywhere
- **Domain** — updates CORS config and meta tags
- **Firebase auth** — include or remove (auth context, middleware, Firebase client)
- **Sentry** — include or remove (error tracking, logger integration)
- **Sample code** — keep the todos/hello examples or start clean
- **Docker/deployment** — keep or remove Dockerfiles, nginx config, Railway config

After setup, you get a clean project with passing tests, tailored docs, and a fresh git history.

Use `bun run init -- --dry-run` to preview changes without modifying anything.

## Project Structure

```
├── frontend/     React 19 + Vite + Tailwind + shadcn/ui
├── server/       Hono API server running on Bun
├── shared/       Shared types, Zod schemas, and config
├── scripts/      Init script (removed after setup)
└── docs/ai/      Documentation for AI-assisted development
```

## Development

```bash
bun run dev          # Runs both frontend and server
bun run frontend:dev # Frontend only (port 5173)
bun run server:dev   # Server only (port 3000)
```

## Testing

```bash
bun run test         # Run all tests
bun run test:server  # Server tests only (bun:test)
bun run test:frontend # Frontend tests only (Vitest)
```

## Build

```bash
bun run build        # Builds both packages
```

Output:

- Frontend: `dist/frontend/` (static files)
- Server: `dist/index.js` (bundled)

## Environment Setup

After running `bun run init`, `.env` and `.env.example` files are generated for both `frontend/` and `server/` with the correct variables for your selected features. Update them with your actual credentials.

## Documentation

- `CLAUDE.md` — project overview and coding guidelines
- `docs/ai/patterns.md` — how to add routes, schemas, services, pages, and tests
- `docs/ai/frontend.md` — frontend architecture and testing
- `docs/ai/server.md` — server architecture and testing
- `docs/ai/authentication.md` — Firebase auth flow (if included)
