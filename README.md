# SaH Budget Builder

A Support at Home (SaH) budget planning tool for aged care providers. Built with Next.js and deployed on Railway.

**Live:** [sah-budget-builder-production.up.railway.app](https://sah-budget-builder-production.up.railway.app)

## Features

### Budget Management
- Create and manage client budgets with full SaH classification support (Classifications 1-8 plus transitioned HCP Levels 1-4)
- Quarterly budget calculations with indexed rates from the Schedule of Subsidies and Supplements
- Four budget pathways: Ongoing Services, Restorative Care, End-of-Life, and AT-HM (Assistive Technology & Home Modifications)
- Supplement tracking for Dementia, Veterans, Oxygen, and Enteral Feeding

### Service Line Items
- 40+ pre-configured aged care services (clinical, independence, everyday living)
- Flexible frequency options: Weekly, Fortnightly, Monthly, Quarterly, Ad-hoc
- Supports both hourly rate and lump-sum service entries
- Per-service client contribution and government subsidy calculations

### Client Contributions
- Pension status support: Full Pensioner, Part Pensioner, Self-Funded Retiree
- Category-specific contribution rates (clinical, independence, everyday living)
- Adjustable contribution percentages with 2 decimal place precision
- Grandfathered rate option for transitioned clients

### Budget Tracking
- Care management allocation (configurable %, max 10%)
- Unspent funds from prior quarter with carryover cap ($1,000)
- Partial funding support (checkbox to manually set quarterly budget)
- Budget utilisation percentage and remaining balance

### Import & Export
- PDF import from AlayaCare budget exports
- PDF export with multi-page support, page numbers, and fixed footer
- Excel/XLSX export with client details, service line items, and budget summary sheets

### Administration
- Multi-user authentication with login, registration, and password reset
- Admin panel for user management
- Per-user budget isolation

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
    api/          # API routes (budgets, auth, admin, import)
    budget/[id]/  # Budget editor page
    admin/        # Admin panel
    login/        # Auth pages
  components/
    budget/       # Budget editor components
    dashboard/    # Dashboard and budget list
    ui/           # shadcn/ui components
  lib/
    calculations.ts  # Budget and contribution calculations
    constants.ts     # Classifications, rates, services
    types.ts         # TypeScript type definitions
    export-pdf.ts    # PDF generation
    export-excel.ts  # Excel generation
    import-pdf.ts    # PDF parsing (AlayaCare + own format)
prisma/
  schema.prisma      # Database schema
```

## Deployment

Deployed on Railway with automatic builds from the main branch.

```bash
# Build command (Railway)
npm run build    # runs: prisma generate && next build

# Start command (Railway)
npm run start    # runs: prisma migrate deploy && next start
```
