import { v4 as uuidv4 } from "uuid";
import type { ClientBudget, ServiceLineItem, ServiceCategory, BudgetType, PensionStatus, BudgetTab } from "./types";
import { ALL_CLASSIFICATIONS, QUARTERS, CARE_MANAGEMENT_DEFAULT_PCT } from "./constants";

// ─── PDF Import ───────────────────────────────────────────────────────────────
// Parses:
// 1. AlayaCare budget exports (primary format from JBC)
// 2. Our own PDF exports
// 3. Generic PDFs with dollar amounts

function defaultTab(budgetType: BudgetType): BudgetTab {
  return {
    budgetType,
    services: [],
    pathwayConfig: { restorativeTier: "standard", athmTier: "low" },
  };
}

function normaliseCategory(name: string): ServiceCategory {
  const lower = name.toLowerCase();
  // Clinical
  if (lower.includes("nurs") || lower.includes("rn") || lower.includes("physio") || lower.includes("therapy") ||
      lower.includes("speech") || lower.includes("podiat") || lower.includes("dietit") || lower.includes("psychol") ||
      lower.includes("occ") || lower.includes("continence") || lower.includes("exercise") || lower.includes("clinical") ||
      lower.includes("allied health") || lower.includes("massage") || lower.includes("remedial")) return "clinical";
  // Everyday
  if (lower.includes("domestic") || lower.includes("garden") || lower.includes("home mod") || lower.includes("home maint") ||
      lower.includes("ramp") || lower.includes("bathroom") || lower.includes("pressure clean") || lower.includes("handyman") ||
      lower.includes("consumable") || lower.includes("capital")) return "everyday";
  // Independence
  if (lower.includes("social") || lower.includes("personal care") || lower.includes("meal") || lower.includes("transport") ||
      lower.includes("cab") || lower.includes("travel") || lower.includes("respite")) return "independence";
  return "independence"; // safe default
}

function findHcpLevel(text: string): string {
  // Match "Level 1" through "Level 4" — map to transitioned HCP
  const levelMatch = text.match(/level\s*(\d)/i);
  if (levelMatch) {
    const num = parseInt(levelMatch[1]);
    if (num >= 1 && num <= 4) return `t${num}`;
  }
  // Match "Classification X"
  const classMatch = text.match(/classification\s*(\d)/i);
  if (classMatch) {
    const num = parseInt(classMatch[1]);
    if (num >= 1 && num <= 8) return String(num);
  }
  return "t3"; // default to Level 3 if we can't determine
}

function findQuarter(text: string): string {
  // Try to match a date range and determine the quarter
  const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*to\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    const startMonth = parseInt(dateMatch[2]);
    const startYear = parseInt(dateMatch[3]);
    // Find the quarter that contains this start date
    for (const q of QUARTERS) {
      if (q.includes(String(startYear)) || q.includes(String(startYear + 1))) {
        return q;
      }
    }
  }
  return QUARTERS[2];
}

