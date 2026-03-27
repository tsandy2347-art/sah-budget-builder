import type {
  FundingClassification,
  PensionStatus,
  ServiceCategory,
  DefaultService,
  BudgetType,
  ATHMTier,
  ServiceFrequency,
  Supplement,
} from "./types";

// ─── Funding Classifications ───────────────────────────────────────────────────

// Rates indexed 20 March 2026 — source: health.gov.au Schedule of Subsidies and Supplements
export const SAH_CLASSIFICATIONS: FundingClassification[] = [
  { id: "1", label: "Classification 1", dailyRate: 29.4000, quarterlyBudget: 2682.75, annualBudget: 10731.00 },
  { id: "2", label: "Classification 2", dailyRate: 43.9300, quarterlyBudget: 4008.61, annualBudget: 16034.45 },
  { id: "3", label: "Classification 3", dailyRate: 60.1800, quarterlyBudget: 5491.43, annualBudget: 21965.70 },
  { id: "4", label: "Classification 4", dailyRate: 81.3600, quarterlyBudget: 7424.10, annualBudget: 29696.40 },
  { id: "5", label: "Classification 5", dailyRate: 108.7600, quarterlyBudget: 9924.35, annualBudget: 39697.40 },
  { id: "6", label: "Classification 6", dailyRate: 131.8200, quarterlyBudget: 12028.58, annualBudget: 48114.30 },
  { id: "7", label: "Classification 7", dailyRate: 159.3100, quarterlyBudget: 14537.04, annualBudget: 58148.15 },
  { id: "8", label: "Classification 8", dailyRate: 213.9900, quarterlyBudget: 19526.59, annualBudget: 78106.35 },
];

export const TRANSITIONED_HCP_LEVELS: FundingClassification[] = [
  { id: "t1", label: "Transitioned HCP Level 1", dailyRate: 30.1000, quarterlyBudget: 2746.63, annualBudget: 10986.50, isTransitioned: true },
  { id: "t2", label: "Transitioned HCP Level 2", dailyRate: 52.9300, quarterlyBudget: 4829.86, annualBudget: 19319.45, isTransitioned: true },
  { id: "t3", label: "Transitioned HCP Level 3", dailyRate: 113.2364, quarterlyBudget: 10332.82, annualBudget: 41331.28, isTransitioned: true },
  { id: "t4", label: "Transitioned HCP Level 4", dailyRate: 174.6800, quarterlyBudget: 15939.55, annualBudget: 63758.20, isTransitioned: true },
];

export const ALL_CLASSIFICATIONS: FundingClassification[] = [
  ...SAH_CLASSIFICATIONS,
  ...TRANSITIONED_HCP_LEVELS,
];

// ─── Contribution Rates ────────────────────────────────────────────────────────
// Returns rate as a fraction (0–1)

export const CONTRIBUTION_RATES: Record<PensionStatus, Record<ServiceCategory, number>> = {
  full_pensioner:  { clinical: 0,    independence: 0.05,  everyday: 0.175 },
  part_pensioner:  { clinical: 0,    independence: 0.25,  everyday: 0.475 }, // mid estimates
  self_funded:     { clinical: 0,    independence: 0.50,  everyday: 0.80  },
};

// ─── Supplements ──────────────────────────────────────────────────────────────

// Dementia supplement: $19.99/day (Level 4 rate, from 1 Jul 2025 — grandparented HCP only)
// Other supplements: best-available rates as at March 2026
export const SUPPLEMENTS: Supplement[] = [
  { id: "dementia", label: "Dementia & Cognition Supplement", dailyRate: 19.99, quarterlyAmount: 1824.09, annualAmount: 7296.35 },
  { id: "veterans", label: "Veterans' Supplement", dailyRate: 4.2466, quarterlyAmount: 1550.00, annualAmount: 6200.00 },
  { id: "oxygen", label: "Oxygen Supplement", dailyRate: 0.5003, quarterlyAmount: 182.60, annualAmount: 730.40 },
  { id: "enteral_feeding", label: "Enteral Feeding Supplement", dailyRate: 1.1901, quarterlyAmount: 434.35, annualAmount: 1737.40 },
];

// ─── Business Rules ────────────────────────────────────────────────────────────

export const CARE_MANAGEMENT_DEFAULT_PCT = 10;
export const LIFETIME_CONTRIBUTION_CAP = 135318.69;
export const DEFAULT_WEEKS_ONGOING = 13;

// ─── Pathway Budgets ───────────────────────────────────────────────────────────

export const RESTORATIVE_BUDGETS = { standard: 6000, extended: 12000 };
export const RESTORATIVE_WEEKS = { standard: 16, extended: 16 };
export const EOL_BUDGET = 25000;
export const EOL_WEEKS = 12;
export const ATHM_BUDGETS: Record<ATHMTier, number> = { low: 5000, medium: 10000, high: 15000 };

// ─── Quarter Options ───────────────────────────────────────────────────────────

export const QUARTERS = [
  "Jul–Sep 2025 (Q1)",
  "Oct–Dec 2025 (Q2)",
  "Jan–Mar 2026 (Q3)",
  "Apr–Jun 2026 (Q4)",
  "Jul–Sep 2026 (Q1)",
  "Oct–Dec 2026 (Q2)",
  "Jan–Mar 2027 (Q3)",
  "Apr–Jun 2027 (Q4)",
];

