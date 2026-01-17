---
description: "This document describes the authentication flow in the app"
alwaysApply: false
---

This app uses firebase Authentication with client-side login and server-side token verification.

## Flow

1. User signs in via Firebase Auth (email/Google)
2. AuthContextProvider stores user state
3. API calls include Bearer token in Authorization header
4. Auth middleware extracts token from header
5. Firebase Admin SDK verifies token
6. User info stored in Hono context
7. Routes/Services access user via hono context `c.get('user')

- Routes under `/api/*` are automatically protected by the auth middleware in @server/app.ts.
