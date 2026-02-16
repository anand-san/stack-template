---
description: "This doc provides details about the backend server which uses Hono API server running on Bun runtime."
alwaysApply: false
---

- Server monorepo package is available under @server.
- The backend is a Hono API server running on Bun runtime.
- When adding new API route schemas (using zod validators), Add them in @shared workspace package so that they are available to the frontend as well.
- Firebase usage: We do not use firebase npm package to save memory usage on prod and just use the APIs directly

### Tests

- Bun test runner with bun:test. Tests in @server/\_\_tests\_\_/.
