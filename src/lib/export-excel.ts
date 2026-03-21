import * as XLSX from "xlsx";
import { calcBudget, calcServiceCost, calcClientContribution, getClassification } from "./calculations";
import { BUDGET_TYPE_LABELS, PENSION_STATUS_LABELS, SUPPLEMENTS } from "./constants";
import type { ClientBudget, BudgetType } from "./types";

const BUDGET_TYPES: BudgetType[] = ["ongoing", "restorative", "end_of_life", "at_hm"];

export function exportBudgetExcel(budget: ClientBudget): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Client Details
  const clientRows = [
    ["Support at Home — Budget Plan"],
    [],
    ["Client Name", budget.clientName],
    ["My Aged Care ID", budget.macId],
    ["Provider", budget.providerName],
    ["Classification", getClassification(budget.classificationId)?.label ?? budget.classificationId],
    ["Pension Status", PENSION_STATUS_LABELS[budget.pensionStatus]],
    ["Quarter", budget.quarter],
    ["Care Management %", `${budget.careManagementPct}%`],
    ...((budget.supplements ?? []).length > 0
      ? [["Supplements", (budget.supplements ?? []).map((id: string) => SUPPLEMENTS.find((s) => s.id === id)?.label ?? id).join(", ")]]
      : []),
    [],
    ["Generated", new Date().toLocaleDateString("en-AU")],
  ];
  const wsClient = XLSX.utils.aoa_to_sheet(clientRows);
  XLSX.utils.book_append_sheet(wb, wsClient, "Client Details");

  // Sheet 2: Service Line Items
  const serviceHeader = [
    "Budget Type",
    "Service Name",
    "Category",
    "Rate/hr ($)",
    "Hours/Week",
    "Weeks",
    "Lump Sum",
    "Quarterly Cost ($)",
    "Client Contribution ($)",
    "Govt Subsidy ($)",
  ];
  const serviceRows: (string | number)[][] = [serviceHeader];

  for (const budgetType of BUDGET_TYPES) {
    const tab = budget.tabs.find((t) => t.budgetType === budgetType);
    if (!tab || tab.services.length === 0) continue;
    for (const item of tab.services) {
      const cost = calcServiceCost(item);
      const contrib = calcClientContribution(item, budget.pensionStatus, budget.partPensionerRates);
      serviceRows.push([
        BUDGET_TYPE_LABELS[budgetType],
        item.name,
        item.category.charAt(0).toUpperCase() + item.category.slice(1),
        item.isLumpSum ? "" : item.ratePerHour,
        item.isLumpSum ? "" : item.hoursPerWeek,
        item.isLumpSum ? "" : item.weeksInQuarter,
        item.isLumpSum ? item.lumpSumAmount : "",
        cost,
        contrib,
        cost - contrib,
      ]);
    }
  }
  const wsServices = XLSX.utils.aoa_to_sheet(serviceRows);
  XLSX.utils.book_append_sheet(wb, wsServices, "Service Line Items");

  // Sheet 3: Budget Summary
  const summaryRows: (string | number)[][] = [
    ["Budget Summary"],
    [],
    ["", "Ongoing", "Restorative", "End-of-Life", "AT-HM"],
  ];

  const ongoingCalcs = calcBudget(budget, "ongoing");
  summaryRows.push(["Annual Budget (incl. supplements)", ongoingCalcs.totalAnnualBudget, "", "", ""]);
  summaryRows.push(["Quarterly Budget (incl. supplements)", ongoingCalcs.totalQuarterlyBudget, "", "", ""]);
  if (ongoingCalcs.supplementsQuarterly > 0) {
    summaryRows.push(["Supplements (Quarterly)", ongoingCalcs.supplementsQuarterly, "", "", ""]);
  }
  summaryRows.push(["Care Management", ongoingCalcs.careManagementAmount, "", "", ""]);
  summaryRows.push(["Available for Services", ongoingCalcs.availableForServices, "", "", ""]);
  summaryRows.push([]);

  const labels = ["Budget Envelope", "Total Services Cost", "Client Contributions", "Govt Subsidy", "Utilisation (%)", "Remaining"];
  const calcsMap = BUDGET_TYPES.map((t) => calcBudget(budget, t));
  summaryRows.push([...labels.slice(0, 1), ...calcsMap.map((c) => c.budgetEnvelope)]);
  summaryRows.push(["Total Services Cost", ...calcsMap.map((c) => c.tabCalcs.totalCost)]);
  summaryRows.push(["Client Contributions", ...calcsMap.map((c) => c.tabCalcs.totalClientContribution)]);
  summaryRows.push(["Govt Subsidy", ...calcsMap.map((c) => c.tabCalcs.totalGovtSubsidy)]);
  summaryRows.push(["Utilisation (%)", ...calcsMap.map((c) => c.utilisation)]);
  summaryRows.push(["Remaining", ...calcsMap.map((c) => c.remaining)]);

  summaryRows.push([]);
  summaryRows.push(["Disclaimer: This tool is for planning and estimation purposes only."]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Budget Summary");

  // Download
  const fileName = `SaH-Budget-${(budget.clientName || "Client").replace(/\s+/g, "-")}-${budget.quarter.replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
