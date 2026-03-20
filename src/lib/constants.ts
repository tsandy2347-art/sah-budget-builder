import type {
  FundingClassification,
  PensionStatus,
  ServiceCategory,
  DefaultService,
  BudgetType,
  ATHMTier,
} from "./types";

// ─── Funding Classifications ───────────────────────────────────────────────────

export const SAH_CLASSIFICATIONS: FundingClassification[] = [
  { id: "1", label: "Classification 1", quarterlyBudget: 2674.18, annualBudget: 10697.72 },
  { id: "2", label: "Classification 2", quarterlyBudget: 3995.42, annualBudget: 15981.68 },
  { id: "3", label: "Classification 3", quarterlyBudget: 5479.94, annualBudget: 21919.77 },
  { id: "4", label: "Classification 4", quarterlyBudget: 7386.33, annualBudget: 29545.33 },
  { id: "5", label: "Classification 5", quarterlyBudget: 9883.76, annualBudget: 39535.04 },
  { id: "6", label: "Classification 6", quarterlyBudget: 11989.35, annualBudget: 47957.41 },
  { id: "7", label: "Classification 7", quarterlyBudget: 14530.53, annualBudget: 58122.13 },
  { id: "8", label: "Classification 8", quarterlyBudget: 19427.25, annualBudget: 77709.00 },
];

export const TRANSITIONED_HCP_LEVELS: FundingClassification[] = [
  { id: "t1", label: "Transitioned HCP Level 1", quarterlyBudget: 2731.61, annualBudget: 10926.44, isTransitioned: true },
  { id: "t2", label: "Transitioned HCP Level 2", quarterlyBudget: 4808.52, annualBudget: 19234.08, isTransitioned: true },
  { id: "t3", label: "Transitioned HCP Level 3", quarterlyBudget: 10452.12, annualBudget: 41808.48, isTransitioned: true },
  { id: "t4", label: "Transitioned HCP Level 4", quarterlyBudget: 15859.97, annualBudget: 63439.88, isTransitioned: true },
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

// ─── Default Services ──────────────────────────────────────────────────────────

export const DEFAULT_ONGOING_CLINICAL: DefaultService[] = [
  { name: "Nursing care", category: "clinical", ratePerHour: 210, defaultHoursPerWeek: 1 },
  { name: "Physiotherapy", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
  { name: "Occupational therapy", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
  { name: "Speech pathology", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
  { name: "Podiatry", category: "clinical", ratePerHour: 180, defaultHoursPerWeek: 1 },
  { name: "Dietitian", category: "clinical", ratePerHour: 180, defaultHoursPerWeek: 1 },
  { name: "Continence assessment", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
  { name: "Psychology", category: "clinical", ratePerHour: 220, defaultHoursPerWeek: 1 },
];

export const DEFAULT_ONGOING_INDEPENDENCE: DefaultService[] = [
  { name: "Personal care", category: "independence", ratePerHour: 65, defaultHoursPerWeek: 2 },
  { name: "Social support — individual", category: "independence", ratePerHour: 65, defaultHoursPerWeek: 1 },
  { name: "Social support — group", category: "independence", ratePerHour: 45, defaultHoursPerWeek: 1 },
  { name: "Meal preparation", category: "independence", ratePerHour: 65, defaultHoursPerWeek: 2 },
  { name: "Transport", category: "independence", ratePerHour: 55, defaultHoursPerWeek: 1 },
  { name: "Respite care", category: "independence", ratePerHour: 65, defaultHoursPerWeek: 1 },
  { name: "Assistive technology", category: "independence", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 500 },
];

export const DEFAULT_ONGOING_EVERYDAY: DefaultService[] = [
  { name: "Domestic assistance", category: "everyday", ratePerHour: 65, defaultHoursPerWeek: 2 },
  { name: "Gardening / home maintenance", category: "everyday", ratePerHour: 70, defaultHoursPerWeek: 1 },
  { name: "Home modifications", category: "everyday", ratePerHour: 0, isLumpSum: true, defaultLumpSumAmount: 1000 },
];

export const DEFAULT_RESTORATIVE: DefaultService[] = [
  { name: "Physiotherapy", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
  { name: "Occupational therapy", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
  { name: "Exercise physiology", category: "clinical", ratePerHour: 170, defaultHoursPerWeek: 1 },
  { name: "Speech pathology", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
  { name: "Nursing support", category: "clinical", ratePerHour: 210, defaultHoursPerWeek: 1 },
];

export const DEFAULT_EOL: DefaultService[] = [
  { name: "Palliative nursing care", category: "clinical", ratePerHour: 210, defaultHoursPerWeek: 2 },
  { name: "Personal care", category: "independence", ratePerHour: 65, defaultHoursPerWeek: 3 },
  { name: "Respite for carer", category: "independence", ratePerHour: 65, defaultHoursPerWeek: 2 },
  { name: "Allied health", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
  { name: "Domestic support", category: "everyday", ratePerHour: 65, defaultHoursPerWeek: 2 },
];

export const DEFAULT_ATHM: DefaultService[] = [
  { name: "OT assessment", category: "clinical", ratePerHour: 190, defaultHoursPerWeek: 1 },
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

export const BUDGET_TYPE_LABELS: Record<BudgetType, string> = {
  ongoing: "Ongoing Services",
  restorative: "Restorative Care",
  end_of_life: "End-of-Life",
  at_hm: "AT-HM Scheme",
};
