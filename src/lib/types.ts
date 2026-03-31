export type ServiceCategory = "clinical" | "independence" | "everyday";
export type PensionStatus = "full_pensioner" | "part_pensioner" | "self_funded";
export type BudgetType = "ongoing" | "restorative" | "end_of_life" | "at_hm";
export type ATHMTier = "low" | "medium" | "high";
export type RestorativeTier = "standard" | "extended";
export type ViewPeriod = "quarterly" | "monthly" | "fortnightly";
export type ServiceFrequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "adhoc";

export interface FundingClassification {
  id: string;
  label: string;
  quarterlyBudget: number;
  dailyRate: number;
  annualBudget: number;
  isTransitioned?: boolean;
}

export interface ServiceLineItem {
  id: string;
  name: string;
  category: ServiceCategory;
  frequency: ServiceFrequency;
  ratePerHour: number;
  hrsPerSession: number;
  daysPerFrequency: number;
  isLumpSum: boolean;
  lumpSumAmount: number;
  staffType?: "jbc" | "third_party";
}

export interface PathwayConfig {
  restorativeTier: RestorativeTier;
  athmTier: ATHMTier;
}

export interface BudgetTab {
  budgetType: BudgetType;
  services: ServiceLineItem[];
  pathwayConfig: PathwayConfig;
}

export interface PartPensionerRates {
  independence: number; // 0–1
  everyday: number; // 0–1
}

export interface Supplement {
  id: string;
  label: string;
  dailyRate: number;
  quarterlyAmount: number;
  annualAmount: number;
}

export interface ATPurchase {
  id: string;
  description: string;
  cost: number;
}

export interface ClientBudget {
  id: string;
  clientName: string;
  macId: string;
  providerName: string;
  classificationId: string;
  pensionStatus: PensionStatus;
  quarter: string; // e.g. "Jan–Mar 2026 (Q3)"
  careManagementPct: number; // 0–10
  partPensionerRates: PartPensionerRates;
  supplements: string[]; // array of supplement IDs
  unspentPriorQuarter: number; // $ unspent from previous quarter (user-entered)
  grandfatheredUnspentFunds?: number;
  atPurchases?: ATPurchase[]; // display-only: grandfathered unspent funds
  isGrandfathered: boolean; // pre-existing arrangement: 0% contributions
  isGrandfatheredContributions?: boolean; // grandfathered contribution rates (can be 0%)
  useServicesAustraliaAmount?: boolean; // true when client receives less than full funding
  servicesAustraliaAmount?: number; // the available-for-services figure from Services Australia // override quarterly budget when partially funded
  tabs: BudgetTab[];
  activeTab: BudgetType;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTotals {
  clinical: number;
  independence: number;
  everyday: number;
}

export interface TabCalculations {
  totalCost: number;
  totalClientContribution: number;
  totalGovtSubsidy: number;
  byCategory: CategoryTotals;
  byCategoryContribution: CategoryTotals;
}

export interface BudgetCalculations {
  quarterlyBudget: number;
  annualBudget: number;
  supplementsQuarterly: number;
  supplementsAnnual: number;
  totalQuarterlyBudget: number;
  totalAnnualBudget: number;
  careManagementAmount: number;
  availableForServices: number;
  tabCalcs: TabCalculations;
  budgetEnvelope: number;
  utilisation: number;
  remaining: number;
  carryoverCap: number;
  unspentPriorQuarter: number;
  grandfatheredUnspentFunds?: number; // display-only: grandfathered unspent funds
  effectiveCarryover: number; // min(unspent, carryoverCap)
  effectiveBudgetEnvelope: number; // budgetEnvelope + effectiveCarryover
  govtSubsidy: number; // govt pays up to availableForServices
  clientExcess: number; // client pays overspend above budget
  atPurchasesTotal: number;
  grandfatheredFundsAfterAT: number;
  grandfatheredFundsUsed: number; // HCP funds used to cover excess
  grandfatheredFundsRemaining: number; // remaining HCP funds after covering excess
}

export interface DefaultService {
  name: string;
  category: ServiceCategory;
  ratePerHour: number;
  isLumpSum?: boolean;
  defaultFrequency?: ServiceFrequency;
  defaultHrsPerSession?: number;
  defaultDaysPerFrequency?: number;
  defaultLumpSumAmount?: number;
}
