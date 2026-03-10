# SHOT - Monorepo

## Structure

```
SHOT/
├── frontend/   # SvelteKit (static adapter) — UI only
└── backend/    # Elysia (Bun) — API, WebSocket, Auth, DB
```

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Frontend**: SvelteKit + `@sveltejs/adapter-static`
- **Backend**: Elysia (Bun-native)

## Working in sub-projects

Always `cd` into the relevant sub-directory before running commands:

```bash
cd frontend && bun dev      # SvelteKit dev server
cd backend && bun dev       # Elysia dev server
```

## Frontend (`frontend/`)

See `frontend/CLAUDE.md` for full frontend configuration.

Add-ons: prettier, eslint, tailwindcss, drizzle (read-only queries), better-auth (client), paraglide, storybook, mcp

## Backend (`backend/`)

- **Framework**: Elysia
- **Auth**: better-auth
- **Database**: Drizzle ORM + SQLite (via `bun:sqlite`)
- **WebSocket**: Elysia native WS
- **Port**: 3001 (frontend proxies `/api` and `/ws` to this)