function parseCurrency(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ─── AlayaCare format parser ──────────────────────────────────────────────────

interface AlayaService {
  sectionName: string;   // e.g. "HCP - Domestic Assistance"
  serviceName: string;   // e.g. "SAH - Meal Preparation" or from Notes
  ratePerHour: number;
  hoursPerWeek: number;
  total: number;
  notes: string;
  type: "service" | "fee" | "premium";
}

function parseAlayaCare(text: string): { clientName: string; level: string; services: AlayaService[] } | null {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const fullText = lines.join(" ");

  // Detect AlayaCare format
  if (!fullText.includes("alayacare") && !fullText.includes("FunderHCP") && !fullText.includes("Service Total")) {
    return null;
  }

  // ─── Client name ────────────────────────────────────────────────────
  // Pattern: "Alan (Alan) Bashford" at the top, or from "Client Budget - X's"
  let clientName = "";

  // Try "Client Budget - Name's ..." pattern
  const budgetNameMatch = fullText.match(/Client Budget\s*-\s*(.+?)(?:'s|'s)\s/i);
  if (budgetNameMatch) {
    clientName = budgetNameMatch[1].trim();
  }

  // Try the header name pattern "FirstName (Preferred) LastName Active"
  if (!clientName) {
    for (const line of lines) {
      const headerMatch = line.match(/^([A-Z][a-z]+(?:\s*\([^)]+\))?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+Active/);
      if (headerMatch) {
        // Strip the preferred name in brackets for cleaner name
        clientName = headerMatch[1].replace(/\s*\([^)]+\)\s*/, " ").trim();
        break;
      }
    }
  }

  // Try title pattern
  if (!clientName) {
    const titleMatch = fullText.match(/Alan \(Alan\) Bashford|([A-Z][a-z]+\s+(?:\([^)]+\)\s+)?[A-Z][a-z]+)\s+Active/);
    if (titleMatch) {
      clientName = (titleMatch[1] || titleMatch[0]).replace(/\s*\([^)]+\)\s*/, " ").replace(/\s+Active.*$/, "").trim();
    }
  }

  // ─── Level / Classification ─────────────────────────────────────────
  let level = "t3";
  const funderMatch = fullText.match(/(?:Funder|Level)\s*(?:HCP\s*SC\s*\(HCP\s*SC\)\s*-?\s*)?Level\s*(\d)/i);
  if (funderMatch) {
    level = `t${funderMatch[1]}`;
  } else {
    // Try from budget name or title
    const lvlMatch = fullText.match(/Lvl\s*(\d)|Level\s*(\d)/i);
    if (lvlMatch) {
      const num = lvlMatch[1] || lvlMatch[2];
      level = `t${num}`;
    }
  }

  // ─── Parse service blocks ──────────────────────────────────────────
  const services: AlayaService[] = [];
  let currentSection = "";
  let currentServiceName = "";
  let currentRate = 0;
  let currentHours = 0;
  let currentTotal = 0;
  let currentNotes = "";
  let currentType: "service" | "fee" | "premium" = "service";
  let inServiceBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers like "HCP - Domestic Assistance (29/07/2025 - 15/09/2026)"
    const sectionMatch = line.match(/^(HCP\s*-\s*.+?)(?:\s*\([\d/]+\s*-\s*[\d/]+\))?$/);
    if (sectionMatch && !line.startsWith("FunderHCP") && !line.startsWith("ServiceHCP") && !line.startsWith("PremiumHCP") && !line.startsWith("Rate") && !line.startsWith("Fee")) {
      // Save previous block
      if (inServiceBlock && currentTotal > 0) {
        services.push({
          sectionName: currentSection,
          serviceName: currentServiceName || currentSection,
          ratePerHour: currentRate,
          hoursPerWeek: currentHours,
          total: currentTotal,
          notes: currentNotes,
          type: currentType,
        });
      }
      currentSection = sectionMatch[1].trim();
      currentServiceName = "";
      currentRate = 0;
      currentHours = 0;
      currentTotal = 0;
      currentNotes = "";
      currentType = "service";
      inServiceBlock = true;
      continue;
    }

    // Also detect fee/premium section headers
    const feeSection = line.match(/^((?:Package|Care)\s+Management\s*-\s*Level\s*\d)/i);
    if (feeSection) {
      if (inServiceBlock && currentTotal > 0) {
        services.push({ sectionName: currentSection, serviceName: currentServiceName || currentSection, ratePerHour: currentRate, hoursPerWeek: currentHours, total: currentTotal, notes: currentNotes, type: currentType });
      }
      currentSection = feeSection[1];
      currentServiceName = feeSection[1];
      currentRate = 0; currentHours = 0; currentTotal = 0; currentNotes = "";
      currentType = "fee";
      inServiceBlock = true;
      continue;
    }

    if (!inServiceBlock) continue;

    // Service name: "ServiceSAH - Registered Nurse" or "ServiceHCP - ..."
    const serviceNameMatch = line.match(/^Service\s*(.+)/i);
    if (serviceNameMatch) {
      currentServiceName = serviceNameMatch[1].trim();
      // Clean up "SAH - " or "HCP - " prefix for cleaner names
      currentServiceName = currentServiceName.replace(/^(?:SAH|HCP)\s*-\s*/i, "").trim();
      continue;
    }

    // Premium name: "PremiumHCP - Allied Health" or "PremiumTravel KMs..."
    const premiumMatch = line.match(/^Premium\s*(.+)/i);
    if (premiumMatch) {
      currentType = "premium";
      currentServiceName = premiumMatch[1].trim().replace(/^(?:SAH|HCP)\s*-\s*/i, "").trim();
      continue;
    }

    // Fee name
    const feeMatch = line.match(/^Fee\s+(.+)/i);
    if (feeMatch) {
      currentType = "fee";
      currentServiceName = feeMatch[1].trim();
      continue;
    }

    // Rate line: "$155.00 per hour | 2 hours total | $310.00 total"
    // or: "$90.00 per hour | 1 hour per week | $90.00 per week"
    // or: "$90.00 per hour | 1 hour per month | $90.00 per month"
    const rateMatch = line.match(/\$?([\d,.]+)\s*per\s*hour/i);
    if (rateMatch) {
      currentRate = parseFloat(rateMatch[1].replace(",", ""));
    }
    const hoursMatch = line.match(/(\d+(?:\.\d+)?)\s*hour(?:s)?\s*(?:per\s*(week|month)|total)/i);
    if (hoursMatch) {
      const hrs = parseFloat(hoursMatch[1]);
      const period = hoursMatch[2]?.toLowerCase();
      if (period === "month") {
        currentHours = hrs / 4.33; // approx weekly
      } else {
        currentHours = hrs;
      }
    }

    // Notes line
    const notesMatch = line.match(/^Notes\s+(.+)/i);
    if (notesMatch) {
      currentNotes = notesMatch[1].trim();
      continue;
    }

    // Service Total / Fee Total / Premium Total
    const totalMatch = line.match(/(?:Service|Fee|Premium)\s*Total/i);
    if (totalMatch) {
      // The dollar amount might be on this line or the next
      const amountOnLine = line.match(/\$([\d,.]+)/);
      if (amountOnLine) {
        currentTotal = parseCurrency(amountOnLine[0]);
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const amountNext = nextLine.match(/\$([\d,.]+)/);
        if (amountNext) {
          currentTotal = parseCurrency(amountNext[0]);
        }
      }

      // Save this service block
      if (currentTotal > 0) {
        services.push({
          sectionName: currentSection,
          serviceName: currentNotes || currentServiceName || currentSection,
          ratePerHour: currentRate,
          hoursPerWeek: currentHours,
          total: currentTotal,
          notes: currentNotes,
          type: currentType,
        });
      }
      // Reset for next block (but keep section name)
      currentServiceName = "";
      currentRate = 0;
      currentHours = 0;
      currentTotal = 0;
      currentNotes = "";
      inServiceBlock = false;
      continue;
    }
  }

  // Don't forget the last block
  if (inServiceBlock && currentTotal > 0) {
    services.push({ sectionName: currentSection, serviceName: currentNotes || currentServiceName || currentSection, ratePerHour: currentRate, hoursPerWeek: currentHours, total: currentTotal, notes: currentNotes, type: currentType });
  }

  return { clientName, level, services };
}

