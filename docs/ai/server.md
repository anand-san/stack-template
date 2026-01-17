---
description: "This doc provides details about the backend server which uses Hono API server running on Bun runtime."
alwaysApply: false
---

- Server monorepo package is available under @server.
- The backend is a Hono API server running on Bun runtime.
- When adding new API route schemas (using zod validators), Add them in @shared workspace package so that they are available to the frontend as well.

### Tests

- Bun test runner with bun:test. Tests in @server/\_\_tests\_\_/.
