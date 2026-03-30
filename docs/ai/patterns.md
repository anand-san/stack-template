# Development Patterns

Reference guide for adding features to this codebase. Each section shows the pattern with a concrete code snippet.

## 1. Adding a Zod Schema

Create a new file in `shared/types/`:

```typescript
// shared/types/myFeature.ts
import { z } from "zod";

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
```

Then export from the barrel file:

```typescript
// shared/types/index.ts
export * from "./myFeature";
```

The schemas are now available to both frontend and server via the shared package.

## 2. Adding a Route

Create a route file in `server/routes/`:

```typescript
// server/routes/myFeature.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createMyFeatureSchema,
  myFeatureIdSchema,
} from "@sandilya-stack/shared/types";

const myFeatureRoute = new Hono()
  .get("/", async (c) => {
    return c.json({ items: [] });
  })
  .post("/", zValidator("json", createMyFeatureSchema), async (c) => {
    const data = c.req.valid("json");
    return c.json({ created: data }, 201);
  })
  .get("/:id", zValidator("param", myFeatureIdSchema), async (c) => {
    const { id } = c.req.valid("param");
    return c.json({ id });
  });

export { myFeatureRoute };
```

Register in `server/app.ts`:

```typescript
const apiRoutes = app
  .get("/health", (c) => c.text("OK", 201))
  .basePath("/api")
  .route("/my-feature", myFeatureRoute);
```

<!-- @init:firebase-start -->

## 3. Adding a Service (Firestore)

Create a service directory under `server/services/`:

```
server/services/myFeature/
  index.ts      - exports
  service.ts    - business logic
  types.ts      - service-specific types
  collection.ts - Firestore collection reference
```

```typescript
// server/services/myFeature/collection.ts
import { getCollection } from "../firebase";

export const myFeatureCollection = getCollection("myFeatures");
```

```typescript
// server/services/myFeature/service.ts
import { myFeatureCollection } from "./collection";
import type { CreateMyFeature } from "@sandilya-stack/shared/types";

export async function createMyFeature(userId: string, data: CreateMyFeature) {
  return myFeatureCollection.add({
    ...data,
    userId,
    createdAt: new Date().toISOString(),
  });
}

export async function listMyFeatures(userId: string) {
  return myFeatureCollection.where("userId", "==", userId).get();
}
```

```typescript
// server/services/myFeature/index.ts
export { createMyFeature, listMyFeatures } from "./service";
```

<!-- @init:firebase-end -->

<!-- @init:no-firebase-start -->

## 3. Adding a Service

Create a service directory under `server/services/`:

```
server/services/myFeature/
  index.ts      - exports
  service.ts    - business logic
  types.ts      - service-specific types
```

```typescript
// server/services/myFeature/service.ts
import type { CreateMyFeature } from "@sandilya-stack/shared/types";

export async function createMyFeature(data: CreateMyFeature) {
  // wire to your data layer here
}

export async function listMyFeatures() {
  // query your data layer
}
```

```typescript
// server/services/myFeature/index.ts
export { createMyFeature, listMyFeatures } from "./service";
```

<!-- @init:no-firebase-end -->

## 4. Adding a Typed API Call

Create an API function in `frontend/src/api/`:

```typescript
// frontend/src/api/myFeature.ts
import { api } from "./client";

export async function listMyFeatures() {
  const res = await api["my-feature"].$get();
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export async function createMyFeature(data: { name: string }) {
  const res = await api["my-feature"].$post({ json: data });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}
```

Types flow automatically from the server route definitions through the Hono client.

## 5. Adding a Page

Create the page component:

```typescript
// frontend/src/pages/MyFeature.tsx
export default function MyFeature() {
  return <div>My Feature</div>;
}
```

Add to router in `frontend/src/App.tsx` with lazy loading:

```typescript
const MyFeature = lazy(() => import('./pages/MyFeature'));

// Inside Routes:
<Route path="/my-feature" element={<MyFeature />} />
```

## 6. Adding a Component

Use shadcn CLI for UI primitives:

```bash
npx shadcn@latest add <component-name>
```

Components are added to `frontend/src/components/ui/`. For custom components, create them directly in `frontend/src/components/`.

## 7. Writing Tests (Server)

Server tests use `bun:test`. Create tests in `server/__tests__/`:

```typescript
// server/__tests__/routes/myFeature.test.ts
import { describe, expect, test } from "bun:test";
import app from "../../app";

describe("GET /api/my-feature", () => {
  test("returns list of items", async () => {
    const res = await app.request("/api/my-feature", {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
  });
});
```

<!-- @init:firebase-start -->

Auth is mocked in `server/__tests__/setup.ts` — tests automatically get a mock user context.

<!-- @init:firebase-end -->

Run: `cd server && bun test`
Watch mode: `cd server && bun test --watch`

## 8. Writing Tests (Frontend)

Frontend tests use Vitest + React Testing Library. Create tests in `frontend/src/__tests__/`:

```typescript
// frontend/src/__tests__/pages/MyFeature.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import MyFeature from '../../pages/MyFeature';

describe('MyFeature', () => {
  test('renders the page', () => {
    render(<MyFeature />);
    expect(screen.getByText('My Feature')).toBeInTheDocument();
  });
});
```

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
