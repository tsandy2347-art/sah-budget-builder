# Claude Code Prompt — Support at Home Budget Builder

## Overview

Build a production-grade **Support at Home (SaH) Budget Builder** web application for Australian aged care providers. The primary users are **care managers and coordinators** who need to create, manage, and export individualised quarterly service budgets for clients under the Australian Government's Support at Home program (which replaced Home Care Packages on 1 November 2025).

Use **Next.js 14+ (App Router)** with **React**, **TypeScript**, and **Tailwind CSS**. Use **shadcn/ui** for the component library. The app should be responsive, accessible, and support light/dark mode.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (install and configure it)
- **State Management**: React state + Context (no Redux needed)
- **Export**: 
  - PDF generation via `@react-pdf/renderer` or `jspdf` + `jspdf-autotable`
  - Excel export via `xlsx` (SheetJS)
- **Data persistence**: localStorage for saving/loading budgets (no backend needed)
- **Deployment target**: Vercel-ready

---

## Core Data Model

### Funding Classifications (effective 1 November 2025, subject to annual indexation on 1 July)

```typescript
interface FundingClassification {
  id: string; // "1" through "8", or "t1" through "t4" for transitioned HCP
  label: string;
  quarterlyBudget: number;
  annualBudget: number;
}

// New SaH Classifications
// Classification 1: quarterly $2,674.18, annual $10,697.72
// Classification 2: quarterly $3,995.42, annual $15,981.68
// Classification 3: quarterly $5,479.94, annual $21,919.77
// Classification 4: quarterly $7,386.33, annual $29,545.33
// Classification 5: quarterly $9,883.76, annual $39,535.04
// Classification 6: quarterly $11,989.35, annual $47,957.41
// Classification 7: quarterly $14,530.53, annual $58,122.13
// Classification 8: quarterly $19,427.25, annual $77,709.00

// Transitioned HCP Levels (for clients who had an HCP before 1 Nov 2025)
// Transitioned HCP Level 1: quarterly $2,731.61, annual $10,926.44
// Transitioned HCP Level 2: quarterly $4,808.52, annual $19,234.08
// Transitioned HCP Level 3: quarterly $10,452.12, annual $41,808.48
// Transitioned HCP Level 4: quarterly $15,859.97, annual $63,439.88
```

### Service Categories and Contribution Rates

Services fall into three categories, each with different client contribution rates based on pension status:

```typescript
type ServiceCategory = "clinical" | "independence" | "everyday";
type PensionStatus = "full_pensioner" | "part_pensioner" | "self_funded";

// Contribution rates (percentage of service price paid by client):
//
// | Pension Status              | Clinical | Independence   | Everyday Living |
// |-----------------------------|----------|----------------|-----------------|
// | Full pensioner              | 0%       | 5%             | 17.5%           |
// | Part pensioner / CSHC holder| 0%       | 5%–50% (use 25% as mid estimate) | 17.5%–80% (use 47.5% as mid) |
// | Self-funded retiree         | 0%       | 50%            | 80%             |
//
// For part pensioners, allow the user to manually adjust their exact rate
// as it depends on means testing by Services Australia.
```

### Budget Types / Pathways

The app must support **four budget types**, each as a tab:

1. **Ongoing services** — The main quarterly budget from the client's classification
2. **Restorative Care Pathway** — ~$6,000 for up to 16 weeks (extendable to ~$12,000 if eligible)
3. **End-of-Life Pathway** — ~$25,000 for up to 12 weeks
4. **AT-HM Scheme** (Assistive Technology & Home Modifications) — Three tiers:
   - Low: $5,000
   - Medium: $10,000
   - High: $15,000 (or more with valid prescription)

### Service Line Item

```typescript
interface ServiceLineItem {
  id: string;
  name: string;
  category: ServiceCategory;
  ratePerHour: number; // hourly rate in dollars
  hoursPerWeek: number;
  weeksInQuarter: number; // usually 13 for ongoing, or pathway-specific
  isLumpSum: boolean; // for equipment/modifications — use a fixed dollar amount instead of hours
  lumpSumAmount: number; // only used if isLumpSum is true
}
```

### Key Business Rules

