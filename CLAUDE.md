@AGENTS.md

# SaH Budget Builder — Claude Dev Guide

## Key facts

- **Next.js 16.2** with App Router and React 19 — see AGENTS.md warning
- **PostgreSQL + Prisma** for persistence. Budget content stored as `Json` in `Budget.data`
- **NextAuth.js v4** JWT sessions. Middleware at `src/middleware.ts` protects all routes except auth pages
- **Deployed on Railway** — boot command is `prisma migrate deploy && next start`

## Before making changes

1. Read `src/lib/types.ts` — all shared interfaces live there
2. Read `src/lib/constants.ts` — classification rates are indexed (March 2026), do not revert to old values
3. Budget calculations are pure functions in `src/lib/calculations.ts` — keep them pure and testable

## Common tasks

**Add a new API route**: create `src/app/api/<path>/route.ts`, use `src/lib/get-user.ts` to get the session user server-side

**Add a new page**: create `src/app/<path>/page.tsx`; middleware auto-protects it — add the path to the public list in `src/middleware.ts` only if it should be unauthenticated

**Update classification rates**: edit `src/lib/constants.ts` — `SAH_CLASSIFICATIONS` and `TRANSITIONED_HCP_LEVELS`. Note the index date comment.

**Add a supplement**: add to the `SUPPLEMENTS` array in `src/lib/constants.ts`

**Database schema change**: edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name <description>`

## What NOT to do

- Do not reintroduce localStorage-based budget storage — all budgets go through `/api/budgets`
- Do not remove the `approved` check from auth — users must be approved by an admin
- Do not hardcode classification dollar amounts outside `src/lib/constants.ts`
- Do not add Redux or Zustand — React state + Context is sufficient
