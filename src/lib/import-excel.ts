import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import type { ClientBudget, ServiceLineItem, ServiceCategory, BudgetType, PensionStatus, BudgetTab } from "./types";
import { ALL_CLASSIFICATIONS, QUARTERS, CARE_MANAGEMENT_DEFAULT_PCT, PENSION_STATUS_LABELS } from "./constants";

// ─── Excel Import ─────────────────────────────────────────────────────────────
// Handles:
// 1. Our own export format (Client Details + Service Line Items sheets)
// 2. Generic spreadsheets with service rows (name, rate, hours, weeks, category)

function defaultTab(budgetType: BudgetType): BudgetTab {
  return {
    budgetType,
    services: [],
    pathwayConfig: { restorativeTier: "standard", athmTier: "low" },
  };
}

function normaliseCategory(raw: string): ServiceCategory {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("clinical")) return "clinical";
  if (lower.includes("independence") || lower.includes("personal") || lower.includes("social") || lower.includes("respite") || lower.includes("transport")) return "independence";
  if (lower.includes("everyday") || lower.includes("domestic") || lower.includes("garden") || lower.includes("home mod") || lower.includes("home maint")) return "everyday";
  // Default by common service keywords
  if (lower.includes("nurs") || lower.includes("physio") || lower.includes("therapy") || lower.includes("occ") || lower.includes("speech") || lower.includes("podiat") || lower.includes("dietit") || lower.includes("psychol")) return "clinical";
  return "independence"; // safe default
}

function normaliseBudgetType(raw: string): BudgetType {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("restorative")) return "restorative";
  if (lower.includes("end") && lower.includes("life")) return "end_of_life";
  if (lower.includes("at-hm") || lower.includes("athm") || lower.includes("assistive") || lower.includes("home mod")) return "at_hm";
  return "ongoing";
}

function normalisePensionStatus(raw: string): PensionStatus {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("self") || lower.includes("funded")) return "self_funded";
  if (lower.includes("part")) return "part_pensioner";
  return "full_pensioner";
}

function findClassification(raw: string): string {
  const lower = raw.toLowerCase().trim();
  for (const c of ALL_CLASSIFICATIONS) {
    if (lower.includes(c.label.toLowerCase())) return c.id;
    // Match "Classification 4" or just "4"
    const numMatch = lower.match(/(\d+)/);
    if (numMatch) {
      const num = numMatch[1];
      if (c.label.includes(num) && !c.isTransitioned && lower.includes("class")) return c.id;
      if (c.label.includes(`Level ${num}`) && (lower.includes("hcp") || lower.includes("trans"))) return c.id;
    }
  }
  return "4"; // default
}

function findQuarter(raw: string): string {
  for (const q of QUARTERS) {
    if (raw.includes(q)) return q;
  }
  // Try partial match
  const lower = raw.toLowerCase();
  for (const q of QUARTERS) {
    const parts = q.toLowerCase().split("(")[0].trim();
    if (lower.includes(parts)) return q;
  }
  return QUARTERS[2]; // default Jan-Mar 2026
}

function cellValue(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  return cell ? String(cell.v ?? "").trim() : "";
}

function cellNumber(sheet: XLSX.WorkSheet, row: number, col: number): number {
  const v = cellValue(sheet, row, col);
  const n = parseFloat(v.replace(/[$,%]/g, ""));
  return isNaN(n) ? 0 : n;
}

// ─── Parse our own export format ──────────────────────────────────────────────

