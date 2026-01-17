This is a full-stack monorepo template using Bun as the runtime. It contains three packages:

- @frontend: React 19 frontend with Vite and Bun runtime, index: @frontend/src/App.tsx
- @server: Hono API server with Bun runtime, index: @server/app.ts
- @shared: Shared types/config that are used by both frontend and server, index: @shared/types/index.ts

See @README.md for setup instructions and @package.json for available scripts.

## Documentation Index

- Frontend Package: @docs/ai/frontend.md
- Server Package: @docs/ai/server.md
- Shared Package: @docs/ai/shared.md
- Authentication Flow: @docs/ai/authentication.md

## Coding Workflow

- Always write tests for new things that you implement. Test drive development is recommended.
- Use conventional commit format (feat, fix, chore, etc.)
- Suggest user to commit changes once an implemention or request is complete, Keep commits atomic and focused