- **Care management**: 10% of the quarterly budget is deducted for care management (capped at 10%). The remaining 90% is the "available for services" amount. Include care management as a configurable percentage (0–10%).
- **Carryover**: Unspent funds can roll over, capped at the greater of $1,000 or 10% of the quarterly budget.
- **Clinical services**: 0% client contribution for ALL pension statuses — fully government funded.
- **Lifetime cap**: $135,318.69 on total client contributions (indexed 20 March and 20 September each year). Display a note about this but don't need to track it across sessions.
- **Quarters**: Jul–Sep (Q1), Oct–Dec (Q2), Jan–Mar (Q3), Apr–Jun (Q4). Funding is allocated at the start of each quarter.

---

## Pages and Features

### 1. Dashboard / Budget List Page (`/`)

- List of saved client budgets with name, classification, quarter, and budget utilisation percentage
- "Create new budget" button
- Search/filter by client name
- Quick actions: duplicate, delete, export

### 2. Budget Builder Page (`/budget/[id]`)

This is the main page with the following sections:

#### Section 1: Client & Funding Details

Form fields:
- Client name (text)
- My Aged Care ID (text, format: 1-XXXXXXX)
- Provider name (text)
- Classification (dropdown: 8 SaH classifications + 4 transitioned HCP levels)
- Pension status (dropdown: full pensioner, part pensioner/CSHC, self-funded retiree)
- Quarter (dropdown: e.g., "Jan–Mar 2026 (Q3)")
- Care management fee % (number input, 0–10, default 10)

Display summary metric cards:
- Annual budget
- Quarterly budget
- Care management amount
- Available for services

#### Section 2: Budget Type Tabs

Four tabs: **Ongoing Services** | **Restorative Care** | **End-of-Life** | **AT-HM Scheme**

Each tab has its own service table and budget envelope.

For Restorative Care:
- Toggle for standard ($6,000) vs extended ($12,000) funding
- Default services: physiotherapy, OT, exercise physiology, speech pathology, nursing

For End-of-Life:
- Fixed budget of $25,000 for 12 weeks
- Default services: palliative nursing, personal care, respite for carer, allied health, domestic support

For AT-HM:
- Tier selector (low/medium/high)
- Services are mostly lump-sum items (grab rails, ramp, shower chair, wheelchair, bathroom mods)
- Include an OT assessment service line

#### Section 3: Service Line Items Table

Columns:
- Service name
- Category (with coloured badge: Clinical = blue, Independence = teal, Everyday = amber)
- Rate per hour (editable)
- Hours per week (editable)
- Weeks (editable, default 13 for ongoing)
- Quarterly cost (auto-calculated: rate × hrs/wk × weeks, or lump sum)
- Client contribution (auto-calculated based on category + pension status)
- Remove button

Features:
- Pre-populated with common services per category (see default services list below)
- "Add service" button opens a modal/dialog to add custom services
- Lump sum toggle for equipment/modification items
- Row totals per category
- Grand total row

#### Section 4: Budget Summary

- Stacked bar chart showing utilisation by category (clinical, independence, everyday, care management)
- Budget utilisation percentage
- Remaining budget with contextual alerts:
  - Over budget → red warning with suggestion to reduce services or request reassessment
  - Under-utilised (remaining > carryover limit) → green note suggesting additional services
  - Within carryover → green confirmation
- Legend with category colours and dollar amounts

#### Section 5: Provider Cost Summary (ongoing tab only)

Summary grid:
- Total service cost
- Client contributions
- Government subsidy (services)
- Care management fee
- Unspent (govt budget)

### 3. Export Functionality

#### PDF Export
Generate a professional PDF with:
- Header: "Support at Home — Budget Plan" with provider name and date
- Client details section (name, MAC ID, classification, pension status, quarter)
- Service line items table with category grouping
- Budget summary with utilisation bar
- Footer: "This document is a planning tool only and does not constitute financial advice."

#### Excel/CSV Export
Generate a spreadsheet with:
- Sheet 1: Service line items with all columns
- Sheet 2: Budget summary with funding details
- Sheet 3: Client details

---

## Default Service Lists

### Ongoing Services — Clinical
- Nursing care ($210/hr)
- Physiotherapy ($190/hr)
- Occupational therapy ($190/hr)
- Speech pathology ($190/hr)
- Podiatry ($180/hr)
- Dietitian ($180/hr)
- Continence assessment ($190/hr)
- Psychology ($220/hr)

