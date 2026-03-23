import { v4 as uuidv4 } from "uuid";
import type { ClientBudget, BudgetType, BudgetTab } from "./types";
import {
  CARE_MANAGEMENT_DEFAULT_PCT,
  QUARTERS,
  DEFAULT_SERVICES_BY_TYPE,
} from "./constants";

const STORAGE_KEY = "sah_budgets";

function defaultTab(budgetType: BudgetType): BudgetTab {
  return {
    budgetType,
    services: [],
    pathwayConfig: { restorativeTier: "standard", athmTier: "low" },
  };
}

export function createNewBudget(): ClientBudget {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    clientName: "",
    macId: "",
    providerName: "Just Better Care Sunshine Coast PTY LTD",
    classificationId: "4",
    pensionStatus: "full_pensioner",
    quarter: QUARTERS[2], // Jan–Mar 2026
    careManagementPct: CARE_MANAGEMENT_DEFAULT_PCT,
    partPensionerRates: { independence: 0.25, everyday: 0.475 },
    supplements: [],
    unspentPriorQuarter: 0,
    isGrandfathered: false,
    tabs: (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab),
    activeTab: "ongoing",
    createdAt: now,
    updatedAt: now,
  };
}

export function listBudgets(): ClientBudget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClientBudget[];
  } catch {
    return [];
  }
}

export function getBudget(id: string): ClientBudget | null {
  return listBudgets().find((b) => b.id === id) ?? null;
}

export function saveBudget(budget: ClientBudget): void {
  if (typeof window === "undefined") return;
  const budgets = listBudgets().filter((b) => b.id !== budget.id);
  budgets.push({ ...budget, updatedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
}

export function deleteBudget(id: string): void {
  if (typeof window === "undefined") return;
  const budgets = listBudgets().filter((b) => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
}

export function duplicateBudget(id: string): ClientBudget | null {
  const original = getBudget(id);
  if (!original) return null;
  const now = new Date().toISOString();
  const copy: ClientBudget = {
    ...JSON.parse(JSON.stringify(original)),
    id: uuidv4(),
    clientName: `${original.clientName} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  saveBudget(copy);
  return copy;
}

export function addDefaultServices(budget: ClientBudget, budgetType: BudgetType): ClientBudget {
  const defaults = DEFAULT_SERVICES_BY_TYPE[budgetType];
  const weeks = budgetType === "ongoing" ? 13 : budgetType === "restorative" ? 16 : budgetType === "end_of_life" ? 12 : 1;

  const updatedTabs = budget.tabs.map((tab) => {
    if (tab.budgetType !== budgetType) return tab;
    const newServices = defaults.map((d) => ({
      id: uuidv4(),
      name: d.name,
      category: d.category,
      ratePerHour: d.ratePerHour,
      hoursPerWeek: d.defaultHoursPerWeek ?? 1,
      weeksInQuarter: weeks,
      isLumpSum: d.isLumpSum ?? false,
      lumpSumAmount: d.defaultLumpSumAmount ?? 0,
    }));
    return { ...tab, services: [...tab.services, ...newServices] };
  });

  return { ...budget, tabs: updatedTabs };
}
