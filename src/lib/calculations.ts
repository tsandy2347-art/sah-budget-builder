import {
  ALL_CLASSIFICATIONS,
  CONTRIBUTION_RATES,
  RESTORATIVE_BUDGETS,
  RESTORATIVE_WEEKS,
  EOL_BUDGET,
  EOL_WEEKS,
  ATHM_BUDGETS,
  SUPPLEMENTS,
} from "./constants";
import type {
  ServiceLineItem,
  PensionStatus,
  ServiceCategory,
  BudgetType,
  TabCalculations,
  BudgetCalculations,
  CategoryTotals,
  PathwayConfig,
  PartPensionerRates,
  ClientBudget,
  ViewPeriod,
} from "./types";

export function getClassification(classificationId: string) {
  return ALL_CLASSIFICATIONS.find((c) => c.id === classificationId) ?? null;
}

export function getQuarterlyBudget(classificationId: string): number {
  return getClassification(classificationId)?.quarterlyBudget ?? 0;
}

export function getAnnualBudget(classificationId: string): number {
  return getClassification(classificationId)?.annualBudget ?? 0;
}

export function getCareManagementAmount(quarterlyBudget: number, pct: number): number {
  return round2(quarterlyBudget * (Math.min(pct, 10) / 100));
}

export function getAvailableForServices(quarterlyBudget: number, careManagementAmount: number): number {
  return round2(quarterlyBudget - careManagementAmount);
}

// ─── View Period Scaling ──────────────────────────────────────────────────────

export function getViewPeriodDivisor(period: ViewPeriod): number {
  switch (period) {
    case "quarterly": return 1;
    case "monthly": return 3;
    case "fortnightly": return 6.5;
  }
}

export function scaleAmount(amount: number, period: ViewPeriod): number {
  return round2(amount / getViewPeriodDivisor(period));
}

export const VIEW_PERIOD_LABELS: Record<ViewPeriod, string> = {
  quarterly: "Quarterly",
  monthly: "Monthly",
  fortnightly: "Fortnightly",
};

// ─── Contribution Rates ──────────────────────────────────────────────────────

export function getContributionRate(
  category: ServiceCategory,
  pensionStatus: PensionStatus,
  partPensionerRates?: PartPensionerRates,
  isGrandfathered?: boolean
): number {
  if (isGrandfathered) return 0;
  if (pensionStatus === "part_pensioner" && partPensionerRates) {
    if (category === "independence") return partPensionerRates.independence;
    if (category === "everyday") return partPensionerRates.everyday;
    if (category === "clinical") return 0;
  }
  return CONTRIBUTION_RATES[pensionStatus][category];
}

export function calcServiceCost(item: ServiceLineItem): number {
  if (item.isLumpSum) return round2(item.lumpSumAmount);
  return round2(item.ratePerHour * item.hoursPerWeek * item.weeksInQuarter);
}

export function calcClientContribution(
  item: ServiceLineItem,
  pensionStatus: PensionStatus,
  partPensionerRates?: PartPensionerRates,
  isGrandfathered?: boolean
): number {
  const cost = calcServiceCost(item);
  const rate = getContributionRate(item.category, pensionStatus, partPensionerRates, isGrandfathered);
  return round2(cost * rate);
}

export function calcGovtSubsidy(
  item: ServiceLineItem,
  pensionStatus: PensionStatus,
  partPensionerRates?: PartPensionerRates,
  isGrandfathered?: boolean
): number {
  return round2(calcServiceCost(item) - calcClientContribution(item, pensionStatus, partPensionerRates, isGrandfathered));
}

export function calcTabTotals(
  services: ServiceLineItem[],
  pensionStatus: PensionStatus,
  partPensionerRates?: PartPensionerRates,
  isGrandfathered?: boolean
): TabCalculations {
  const byCategory: CategoryTotals = { clinical: 0, independence: 0, everyday: 0 };
  const byCategoryContribution: CategoryTotals = { clinical: 0, independence: 0, everyday: 0 };
  let totalCost = 0;
  let totalClientContribution = 0;

  for (const item of services) {
    const cost = calcServiceCost(item);
    const contrib = calcClientContribution(item, pensionStatus, partPensionerRates, isGrandfathered);
    byCategory[item.category] += cost;
    byCategoryContribution[item.category] += contrib;
    totalCost += cost;
    totalClientContribution += contrib;
  }

  return {
    totalCost: round2(totalCost),
    totalClientContribution: round2(totalClientContribution),
    totalGovtSubsidy: round2(totalCost - totalClientContribution),
    byCategory: {
      clinical: round2(byCategory.clinical),
      independence: round2(byCategory.independence),
      everyday: round2(byCategory.everyday),
    },
    byCategoryContribution: {
      clinical: round2(byCategoryContribution.clinical),
      independence: round2(byCategoryContribution.independence),
      everyday: round2(byCategoryContribution.everyday),
    },
  };
}