function parseOwnFormat(wb: XLSX.WorkBook): ClientBudget | null {
  const clientSheet = wb.Sheets["Client Details"];
  const serviceSheet = wb.Sheets["Service Line Items"];
  if (!clientSheet || !serviceSheet) return null;

  // Read client details (rows are key-value pairs starting at row index 2)
  const clientData = XLSX.utils.sheet_to_json<string[]>(clientSheet, { header: 1 }) as string[][];

  let clientName = "";
  let macId = "";
  let classificationId = "4";
  let pensionStatus: PensionStatus = "full_pensioner";
  let quarter = QUARTERS[2];
  let careManagementPct = CARE_MANAGEMENT_DEFAULT_PCT;

  for (const row of clientData) {
    if (!row[0]) continue;
    const label = String(row[0]).toLowerCase().trim();
    const value = String(row[1] ?? "").trim();
    if (label.includes("client name")) clientName = value;
    else if (label.includes("aged care") || label.includes("mac")) macId = value;
    else if (label.includes("classification")) classificationId = findClassification(value);
    else if (label.includes("pension")) pensionStatus = normalisePensionStatus(value);
    else if (label.includes("quarter")) quarter = findQuarter(value);
    else if (label.includes("care management")) {
      const pct = parseFloat(value.replace("%", ""));
      if (!isNaN(pct)) careManagementPct = pct;
    }
  }

  // Read service line items
  const serviceData = XLSX.utils.sheet_to_json<Record<string, any>>(serviceSheet);
  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);

  for (const row of serviceData) {
    const budgetTypeRaw = String(row["Budget Type"] ?? "ongoing");
    const budgetType = normaliseBudgetType(budgetTypeRaw);
    const name = String(row["Service Name"] ?? "").trim();
    if (!name) continue;

    const category = normaliseCategory(String(row["Category"] ?? ""));
    const ratePerHour = parseFloat(row["Rate/hr ($)"] ?? 0) || 0;
    const hoursPerWeek = parseFloat(row["Hours/Week"] ?? 0) || 0;
    const weeks = parseFloat(row["Weeks"] ?? 13) || 13;
    const lumpSum = parseFloat(row["Lump Sum"] ?? 0) || 0;
    const isLumpSum = lumpSum > 0 && ratePerHour === 0;

    const service: ServiceLineItem = {
      id: uuidv4(),
      name,
      category,
      ratePerHour,
      hoursPerWeek: isLumpSum ? 0 : hoursPerWeek,
      weeksInQuarter: isLumpSum ? 1 : weeks,
      isLumpSum,
      lumpSumAmount: isLumpSum ? lumpSum : 0,
    };

    const tab = tabs.find((t) => t.budgetType === budgetType);
    if (tab) tab.services.push(service);
  }

  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    clientName,
    macId,
    providerName: "Just Better Care Sunshine Coast PTY LTD",
    classificationId,
    pensionStatus,
    quarter,
    careManagementPct,
    partPensionerRates: { independence: 0.25, everyday: 0.475 },
    tabs,
    activeTab: "ongoing",
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Parse generic spreadsheet ────────────────────────────────────────────────
// Looks for columns matching: service/name, category, rate, hours, weeks, amount

function parseGenericFormat(wb: XLSX.WorkBook): ClientBudget | null {
  // Use the first sheet
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return null;

  const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
  if (data.length === 0) return null;

  // Try to detect column mappings from headers
  const headers = Object.keys(data[0]).map((h) => h.toLowerCase());

  const findCol = (keywords: string[]): string | null => {
    for (const key of Object.keys(data[0])) {
      const lower = key.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw))) return key;
    }
    return null;
  };

  const nameCol = findCol(["service", "name", "description", "item"]);
  const categoryCol = findCol(["category", "type", "class", "group"]);
  const rateCol = findCol(["rate", "price", "cost/hr", "$/hr"]);
  const hoursCol = findCol(["hour", "hrs", "time"]);
  const weeksCol = findCol(["week", "wk", "duration"]);
  const amountCol = findCol(["amount", "total", "lump", "sum", "cost"]);
  const budgetTypeCol = findCol(["budget type", "pathway", "budget"]);

  if (!nameCol) return null; // Can't import without service names

  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);

  for (const row of data) {
    const name = String(row[nameCol] ?? "").trim();
    if (!name) continue;

    const category = categoryCol ? normaliseCategory(String(row[categoryCol] ?? "")) : normaliseCategory(name);
    const rate = rateCol ? (parseFloat(row[rateCol]) || 0) : 0;
    const hours = hoursCol ? (parseFloat(row[hoursCol]) || 0) : 0;
    const weeks = weeksCol ? (parseFloat(row[weeksCol]) || 13) : 13;
    const amount = amountCol ? (parseFloat(row[amountCol]) || 0) : 0;
    const isLumpSum = rate === 0 && hours === 0 && amount > 0;

    const budgetType = budgetTypeCol ? normaliseBudgetType(String(row[budgetTypeCol] ?? "")) : "ongoing";

    const service: ServiceLineItem = {
      id: uuidv4(),
      name,
      category,
      ratePerHour: rate,
      hoursPerWeek: isLumpSum ? 0 : (hours || 1),
      weeksInQuarter: isLumpSum ? 1 : weeks,
      isLumpSum,
      lumpSumAmount: isLumpSum ? amount : 0,
    };

    const tab = tabs.find((t) => t.budgetType === budgetType);
    if (tab) tab.services.push(service);
  }

  // Check we actually got services
  const totalServices = tabs.reduce((s, t) => s + t.services.length, 0);
  if (totalServices === 0) return null;

  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    clientName: "",
    macId: "",
    providerName: "Just Better Care Sunshine Coast PTY LTD",
    classificationId: "4",
    pensionStatus: "full_pensioner",
    quarter: QUARTERS[2],
    careManagementPct: CARE_MANAGEMENT_DEFAULT_PCT,
    partPensionerRates: { independence: 0.25, everyday: 0.475 },
    tabs,
    activeTab: "ongoing",
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Main import function ─────────────────────────────────────────────────────

export async function importBudgetFromExcel(file: File): Promise<ClientBudget> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  // Try our own format first
  const ownFormat = parseOwnFormat(wb);
  if (ownFormat) return ownFormat;

  // Fall back to generic
  const generic = parseGenericFormat(wb);
  if (generic) return generic;

  throw new Error(
    "Could not parse the spreadsheet. Make sure it has columns for service names, rates, hours, and weeks — or use a file exported from this app."
  );
}
