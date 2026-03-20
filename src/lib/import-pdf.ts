import { v4 as uuidv4 } from "uuid";
import type { ClientBudget, ServiceLineItem, ServiceCategory, BudgetType, PensionStatus, BudgetTab } from "./types";
import { ALL_CLASSIFICATIONS, QUARTERS, CARE_MANAGEMENT_DEFAULT_PCT, PENSION_STATUS_LABELS } from "./constants";

// ─── PDF Import ───────────────────────────────────────────────────────────────
// Parses extracted text from our own PDF export or similar structured PDFs.

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
  if (lower.includes("independence")) return "independence";
  if (lower.includes("everyday")) return "everyday";
  // By service name
  if (lower.includes("nurs") || lower.includes("physio") || lower.includes("therapy") || lower.includes("speech") || lower.includes("podiat") || lower.includes("dietit") || lower.includes("psychol") || lower.includes("occ")) return "clinical";
  if (lower.includes("domestic") || lower.includes("garden") || lower.includes("home mod") || lower.includes("home maint")) return "everyday";
  return "independence";
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
  }
  // Try matching a number
  const numMatch = raw.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 1 && num <= 8) return String(num);
  }
  return "4";
}

function findQuarter(raw: string): string {
  for (const q of QUARTERS) {
    if (raw.includes(q)) return q;
  }
  // Partial match
  for (const q of QUARTERS) {
    const parts = q.split("(")[0].trim();
    if (raw.includes(parts)) return q;
  }
  return QUARTERS[2];
}

function parseCurrency(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Which budget section are we currently parsing?
function detectSection(line: string): BudgetType | null {
  const lower = line.toLowerCase().trim();
  if (lower === "ongoing services" || lower.startsWith("ongoing")) return "ongoing";
  if (lower.includes("restorative")) return "restorative";
  if (lower.includes("end-of-life") || lower.includes("end of life")) return "end_of_life";
  if (lower.includes("at-hm") || lower.includes("athm")) return "at_hm";
  return null;
}

export function parsePdfText(text: string): ClientBudget {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let clientName = "";
  let macId = "";
  let classificationId = "4";
  let pensionStatus: PensionStatus = "full_pensioner";
  let quarter = QUARTERS[2];
  let careManagementPct = CARE_MANAGEMENT_DEFAULT_PCT;

  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);
  let currentSection: BudgetType = "ongoing";

  // Parse key-value client details
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Key-value patterns from our PDF export
    if (line.startsWith("Client Name") || line.toLowerCase().includes("client name")) {
      const val = line.replace(/client\s*name\s*/i, "").trim();
      if (val) clientName = val;
      else if (lines[i + 1] && !lines[i + 1].includes(":")) {
        clientName = lines[i + 1].trim();
      }
    }
    if (line.includes("Aged Care ID") || line.includes("MAC ID") || line.includes("My Aged Care")) {
      const val = line.replace(/.*(?:aged care id|mac id|my aged care)\s*/i, "").trim();
      if (val) macId = val;
      else if (lines[i + 1]) macId = lines[i + 1].trim();
    }
    if (line.toLowerCase().includes("classification") && !line.toLowerCase().includes("service")) {
      classificationId = findClassification(line);
    }
    if (line.toLowerCase().includes("pension status") || line.toLowerCase().includes("pension")) {
      const val = line.replace(/.*pension\s*(?:status)?\s*/i, "").trim();
      if (val) pensionStatus = normalisePensionStatus(val);
    }
    if (line.toLowerCase().includes("quarter") && !line.toLowerCase().includes("quarterly")) {
      quarter = findQuarter(line);
    }
    if (line.toLowerCase().includes("care management") && line.includes("%")) {
      const match = line.match(/(\d+(?:\.\d+)?)\s*%/);
      if (match) careManagementPct = parseFloat(match[1]);
    }

    // Detect section headers
    const section = detectSection(line);
    if (section !== null) {
      currentSection = section;
      continue;
    }

    // Try to parse service lines
    // Our PDF format: "Service Name  Category  $Cost  $Contrib  $Subsidy"
    // Look for lines with dollar amounts
    const dollarMatches = line.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (dollarMatches && dollarMatches.length >= 1) {
      // Extract service name (everything before the first category badge or dollar sign)
      const firstDollar = line.indexOf("$");
      let servicePart = line.substring(0, firstDollar).trim();

      // Check if there's a category in the line
      let category: ServiceCategory = "independence";
      const catPatterns: [RegExp, ServiceCategory][] = [
        [/\bClinical\b/i, "clinical"],
        [/\bIndependence\b/i, "independence"],
        [/\bEveryday\b/i, "everyday"],
      ];
      for (const [pattern, cat] of catPatterns) {
        if (pattern.test(servicePart)) {
          category = cat;
          servicePart = servicePart.replace(pattern, "").trim();
          break;
        }
        if (pattern.test(line)) {
          category = cat;
          break;
        }
      }

      // Skip header/total/summary lines
      if (!servicePart || servicePart.toLowerCase() === "total" || servicePart.toLowerCase() === "service") continue;
      if (servicePart.toLowerCase().includes("utilisation") || servicePart.toLowerCase().includes("remaining")) continue;
      if (servicePart.toLowerCase().includes("budget") || servicePart.toLowerCase().includes("annual")) continue;
      if (servicePart.toLowerCase().includes("care management") && servicePart.toLowerCase() !== "nursing care") continue;
      if (servicePart.toLowerCase().includes("available")) continue;

      // If no category found by keyword, try inferring from service name
      if (category === "independence") {
        category = normaliseCategory(servicePart);
      }

      const cost = parseCurrency(dollarMatches[0]);
      if (cost <= 0) continue;

      // We don't have rate/hours/weeks from PDF — store as lump sum with the total cost
      // User can break it down after import
      const service: ServiceLineItem = {
        id: uuidv4(),
        name: servicePart,
        category,
        ratePerHour: 0,
        hoursPerWeek: 0,
        weeksInQuarter: 1,
        isLumpSum: true,
        lumpSumAmount: cost,
      };

      const tab = tabs.find((t) => t.budgetType === currentSection);
      if (tab) tab.services.push(service);
    }
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