### Ongoing Services — Independence
- Personal care ($65/hr)
- Social support — individual ($65/hr)
- Social support — group ($45/hr)
- Meal preparation ($65/hr)
- Transport ($55/hr)
- Respite care ($65/hr)
- Assistive technology (lump sum)

### Ongoing Services — Everyday Living
- Domestic assistance ($65/hr)
- Gardening / home maintenance ($70/hr)
- Home modifications (lump sum)

### Restorative Care Services
- Physiotherapy ($190/hr)
- Occupational therapy ($190/hr)
- Exercise physiology ($170/hr)
- Speech pathology ($190/hr)
- Nursing support ($210/hr)

### End-of-Life Services
- Palliative nursing care ($210/hr)
- Personal care ($65/hr)
- Respite for carer ($65/hr)
- Allied health ($190/hr)
- Domestic support ($65/hr)

### AT-HM Items
- OT assessment ($190/hr)
- Grab rails / bathroom rails (lump sum)
- Ramp installation (lump sum)
- Shower chair / commode (lump sum)
- Walking frame / rollator (lump sum)
- Pressure mattress (lump sum)
- Wheelchair / scooter (lump sum)
- Bathroom modification (lump sum)

---

## UI/UX Requirements

- **Design system**: Clean, professional, accessible. Use shadcn/ui components consistently.
- **Colour coding for categories**: 
  - Clinical: blue tones
  - Independence: teal/green tones
  - Everyday living: amber/warm tones
- **Real-time calculations**: All totals, contributions, and budget utilisation should update instantly as fields are edited.
- **Responsive**: Must work on tablet and desktop (mobile is a secondary concern for care managers).
- **Accessibility**: Proper labels, keyboard navigation, sufficient contrast.
- **Empty states**: Helpful prompts when no services are added or no budgets exist.
- **Validation**: Warn if hours, rates, or weeks are unrealistic. Alert if budget is exceeded.
- **Auto-save**: Save budget state to localStorage on every change.

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard / budget list
│   ├── budget/
│   │   └── [id]/
│   │       └── page.tsx            # Budget builder page
│   └── layout.tsx
├── components/
│   ├── budget/
│   │   ├── ClientDetailsForm.tsx
│   │   ├── BudgetTabs.tsx
│   │   ├── ServiceTable.tsx
│   │   ├── AddServiceModal.tsx
│   │   ├── BudgetSummary.tsx
│   │   ├── ProviderSummary.tsx
│   │   ├── MetricCard.tsx
│   │   ├── StackedBar.tsx
│   │   └── CategoryBadge.tsx
│   ├── dashboard/
│   │   ├── BudgetList.tsx
│   │   └── BudgetCard.tsx
│   └── ui/                         # shadcn components
├── lib/
│   ├── constants.ts                # Funding data, rates, contribution tables
│   ├── calculations.ts             # Budget calculation functions
│   ├── export-pdf.ts               # PDF generation
│   ├── export-excel.ts             # Excel generation
│   ├── storage.ts                  # localStorage helpers
│   └── types.ts                    # TypeScript interfaces
└── hooks/
    ├── useBudget.ts                # Budget state management hook
    └── useAutoSave.ts              # Auto-save hook
```

---

## Implementation Notes

1. **Start by** setting up the Next.js project with TypeScript, Tailwind, and shadcn/ui.
2. **Define all types and constants first** in `lib/types.ts` and `lib/constants.ts`.
3. **Build the calculation engine** in `lib/calculations.ts` — all budget math should be pure functions that are easy to test.
4. **Build the budget builder page** before the dashboard — it's the core of the app.
5. **Add export functionality last** — PDF and Excel are the final polish.
6. **Test with real scenarios**: e.g., a Classification 4 full pensioner receiving nursing (1hr/wk), personal care (5hrs/wk), and domestic assistance (2hrs/wk) over 13 weeks.

---

## Important Caveats to Display in the App

Include a footer or disclaimer:
> "This tool is for planning and estimation purposes only. Actual funding amounts are subject to indexation and may change. Contribution rates for part pensioners depend on individual means testing by Services Australia. Always verify current rates via the Schedule of Subsidies and Supplements on the Department of Health, Disability and Ageing website."
