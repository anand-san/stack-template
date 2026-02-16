---
description: "This doc provides details about the frontend package that the monorepo uses."
alwaysApply: false
---

- Frontend monorepo package is available under @frontend.
- Uses shadcn/ui with Radix primitives. Components are in @frontend/src/components/ui/. Add new shadcn components as needed using the shadcn cli. (npx shadcn@latest add <component-name>). Do not add any manual component unless required.
- Use Shadcn MCP server if needed to get more info on components and usage

## Type-Safe API Communication

- The frontend uses Hono's client (`hono/client`) with types exported from the server, providing end-to-end type safety:
  - Server exports `ApiRoutes` type from @server/app.ts
  - Frontend imports this type and creates a typed client in @frontend/src/api/client.ts
  - All API calls are fully typed without manual type definitions
  - Authentication header is automatically added to all API calls by the client.

### Tests

- Vitest with React Testing Library. Tests in @frontend/src/**tests**/.
- Always write tests for new things that you implement.
