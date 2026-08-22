# Fresh15 — Next.js Customer App

A migrated and polished Next.js App Router version of the original React/TanStack Start Fresh15 customer storefront.

## Stack

- Next.js 16 + React 19 + TypeScript
- App Router with route-level loading, 404 and error handling
- Tailwind CSS v4 + Radix UI
- Zustand for persistent client state
- TanStack Query for server-state caching and mutations
- Centralized HTTP/API configuration
- Socket.IO realtime hooks retained from the original application

## Run locally

```bash
npm i
npm run dev
```

## Production run

```bash
npm run build
npm start
```

The production workflow is intentionally first-class; `next start` serves the optimized build produced by `next build`.

## Environment

Create `.env.local` when you need to change the backend:

```env
NEXT_PUBLIC_API_BASE_URL=https://fresh15-main.onrender.com
```

## Re-theming

The main brand palette is centralized in `src/styles/theme.css`. Change the brand tokens there instead of editing individual pages/components.

## Migration notes

The visible route modules were preserved as feature modules under `src/routes/`, while Next.js owns the actual URL tree under `app/`. The small compatibility layer in `src/lib/next-router-compat.tsx` keeps feature components stable while routing, links, navigation and URL params are served by Next.js.

The legacy Vite/TanStack Start runtime is removed from the executable project path.
