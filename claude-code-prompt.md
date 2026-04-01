# Claude Code Prompt — Support at Home Budget Builder

## Overview

A production-grade **Support at Home (SaH) Forecast Budget Builder** web application for Australian aged care providers. Primary users are **care managers and coordinators** who create, manage, and export individualised quarterly service budgets for clients under the Australian Government's Support at Home program (effective 1 November 2025).

**Live deployment**: Railway — `sah-budget-builder-production.up.railway.app`

---

## Tech Stack

- **Framework**: Next.js 16.2.0 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State Management**: React state + Context (no Redux)
- **Database**: PostgreSQL via Prisma ORM v5
- **Auth**: NextAuth.js v4 (JWT sessions) with bcryptjs
- **Charts**: Recharts
- **PDF export**: `@react-pdf/renderer`
- **Excel export**: `xlsx` (SheetJS)
- **PDF import**: `pdf-parse` (AlayaCare PDF exports)
- **Deployment**: Railway (`prisma migrate deploy && next start`)

> **Note**: Data is persisted in PostgreSQL — not localStorage. `src/lib/storage.ts` exists as a legacy file but the app uses API routes backed by Prisma.

---

## Authentication & Multi-Tenancy

- Users register at `/register` and must be **approved by an admin** before they can log in
- JWT sessions via NextAuth.js; session includes `userId`, `name`, `email`, `role`
- Roles: `USER` (default) | `ADMIN`
- Admin panel at `/admin/users`: approve/reject users, reset passwords, edit names
- All budget data is scoped to the authenticated user (`Budget.userId`)
- Password reset flow: forgot-password → email token → reset-password page
- Middleware (`src/middleware.ts`) protects all routes except `/login`, `/register`, `/forgot-password`, `/reset-password`

---

## Database Schema (Prisma)

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  name              String
  password          String    // bcrypt hash
  role              Role      @default(USER)
  approved          Boolean   @default(false)
  resetToken        String?   @unique
  resetTokenExpires DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  budgets           Budget[]
}

