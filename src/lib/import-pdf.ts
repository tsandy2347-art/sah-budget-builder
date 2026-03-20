import { v4 as uuidv4 } from "uuid";
import type { ClientBudget, ServiceLineItem, ServiceCategory, BudgetType, PensionStatus, BudgetTab } from "./types";
import { ALL_CLASSIFICATIONS, QUARTERS, CARE_MANAGEMENT_DEFAULT_PCT } from "./constants";

// ─── PDF Import ───────────────────────────────────────────────────────────────
// Parses extracted text from our own PDF export or similar structured PDFs.
// PDF text extraction often produces unpredictable line breaks, so we use
// multiple strategies: same-line matching, next-line matching, and full-text
// regex scanning.

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
  if (lower.includes("nurs") || lower.includes("physio") || lower.includes("therapy") || lower.includes("speech") || lower.includes("podiat") || lower.includes("dietit") || lower.includes("psychol") || lower.includes("occ") || lower.includes("continence") || lower.includes("exercise")) return "clinical";
  if (lower.includes("domestic") || lower.includes("garden") || lower.includes("home mod") || lower.includes("home maint") || lower.includes("ramp") || lower.includes("bathroom mod")) return "everyday";
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
  const numMatch = raw.match(/classification\s*(\d+)/i);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 1 && num <= 8) return String(num);
  }
  const levelMatch = raw.match(/level\s*(\d+)/i);
  if (levelMatch) {
    const num = parseInt(levelMatch[1]);
    if (num >= 1 && num <= 4) return `t${num}`;
  }
  // Just a bare number
  const bareNum = raw.match(/(\d+)/);
  if (bareNum) {
    const num = parseInt(bareNum[1]);
    if (num >= 1 && num <= 8) return String(num);
  }
  return "4";
}

function findQuarter(raw: string): string {
  for (const q of QUARTERS) {
    if (raw.includes(q)) return q;
  }
  for (const q of QUARTERS) {
    const parts = q.split("(")[0].trim();
    if (raw.includes(parts)) return q;
  }
  // Try month abbreviations
  const monthMatch = raw.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  if (monthMatch) {
    const month = monthMatch[1].toLowerCase();
    for (const q of QUARTERS) {
      if (q.toLowerCase().includes(month)) return q;
    }
  }
  return QUARTERS[2];
}

function parseCurrency(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function detectSection(line: string): BudgetType | null {
  const lower = line.toLowerCase().trim();
  if (lower === "ongoing services" || (lower.startsWith("ongoing") && lower.length < 30)) return "ongoing";
  if (lower.includes("restorative") && lower.length < 30) return "restorative";
  if ((lower.includes("end-of-life") || lower.includes("end of life")) && lower.length < 30) return "end_of_life";
  if ((lower.includes("at-hm") || lower.includes("athm")) && lower.length < 30) return "at_hm";
  return null;
}

// Extract a value that appears after a label — either on the same line or the next line
function extractAfterLabel(lines: string[], labelPattern: RegExp): string {
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(labelPattern);
    if (match) {
      // Check if there's content after the label on the same line
      const afterLabel = lines[i].replace(labelPattern, "").trim();
      if (afterLabel && afterLabel.length > 0) return afterLabel;
      // Otherwise check the next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        // Skip if next line looks like another label
        if (nextLine && !nextLine.match(/^(Client|My Aged|Classification|Pension|Quarter|Care Manag|Provider|Annual|Quarterly|Available|Service|Category|Generated)/i)) {
          return nextLine;
        }
      }
    }
  }
  return "";
}

// Also try full-text regex for cases where labels and values get merged
function extractFromFullText(fullText: string, pattern: RegExp): string {
  const match = fullText.match(pattern);
  return match ? match[1].trim() : "";
}

