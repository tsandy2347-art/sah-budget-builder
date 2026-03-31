import {
  ALL_CLASSIFICATIONS,
  CONTRIBUTION_RATES,
  RESTORATIVE_BUDGETS,
  RESTORATIVE_WEEKS,
  EOL_BUDGET,
  EOL_WEEKS,
  ATHM_BUDGETS,
  SUPPLEMENTS,
  QUARTER_DAYS,
} from "./constants";
import type {
  ServiceLineItem,
  ServiceFrequency,
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

export function getQuarterlyBudget(classificationId: string, quarter: string): number {
  const classification = getClassification(classificationId);
  if (!classification) return 0;
  const days = QUARTER_DAYS[quarter] ?? 91;
  return Math.round(classification.dailyRate * days * 100) / 100;
}

export function getAnnualBudget(classificationId: string): number {
  return getClassification(classificationId)?.annualBudget ?? 0;
}

export function getCareManagementAmount(quarterlyBudget: number, pct: number): number {
  // Standard method: care management is pct% of the total quarterly budget
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

// ─── Service Frequency ─────────────────────────────────────────────────────

export function getPeriodsInQuarter(frequency: ServiceFrequency): number {
  switch (frequency) {
    case "weekly": return 13;
    case "fortnightly": return 6.5;
    case "monthly": return 3;
    case "quarterly": return 1;
    case "adhoc": return 1;
  }
}

// ─── Contribution Rates ──────────────────────────────────────────────────────

export function getContributionRate(
  category: ServiceCategory,
  pensionStatus: PensionStatus,
  partPensionerRates?: PartPensionerRates,
  isGrandfathered?: boolean
): number {
  if (isGrandfathered) return 0;
  if (partPensionerRates) {
    if (category === "independence") return partPensionerRates.independence;
    if (category === "everyday") return partPensionerRates.everyday;
    if (category === "clinical") return 0;
  }
  return CONTRIBUTION_RATES[pensionStatus][category];
}

export function calcServiceCost(item: ServiceLineItem): number {
  if (item.isLumpSum) return round2(item.lumpSumAmount);
  const periods = getPeriodsInQuarter(item.frequency ?? "weekly");
  const hrs = item.hrsPerSession ?? 0;
  const days = item.daysPerFrequency ?? 1;
  return round2(item.ratePerHour * hrs * days * periods);
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
  const cap = 1000;
  return round2(Math.min(Math.max(remaining, 0), cap));
}

export function getSupplementsQuarterly(supplementIds: string[], quarter: string): number {
  const days = QUARTER_DAYS[quarter] ?? 91;
  let total = 0;
  for (const id of supplementIds) {
    const supp = SUPPLEMENTS.find((s) => s.id === id);
    if (supp) total += supp.dailyRate * days;
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
  const classificationQuarterly = getQuarterlyBudget(budget.classificationId, budget.quarter);
  // If using Services Australia amount, reverse-calculate: SA amount is available-for-services
  // SA uses 10% of total method, so: available = total × 0.9, therefore total = available / 0.9
  const useSA = budget.useServicesAustraliaAmount && budget.servicesAustraliaAmount != null;
  const quarterlyBudget = useSA ? round2(budget.servicesAustraliaAmount! / (1 - budget.careManagementPct / 100)) : classificationQuarterly;
  const classificationAnnual = getAnnualBudget(budget.classificationId);
  const annualBudget = (budget.useServicesAustraliaAmount && budget.servicesAustraliaAmount != null) ? round2(quarterlyBudget * 4) : classificationAnnual;
  const supplementIds = budget.supplements ?? [];
  const supplementsQuarterly = getSupplementsQuarterly(supplementIds, budget.quarter);
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

  const rawExcess = round2(Math.max(0, tabCalcs.totalCost - effectiveBudgetEnvelope));
  const gfFunds = (budget.isGrandfathered || budget.isGrandfatheredContributions) ? (budget.grandfatheredUnspentFunds ?? 0) : 0;
  // Deduct AT purchases from grandfathered funds first
  const atPurchasesTotal = round2((budget.atPurchases ?? []).reduce((sum, item) => sum + (item.cost || 0), 0));
  const grandfatheredFundsAfterAT = round2(Math.max(0, gfFunds - atPurchasesTotal));
  const grandfatheredFundsUsed = round2(Math.min(grandfatheredFundsAfterAT, rawExcess));
  const clientExcess = round2(rawExcess - grandfatheredFundsUsed);
  const grandfatheredFundsRemaining = round2(grandfatheredFundsAfterAT - grandfatheredFundsUsed);
  const govtSubsidy = round2(Math.min(tabCalcs.totalGovtSubsidy, effectiveBudgetEnvelope));
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
    atPurchasesTotal,
    grandfatheredFundsAfterAT,
    govtSubsidy,
    clientExcess,
    grandfatheredFundsUsed,
    grandfatheredFundsRemaining,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