export function getBudgetEnvelope(
  budgetType: BudgetType,
  pathwayConfig: PathwayConfig,
  availableForServices: number
): number {
  switch (budgetType) {
    case "ongoing":
      return availableForServices;
    case "restorative":
      return RESTORATIVE_BUDGETS[pathwayConfig.restorativeTier];
    case "end_of_life":
      return EOL_BUDGET;
    case "at_hm":
      return ATHM_BUDGETS[pathwayConfig.athmTier];
  }
}

export function getPathwayWeeks(budgetType: BudgetType, pathwayConfig: PathwayConfig): number {
  switch (budgetType) {
    case "ongoing":
      return 13;
    case "restorative":
      return RESTORATIVE_WEEKS[pathwayConfig.restorativeTier];
    case "end_of_life":
      return EOL_WEEKS;
    case "at_hm":
      return 1; // lump-sum based
  }
}

export function calcBudgetUtilisation(totalCost: number, envelope: number): number {
  if (envelope <= 0) return 0;
  return round2((totalCost / envelope) * 100);
}

export function calcCarryover(remaining: number, quarterlyBudget: number): number {
  const cap = Math.max(1000, quarterlyBudget * 0.1);
  return round2(Math.min(Math.max(remaining, 0), cap));
}

export function getSupplementsQuarterly(supplementIds: string[]): number {
  let total = 0;
  for (const id of supplementIds) {
    const supp = SUPPLEMENTS.find((s) => s.id === id);
    if (supp) total += supp.quarterlyAmount;
  }
  return round2(total);
}

export function getSupplementsAnnual(supplementIds: string[]): number {
  let total = 0;
  for (const id of supplementIds) {
    const supp = SUPPLEMENTS.find((s) => s.id === id);
    if (supp) total += supp.annualAmount;
  }
  return round2(total);
}

export function calcBudget(budget: ClientBudget, budgetType: BudgetType): BudgetCalculations {
  const quarterlyBudget = getQuarterlyBudget(budget.classificationId);
  const annualBudget = getAnnualBudget(budget.classificationId);
  const supplementIds = budget.supplements ?? [];
  const supplementsQuarterly = getSupplementsQuarterly(supplementIds);
  const supplementsAnnual = getSupplementsAnnual(supplementIds);
  const totalQuarterlyBudget = round2(quarterlyBudget + supplementsQuarterly);
  const totalAnnualBudget = round2(annualBudget + supplementsAnnual);
  const careManagementAmount = getCareManagementAmount(totalQuarterlyBudget, budget.careManagementPct);
  const availableForServices = getAvailableForServices(totalQuarterlyBudget, careManagementAmount);

  const tab = budget.tabs.find((t) => t.budgetType === budgetType);
  const services = tab?.services ?? [];
  const pathwayConfig = tab?.pathwayConfig ?? { restorativeTier: "standard", athmTier: "low" };

  const tabCalcs = calcTabTotals(services, budget.pensionStatus, budget.partPensionerRates, budget.isGrandfathered);
  const budgetEnvelope = getBudgetEnvelope(budgetType, pathwayConfig, availableForServices);

  // Unspent funds / carryover from prior quarter
  const unspentPriorQuarter = budget.unspentPriorQuarter ?? 0;
  const carryoverCap = calcCarryover(totalQuarterlyBudget, totalQuarterlyBudget); // max carryover allowed
  const effectiveCarryover = round2(Math.min(Math.max(unspentPriorQuarter, 0), carryoverCap));
  const effectiveBudgetEnvelope = round2(budgetEnvelope + effectiveCarryover);

  const utilisation = calcBudgetUtilisation(tabCalcs.totalCost, effectiveBudgetEnvelope);
  const remaining = round2(effectiveBudgetEnvelope - tabCalcs.totalCost);

  return {
    quarterlyBudget,
    annualBudget,
    supplementsQuarterly,
    supplementsAnnual,
    totalQuarterlyBudget,
    totalAnnualBudget,
    careManagementAmount,
    availableForServices,
    tabCalcs,
    budgetEnvelope,
    utilisation,
    remaining,
    carryoverCap,
    unspentPriorQuarter,
    effectiveCarryover,
    effectiveBudgetEnvelope,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
