# Stack Template

A modern full-stack monorepo template using Bun, React 19, Hono, and Firebase.

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

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.3+)
- Firebase project with Firestore and Authentication enabled

### Installation

```bash
bun install
```

### Environment Setup

**Frontend** (`frontend/.env`):

- Copy `.env.example` to `.env` and fill in the values

**Server** (`server/.env`):

- Copy `.env.example` to `.env` and fill in the values

### Development

```bash
bun run dev          # Runs both frontend and server
bun run frontend:dev # Frontend only (port 5173)
bun run server:dev   # Server only (port 3000)
```

### Build

```bash
bun run build        # Builds both packages
```

Output:

- Frontend: `dist/frontend/` (static files)
- Server: `dist/index.js` (bundled)
