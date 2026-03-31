# SaH Forecast Budget Builder

A Support at Home (SaH) forecast budget planning tool for aged care providers. Built with Next.js and deployed on Railway.

**Live:** [sah-budget-builder-production.up.railway.app](https://sah-budget-builder-production.up.railway.app)

## Features

### Forecast Budget Management
- Create and manage participant forecast budgets with full SaH classification support (Classifications 1-8 plus Transitioned HCP Levels 1-4)
- **Daily rate × days in quarter** calculation — quarterly budgets vary by actual days (Q1: 92, Q2: 92, Q3: 90, Q4: 91)
- **Use Services Australia Amount** — enter the figure from Services Australia and the app reverse-calculates the total budget and care management fee
- Four budget pathways: Ongoing Services, Restorative Care, End-of-Life, and AT-HM (Assistive Technology & Home Modifications)
- Supplement tracking for Dementia, Veterans, Oxygen, and Enteral Feeding

### Multi-Organisation Support
- **Multi-tenant** — supports multiple organisations (e.g. Just Better Care Sunshine Coast, Just Better Care CQ)
- Users are scoped to their organisation
- Dashboard shows only the logged-in user's participants
- Search finds any participant across the organisation
- Provider name automatically pulled from user's organisation

### Service Line Items
- 40+ pre-configured aged care services (clinical, independence, everyday living)
- **Provider column** — JBC Staff or Third Party per service line
- Flexible frequency options: Weekly, Fortnightly, Monthly, Quarterly, Ad-hoc
- Supports both hourly rate and lump-sum service entries
- Per-service participant contribution and government subsidy calculations
- Empty inputs instead of "0" — no need to highlight and overwrite

### Participant Contributions
- Pension status support: Full Pensioner, Part Pensioner, Self-Funded Retiree
- Category-specific contribution rates (clinical, independence, everyday living)
- Adjustable contribution percentages with 2 decimal place precision
- **Grandfathered rates** — 0% contributions option
- **Grandfathered Contributions** — custom contribution rates down to 0%
- Contributions always available regardless of pension status

### Grandfathered HCP Participants
- **Grandfathered Unspent Funds** — track HCP unspent fund balances
- **AT Purchases from HCP Funds** — log Assistive Technology purchases that draw from HCP unspent funds (must be used before accessing AT-HM scheme tiers)
- **Overspend absorption** — HCP funds cover service overspend before participant pays out of pocket
- AT-HM scheme tiers (Low/Medium/High) disabled while HCP funds remain

### Budget Tracking
- Care management allocation (configurable %, max 10%) — calculated as 10% of total budget
- Unspent funds from prior quarter with carryover cap ($1,000)
- Budget utilisation percentage and remaining balance
- Monthly and fortnightly view periods

### Participant Signing
- **Client Sign page** — touchscreen signature pad for digital signing
- **Print without signature** — print blank sign-off sheets for manual pen-and-paper signing
- Pre-filled participant name (when "Self" selected) and care partner name
- Provider representative section with role defaulting to "Care Partner"
- Full provider name shown (from organisation record)
- **Acknowledgement of Consent** section with legal disclaimer
- Print-ready with colored metric boxes, proper page breaks, and signature lines

### Import & Export
- PDF import from AlayaCare budget exports
- **PDF export** with full service details (Frequency, Rate/Hr, Hrs, Days), AT purchases, unspent funds, multi-page support
- **Print/sign page** with colored funding summary boxes, AT purchases, unspent fund balances
- Excel/XLSX export with participant details, service line items, and budget summary sheets

### Administration
- Multi-user authentication with login, registration, and password reset
- **Admin panel** with organisation toggle (super admin sees all, org admin sees own)
- **Edit user names** inline with pencil icon
- User approval workflow
- Per-user participant isolation on dashboard

## Tech Stack

- **Framework:** Next.js 16 with React 19 and TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (JWT)
- **UI:** shadcn/ui, Radix UI, Tailwind CSS
- **PDF:** @react-pdf/renderer (export), pdf-parse (import)
- **Excel:** xlsx library
- **Deployment:** Railway

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | Base URL of the app |
| `SEED_EMAIL` | Optional: default admin email |
| `SEED_PASSWORD` | Optional: default admin password |

## Project Structure

```
src/
  app/
    api/          # API routes (budgets, auth, admin, import, organisations)
    budget/[id]/  # Forecast budget editor page
    budget/[id]/sign/  # Participant signing page
    admin/        # Admin panel (org-scoped)
    login/        # Auth pages
  components/
    budget/       # Budget editor components
    dashboard/    # Dashboard and budget list
    ui/           # shadcn/ui components
  lib/
    calculations.ts  # Budget, contribution, and grandfathered fund calculations
    constants.ts     # Classifications, daily rates, quarter days, services
    types.ts         # TypeScript type definitions (incl. ATPurchase)
    export-pdf.ts    # PDF generation with AT purchases and unspent funds
    export-excel.ts  # Excel generation
    import-pdf.ts    # PDF parsing (AlayaCare + own format)
prisma/
  schema.prisma      # Database schema (User, Budget, Organisation)
```

## Classification Rates (effective 1 Nov 2025)

| Classification | Daily Rate | Annual Budget |
|---|---|---|
| Classification 1 | $29.40 | $10,731.00 |
| Classification 2 | $43.93 | $16,034.45 |
| Classification 3 | $60.18 | $21,965.70 |
| Classification 4 | $81.36 | $29,696.40 |
| Classification 5 | $108.76 | $39,697.40 |
| Classification 6 | $131.82 | $48,114.30 |
| Classification 7 | $159.31 | $58,148.15 |
| Classification 8 | $213.99 | $78,106.35 |
| Trans. HCP Level 1 | $30.10 | $10,986.50 |
| Trans. HCP Level 2 | $52.93 | $19,319.45 |
| Trans. HCP Level 3 | $115.22 | $42,055.30 |
| Trans. HCP Level 4 | $174.68 | $63,758.20 |

*Quarterly budget = daily rate × days in quarter. Rates indexed annually on 1 July.*

## Deployment

Deployed on Railway with automatic builds from the main branch.

```bash
# Build command (Railway)
npm run build    # runs: prisma generate && next build

# Start command (Railway)
npm run start    # runs: prisma migrate deploy && next start
```