model Budget {
  id        String   @id @default(cuid())
  data      Json     // serialised ClientBudget
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Budget content is stored as `Json` in `Budget.data` — the full `ClientBudget` TypeScript object serialised to JSON.

---

## Core Data Model

### Funding Classifications (indexed 20 March 2026 — source: health.gov.au)

```typescript
// SaH Classifications
// Class 1:  quarterly $2,682.75  / annual $10,731.00
// Class 2:  quarterly $4,008.61  / annual $16,034.45
// Class 3:  quarterly $5,491.43  / annual $21,965.70
// Class 4:  quarterly $7,424.10  / annual $29,696.40
// Class 5:  quarterly $9,924.35  / annual $39,697.40
// Class 6:  quarterly $12,028.58 / annual $48,114.30
// Class 7:  quarterly $14,537.04 / annual $58,148.15
// Class 8:  quarterly $19,526.59 / annual $78,106.35

// Transitioned HCP Levels
// T1: quarterly $2,746.63  / annual $10,986.50
// T2: quarterly $4,829.86  / annual $19,319.45
// T3: quarterly $10,513.83 / annual $42,055.30
// T4: quarterly $15,939.55 / annual $63,758.20
```

### Supplements

Optional supplements added to the quarterly budget:
- **Dementia & Cognition Supplement**: $1,824.09/quarter
- **Veterans' Supplement**: $1,550.00/quarter
- **Oxygen Supplement**: $182.60/quarter
- **Enteral Feeding Supplement**: $434.35/quarter

### Service Categories & Contribution Rates

```
| Pension Status        | Clinical | Independence | Everyday Living |
|-----------------------|----------|--------------|-----------------|
| Full pensioner        | 0%       | 5%           | 17.5%           |
| Part pensioner / CSHC | 0%       | 25% (mid)    | 47.5% (mid)     |
| Self-funded retiree   | 0%       | 50%          | 80%             |
```

Part pensioner rates are manually adjustable (means-tested by Services Australia).

**Grandfathered clients** (`isGrandfathered: true`): 0% contributions across all categories.

### Budget Types (four tabs)

1. **Ongoing Services** — quarterly budget from classification
2. **Restorative Care** — standard $6,000 or extended $12,000 (up to 16 weeks)
3. **End-of-Life** — $25,000 for 12 weeks
4. **AT-HM Scheme** — low $5,000 / medium $10,000 / high $15,000

### Key Business Rules

- **Care management**: 10% of quarterly budget (configurable 0–10%), deducted first
- **Carryover**: Unspent funds capped at the greater of $1,000 or 10% of quarterly budget
- **`unspentPriorQuarter`**: User-entered dollar amount carried from previous quarter
- **Lifetime contribution cap**: $135,318.69 (indexed March and September — display note only)
- **Quarters**: Jul–Sep (Q1), Oct–Dec (Q2), Jan–Mar (Q3), Apr–Jun (Q4)
- **View period**: Quarterly / monthly / fortnightly toggle for service cost display

---

## API Routes

```
POST   /api/auth/[...nextauth]     NextAuth sign-in/out
POST   /api/register               Create user account (sets approved: false)
POST   /api/forgot-password        Generate reset token, send email
POST   /api/reset-password         Validate token, update password

GET    /api/budgets                List budgets for current user
POST   /api/budgets                Create new budget
GET    /api/budgets/[id]           Get single budget
PUT    /api/budgets/[id]           Update budget
DELETE /api/budgets/[id]           Delete budget

POST   /api/import-pdf             Parse AlayaCare PDF export → budget JSON

GET    /api/admin/users            List all users (admin only)
PATCH  /api/admin/users/[id]       Update user (approve, role, name)
DELETE /api/admin/users/[id]       Delete user
POST   /api/admin/reset-password   Admin-initiated password reset
```

---

## Pages

```
/                     Dashboard — list budgets, create/duplicate/delete/export
/login                Sign in
/register             Create account (awaits admin approval)
/forgot-password      Request password reset email
/reset-password       Set new password via token
/budget/[id]          Budget builder (main page)
/admin/users          Admin: manage users
```

---

## File Structure

```
prisma/
├── schema.prisma
├── seed.ts
└── migrations/

src/
├── app/
│   ├── page.tsx                        # Dashboard
│   ├── layout.tsx
│   ├── globals.css
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── budget/[id]/page.tsx            # Budget builder
│   ├── admin/users/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── budgets/route.ts
│       ├── budgets/[id]/route.ts
│       ├── register/route.ts
│       ├── forgot-password/route.ts
│       ├── reset-password/route.ts
│       ├── import-pdf/route.ts
│       └── admin/
│           ├── users/route.ts
│           ├── users/[id]/route.ts
│           └── reset-password/route.ts
├── components/
│   ├── navbar.tsx
│   ├── session-provider.tsx
│   ├── theme-provider.tsx
│   ├── budget/
│   │   ├── ClientDetailsForm.tsx
│   │   ├── BudgetTabs.tsx
│   │   ├── ServiceTable.tsx
│   │   ├── AddServiceModal.tsx
│   │   ├── BudgetSummary.tsx
│   │   ├── BudgetOptimisationTips.tsx
│   │   ├── ProviderSummary.tsx
│   │   ├── MetricCard.tsx
│   │   ├── StackedBar.tsx
│   │   └── CategoryBadge.tsx
│   ├── dashboard/
│   │   ├── BudgetList.tsx
│   │   ├── BudgetCard.tsx
│   │   └── ImportBudgetButton.tsx
│   └── ui/                             # shadcn/ui components
├── hooks/
│   ├── useBudget.ts
│   └── useAutoSave.ts
├── lib/
│   ├── types.ts                        # All TypeScript interfaces
│   ├── constants.ts                    # Classifications, rates, supplements, defaults
│   ├── calculations.ts                 # Pure budget calculation functions
│   ├── auth.ts                         # NextAuth config
│   ├── db.ts                           # Prisma client singleton
│   ├── api-client.ts                   # Client-side fetch helpers
│   ├── export-pdf.ts
│   ├── export-excel.ts
│   ├── import-pdf.ts                   # AlayaCare PDF parser
│   ├── import-excel.ts
│   ├── format.ts                       # Currency/number formatters
│   ├── get-user.ts                     # Server-side session helper
│   └── utils.ts
├── middleware.ts                        # Route protection
└── types/
    └── next-auth.d.ts                  # Session type augmentation
```

---

## Default Service Lists

### Clinical (all 0% client contribution)
Nursing ($210/hr), Physiotherapy ($190/hr), OT ($190/hr), Speech pathology ($190/hr), Podiatry ($180/hr), Dietitian ($180/hr), Continence assessment ($190/hr), Psychology ($220/hr)

### Independence
Personal care ($65/hr), Social support individual ($65/hr), Social support group ($45/hr), Transport ($55/hr), Respite care ($65/hr), Assistive technology (lump sum), Home modifications (lump sum)

### Everyday Living
Domestic assistance ($65/hr), Gardening/home maintenance ($70/hr), Meal preparation ($65/hr)

### Restorative Care
Physiotherapy ($190/hr), OT ($190/hr), Exercise physiology ($170/hr), Speech pathology ($190/hr), Nursing support ($210/hr)

### End-of-Life
Palliative nursing care ($210/hr), Personal care ($65/hr), Respite for carer ($65/hr), Allied health ($190/hr), Domestic support ($65/hr)

### AT-HM Items
OT assessment ($190/hr), Grab rails (lump), Ramp (lump), Shower chair (lump), Walking frame (lump), Pressure mattress (lump), Wheelchair (lump), Bathroom modification (lump)

---

## Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://sah-budget-builder-production.up.railway.app
```

---

## Setup

```bash
npm install
npx prisma migrate dev       # local development
npm run db:seed              # seed initial admin user
npm run dev
```

Railway runs `prisma migrate deploy && next start` on boot.

---

## Important Disclaimer (display in app)

> "This tool is for planning and estimation purposes only. Actual funding amounts are subject to indexation and may change. Contribution rates for part pensioners depend on individual means testing by Services Australia. Always verify current rates via the Schedule of Subsidies and Supplements on the Department of Health, Disability and Ageing website."
