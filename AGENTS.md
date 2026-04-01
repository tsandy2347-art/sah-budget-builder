<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SaH Budget Builder — Agent Context

## Project summary

Support at Home (SaH) Forecast Budget Builder for Australian aged care providers. Next.js 16.2 / React 19 / TypeScript / PostgreSQL (Prisma) / NextAuth.js. Deployed on Railway.

## Critical constraints

- All budget data is **user-scoped** — always filter by `userId` from the session. Never return another user's data.
- Users must be **approved** (`User.approved = true`) before they can access the app. Check this in auth logic.
- Classification **dollar rates** in `src/lib/constants.ts` are indexed to March 2026 — do not change them without a reference to the official Schedule of Subsidies and Supplements.
- Budget content is stored as **`Json`** in `Budget.data` — it is the serialised `ClientBudget` TypeScript object from `src/lib/types.ts`.

## Key files to read before coding

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | All TypeScript interfaces (ClientBudget, ServiceLineItem, etc.) |
| `src/lib/constants.ts` | Classification rates, supplements, default services |
| `src/lib/calculations.ts` | Pure budget calculation functions |
| `src/lib/auth.ts` | NextAuth config and session shape |
| `prisma/schema.prisma` | Database schema |
| `src/middleware.ts` | Route protection rules |

## Auth pattern (server-side)

```typescript
import { getUser } from "@/lib/get-user";
const user = await getUser(); // throws or redirects if unauthenticated
```

## API pattern

All `/api/budgets/*` routes check session and scope to `userId`. Admin routes at `/api/admin/*` additionally check `user.role === "ADMIN"`.

## Environment

```
DATABASE_URL     PostgreSQL connection string
NEXTAUTH_SECRET  JWT secret
NEXTAUTH_URL     App URL (Railway URL in production)
```