// ─── Quarter Days ─────────────────────────────────────────────────────────────────

export const QUARTER_DAYS: Record<string, number> = {
  "Jul–Sep 2025 (Q1)": 92,
  "Oct–Dec 2025 (Q2)": 92,
  "Jan–Mar 2026 (Q3)": 90,
  "Apr–Jun 2026 (Q4)": 91,
  "Jul–Sep 2026 (Q1)": 92,
  "Oct–Dec 2026 (Q2)": 92,
  "Jan–Mar 2027 (Q3)": 90,
  "Apr–Jun 2027 (Q4)": 91,
};

// ─── Default Services ──────────────────────────────────────────────────────────

export const DEFAULT_ONGOING_CLINICAL: DefaultService[] = [
  { name: "Nursing care", category: "clinical", ratePerHour: 210, defaultHrsPerSession: 1 },
  { name: "Physiotherapy", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Occupational therapy", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Speech pathology", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Podiatry", category: "clinical", ratePerHour: 180, defaultHrsPerSession: 1 },
  { name: "Dietitian", category: "clinical", ratePerHour: 180, defaultHrsPerSession: 1 },
  { name: "Continence assessment", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Psychology", category: "clinical", ratePerHour: 220, defaultHrsPerSession: 1 },
];

export const DEFAULT_ONGOING_INDEPENDENCE: DefaultService[] = [
  { name: "Personal care", category: "independence", ratePerHour: 65, defaultHrsPerSession: 2 },
  { name: "Social support — individual", category: "independence", ratePerHour: 65, defaultHrsPerSession: 1 },
  { name: "Social support — group", category: "independence", ratePerHour: 45, defaultHrsPerSession: 1 },
  { name: "Transport", category: "independence", ratePerHour: 55, defaultHrsPerSession: 1 },
  { name: "Respite care", category: "independence", ratePerHour: 65, defaultHrsPerSession: 1 },
  { name: "Assistive technology", category: "independence", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 500 },
  { name: "Home modifications", category: "independence", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 1000 },
];

export const DEFAULT_ONGOING_EVERYDAY: DefaultService[] = [
  { name: "Domestic assistance", category: "everyday", ratePerHour: 65, defaultHrsPerSession: 2 },
  { name: "Gardening / home maintenance", category: "everyday", ratePerHour: 70, defaultHrsPerSession: 1 },
  { name: "Meal preparation", category: "everyday", ratePerHour: 65, defaultHrsPerSession: 2 },
  { name: "Meal delivery", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 200 },
];

export const DEFAULT_RESTORATIVE: DefaultService[] = [
  { name: "Physiotherapy", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Occupational therapy", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Exercise physiology", category: "clinical", ratePerHour: 170, defaultHrsPerSession: 1 },
  { name: "Speech pathology", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Nursing support", category: "clinical", ratePerHour: 210, defaultHrsPerSession: 1 },
];

export const DEFAULT_EOL: DefaultService[] = [
  { name: "Palliative nursing care", category: "clinical", ratePerHour: 210, defaultHrsPerSession: 2 },
  { name: "Personal care", category: "independence", ratePerHour: 65, defaultHrsPerSession: 3 },
  { name: "Respite for carer", category: "independence", ratePerHour: 65, defaultHrsPerSession: 2 },
  { name: "Allied health", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Domestic support", category: "everyday", ratePerHour: 65, defaultHrsPerSession: 2 },
];

export const DEFAULT_ATHM: DefaultService[] = [
  { name: "OT assessment", category: "clinical", ratePerHour: 190, defaultHrsPerSession: 1 },
  { name: "Grab rails / bathroom rails", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 400 },
  { name: "Ramp installation", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 1500 },
  { name: "Shower chair / commode", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 250 },
  { name: "Walking frame / rollator", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 350 },
  { name: "Pressure mattress", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 800 },
  { name: "Wheelchair / scooter", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 2000 },
  { name: "Bathroom modification", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 3000 },
];

export const DEFAULT_SERVICES_BY_TYPE: Record<BudgetType, DefaultService[]> = {
  ongoing: [...DEFAULT_ONGOING_CLINICAL, ...DEFAULT_ONGOING_INDEPENDENCE, ...DEFAULT_ONGOING_EVERYDAY],
  restorative: DEFAULT_RESTORATIVE,
  end_of_life: DEFAULT_EOL,
  at_hm: DEFAULT_ATHM,
};

// ─── Pension Status Labels ─────────────────────────────────────────────────────

export const PENSION_STATUS_LABELS: Record<PensionStatus, string> = {
  full_pensioner: "Full Pensioner",
  part_pensioner: "Part Pensioner / CSHC Holder",
  self_funded: "Self-Funded Retiree",
};

export const SERVICE_FREQUENCIES: ServiceFrequency[] = ["weekly", "fortnightly", "monthly", "quarterly", "adhoc"];

export const FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  adhoc: "Adhoc",
};

export const BUDGET_TYPE_LABELS: Record<BudgetType, string> = {
  ongoing: "Ongoing Services",
  restorative: "Restorative Care",
  end_of_life: "End-of-Life",
  at_hm: "AT-HM Scheme",
};