export function parsePdfText(text: string): ClientBudget {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = text.replace(/\n/g, " ").replace(/\s+/g, " ");

  // ─── Client details ─────────────────────────────────────────────────
  // Strategy: try line-by-line first, then full-text regex fallback

  let clientName = extractAfterLabel(lines, /client\s*name/i);
  if (!clientName) {
    clientName = extractFromFullText(fullText, /Client\s*Name\s+([^$\n]+?)(?:\s+(?:My Aged|Classification|Pension|Quarter|Care|Provider|Annual|Generated))/i);
  }
  // Clean up: remove any trailing labels that got merged
  clientName = clientName.replace(/\s*(My Aged Care|Classification|Pension|Quarter).*$/i, "").trim();

  let macId = extractAfterLabel(lines, /(?:my\s*aged\s*care\s*id|mac\s*id)/i);
  if (!macId) {
    macId = extractFromFullText(fullText, /(?:My Aged Care ID|MAC ID)\s+([\d-]+)/i);
  }
  macId = macId.replace(/\s*(Classification|Pension|Quarter).*$/i, "").trim();

  let classificationRaw = extractAfterLabel(lines, /classification/i);
  if (!classificationRaw) {
    classificationRaw = extractFromFullText(fullText, /Classification\s+((?:Classification\s+)?\d+|(?:Transitioned\s+HCP\s+Level\s+)\d+)/i);
  }
  const classificationId = findClassification(classificationRaw || "4");

  let pensionRaw = extractAfterLabel(lines, /pension\s*status/i);
  if (!pensionRaw) {
    pensionRaw = extractFromFullText(fullText, /Pension\s*Status\s+(Full Pensioner|Part Pensioner|Self.Funded Retiree|CSHC)/i);
  }
  const pensionStatus = normalisePensionStatus(pensionRaw || "full_pensioner");

  let quarterRaw = extractAfterLabel(lines, /^quarter$/i) || extractAfterLabel(lines, /quarter(?!\s*ly)/i);
  if (!quarterRaw) {
    quarterRaw = extractFromFullText(fullText, /Quarter\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^$]*?\(Q\d\))/i);
  }
  const quarter = findQuarter(quarterRaw || "");

  let cmRaw = extractAfterLabel(lines, /care\s*management/i);
  if (!cmRaw) {
    cmRaw = extractFromFullText(fullText, /Care\s*Management\s+(\d+(?:\.\d+)?)\s*%/i);
  }
  const cmMatch = (cmRaw || "").match(/(\d+(?:\.\d+)?)\s*%?/);
  const careManagementPct = cmMatch ? parseFloat(cmMatch[1]) : CARE_MANAGEMENT_DEFAULT_PCT;

  // ─── Services ───────────────────────────────────────────────────────
  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);
  let currentSection: BudgetType = "ongoing";

  const skipPatterns = /^(total|service|category|qtr cost|client contrib|govt subsidy|budget|annual|quarterly|care management|available|utilisation|remaining|carryover|disclaimer|this document|verify current|generated)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers
    const section = detectSection(line);
    if (section !== null) {
      currentSection = section;
      continue;
    }

    // Look for lines with dollar amounts (service rows)
    const dollarMatches = line.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (!dollarMatches || dollarMatches.length < 1) continue;

    // Extract service name (everything before first $ or category keyword)
    const firstDollar = line.indexOf("$");
    let servicePart = line.substring(0, firstDollar).trim();

    // Extract category if present in the line
    let category: ServiceCategory = "independence";
    const catPatterns: [RegExp, ServiceCategory][] = [
      [/\bClinical\b/i, "clinical"],
      [/\bIndependence\b/i, "independence"],
      [/\bEveryday\b/i, "everyday"],
    ];
    for (const [pattern, cat] of catPatterns) {
      if (pattern.test(line)) {
        category = cat;
        servicePart = servicePart.replace(pattern, "").trim();
        break;
      }
    }

    // Skip non-service lines
    if (!servicePart || skipPatterns.test(servicePart)) continue;

    // If no explicit category found, infer from service name
    if (!catPatterns.some(([p]) => p.test(line))) {
      category = normaliseCategory(servicePart);
    }

    const cost = parseCurrency(dollarMatches[0]);
    if (cost <= 0) continue;

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