// ─── Our own PDF format parser ────────────────────────────────────────────────

function parseOwnFormat(text: string): ClientBudget | null {
  if (!text.includes("Support at Home") || !text.includes("Budget Plan")) return null;

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const fullText = text.replace(/\n/g, " ").replace(/\s+/g, " ");

  let clientName = "";
  let macId = "";
  let classificationId = "4";
  let pensionStatus: PensionStatus = "full_pensioner";
  let quarter = QUARTERS[2];
  let careManagementPct = CARE_MANAGEMENT_DEFAULT_PCT;

  // Extract fields from full text
  const nameMatch = fullText.match(/Client\s*Name\s+([^$]+?)(?:\s+My Aged Care|$)/i);
  if (nameMatch) clientName = nameMatch[1].trim();

  const macMatch = fullText.match(/(?:My Aged Care ID|MAC ID)\s+([\d-]+)/i);
  if (macMatch) macId = macMatch[1].trim();

  const classMatch = fullText.match(/Classification\s+(Classification\s+\d+|Transitioned[^$]+?Level\s+\d+)/i);
  if (classMatch) classificationId = findHcpLevel(classMatch[1]);

  const pensionMatch = fullText.match(/Pension\s*Status\s+(Full Pensioner|Part Pensioner|Self.Funded)/i);
  if (pensionMatch) {
    const p = pensionMatch[1].toLowerCase();
    if (p.includes("self")) pensionStatus = "self_funded";
    else if (p.includes("part")) pensionStatus = "part_pensioner";
  }

  const quarterMatch = fullText.match(/Quarter\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^$]*?\(Q\d\))/i);
  if (quarterMatch) quarter = findQuarter(quarterMatch[0]);

  const cmMatch = fullText.match(/Care\s*Management\s+(\d+(?:\.\d+)?)\s*%/i);
  if (cmMatch) careManagementPct = parseFloat(cmMatch[1]);

  // Parse services (same as before — lines with $ amounts under section headers)
  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);
  let currentSection: BudgetType = "ongoing";

  const skipPatterns = /^(total|service$|category|qtr cost|client contrib|govt subsidy|budget|annual|quarterly|care management|available|utilisation|remaining|carryover|disclaimer|this document|verify current|generated)/i;

  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    if (lower === "ongoing services" || (lower.startsWith("ongoing") && lower.length < 30)) { currentSection = "ongoing"; continue; }
    if (lower.includes("restorative") && lower.length < 30) { currentSection = "restorative"; continue; }
    if ((lower.includes("end-of-life") || lower.includes("end of life")) && lower.length < 30) { currentSection = "end_of_life"; continue; }
    if ((lower.includes("at-hm") || lower.includes("athm")) && lower.length < 30) { currentSection = "at_hm"; continue; }

    const dollarMatches = line.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (!dollarMatches || dollarMatches.length < 1) continue;

    const firstDollar = line.indexOf("$");
    let servicePart = line.substring(0, firstDollar).trim();
    let category: ServiceCategory = "independence";
    for (const [pat, cat] of [[/\bClinical\b/i, "clinical"], [/\bIndependence\b/i, "independence"], [/\bEveryday\b/i, "everyday"]] as [RegExp, ServiceCategory][]) {
      if (pat.test(line)) { category = cat; servicePart = servicePart.replace(pat, "").trim(); break; }
    }
    if (!servicePart || skipPatterns.test(servicePart)) continue;
    if (category === "independence") category = normaliseCategory(servicePart);

    const cost = parseCurrency(dollarMatches[0]);
    if (cost <= 0) continue;

    const tab = tabs.find(t => t.budgetType === currentSection);
    if (tab) tab.services.push({
      id: uuidv4(), name: servicePart, category, ratePerHour: 0, hoursPerWeek: 0, weeksInQuarter: 1, isLumpSum: true, lumpSumAmount: cost,
    });
  }

  const now = new Date().toISOString();
  return {
    id: uuidv4(), clientName, macId, providerName: "Just Better Care Sunshine Coast PTY LTD",
    classificationId, pensionStatus, quarter, careManagementPct,
    partPensionerRates: { independence: 0.25, everyday: 0.475 },
    tabs, activeTab: "ongoing", createdAt: now, updatedAt: now,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parsePdfText(text: string): ClientBudget {
  // Try our own format first
  const own = parseOwnFormat(text);
  if (own) return own;

  // Try AlayaCare format
  const alaya = parseAlayaCare(text);
  if (alaya && alaya.services.length > 0) {
    const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);
    const ongoingTab = tabs.find(t => t.budgetType === "ongoing")!;

    for (const svc of alaya.services) {
      // Skip $0 services and fee items (package/care management)
      if (svc.total <= 0) continue;
      if (svc.type === "fee") continue; // care/package management fees — not services

      // Use the notes field as the service name if it's more descriptive
      let name = svc.serviceName;
      // Clean up generic names using the section header
      if (name === "Other Subcontracted/Brokered Staff" || name === "Consumables" || name === "Allied Health") {
        name = svc.notes || svc.sectionName.replace(/^HCP\s*-\s*/i, "").replace(/\s*\([\d/].*$/, "").trim();
      }
      // Clean up section name prefix
      name = name.replace(/^HCP\s*-\s*/i, "").replace(/\s*\([\d/].*$/, "").trim();

      const category = normaliseCategory(name + " " + svc.sectionName);

      // Convert annual total to quarterly
      // AlayaCare budgets are typically annual — divide by 4 for quarterly
      const quarterlyTotal = Math.round((svc.total / 4) * 100) / 100;

      const service: ServiceLineItem = {
        id: uuidv4(),
        name,
        category,
        ratePerHour: svc.ratePerHour || 0,
        hoursPerWeek: svc.hoursPerWeek || 0,
        weeksInQuarter: svc.ratePerHour > 0 && svc.hoursPerWeek > 0 ? 13 : 1,
        isLumpSum: !(svc.ratePerHour > 0 && svc.hoursPerWeek > 0),
        lumpSumAmount: svc.ratePerHour > 0 && svc.hoursPerWeek > 0 ? 0 : quarterlyTotal,
      };

      ongoingTab.services.push(service);
    }

    const now = new Date().toISOString();
    return {
      id: uuidv4(),
      clientName: alaya.clientName,
      macId: "",
      providerName: "Just Better Care Sunshine Coast PTY LTD",
      classificationId: alaya.level,
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

  // Fallback: generic PDF with dollar amounts
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);
  const ongoingTab = tabs.find(t => t.budgetType === "ongoing")!;

  for (const line of lines) {
    const dollarMatches = line.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (!dollarMatches) continue;
    const firstDollar = line.indexOf("$");
    const servicePart = line.substring(0, firstDollar).trim();
    if (!servicePart || servicePart.length < 3 || servicePart.length > 60) continue;
    if (/^(total|source|income|balance|expense|fee|funder|rate|notes|cost|flag|premium\s*total|service\s*total|fee\s*total)/i.test(servicePart)) continue;
    const cost = parseCurrency(dollarMatches[0]);
    if (cost <= 0) continue;

    ongoingTab.services.push({
      id: uuidv4(), name: servicePart, category: normaliseCategory(servicePart),
      ratePerHour: 0, hoursPerWeek: 0, weeksInQuarter: 1, isLumpSum: true, lumpSumAmount: cost,
    });
  }

  // Try to extract client name from filename-style patterns
  let clientName = "";
  const nameMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+Active/);
  if (nameMatch) clientName = nameMatch[1].replace(/\s*\([^)]+\)\s*/, " ").trim();

  const now = new Date().toISOString();
  return {
    id: uuidv4(), clientName, macId: "", providerName: "Just Better Care Sunshine Coast PTY LTD",
    classificationId: "4", pensionStatus: "full_pensioner", quarter: QUARTERS[2],
    careManagementPct: CARE_MANAGEMENT_DEFAULT_PCT,
    partPensionerRates: { independence: 0.25, everyday: 0.475 },
    tabs, activeTab: "ongoing", createdAt: now, updatedAt: now,
  };
}
