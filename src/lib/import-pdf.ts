import { v4 as uuidv4 } from "uuid";
import type { ClientBudget, ServiceLineItem, ServiceCategory, BudgetType, PensionStatus, BudgetTab } from "./types";
import { ALL_CLASSIFICATIONS, QUARTERS, CARE_MANAGEMENT_DEFAULT_PCT } from "./constants";

// ─── PDF Import ───────────────────────────────────────────────────────────────

function defaultTab(budgetType: BudgetType): BudgetTab {
  return {
    budgetType,
    services: [],
    pathwayConfig: { restorativeTier: "standard", athmTier: "low" },
  };
}

function normaliseCategory(name: string): ServiceCategory {
  const lower = name.toLowerCase();
  if (lower.includes("nurs") || lower.includes("rn") || lower.includes("physio") || lower.includes("therapy") ||
      lower.includes("speech") || lower.includes("podiat") || lower.includes("dietit") || lower.includes("psychol") ||
      lower.includes("occ") || lower.includes("continence") || lower.includes("exercise") || lower.includes("clinical") ||
      lower.includes("allied health") || lower.includes("massage") || lower.includes("remedial")) return "clinical";
  if (lower.includes("domestic") || lower.includes("garden") || lower.includes("home mod") || lower.includes("home maint") ||
      lower.includes("ramp") || lower.includes("bathroom") || lower.includes("pressure clean") || lower.includes("handyman") ||
      lower.includes("consumable") || lower.includes("capital") || lower.includes("transport") ||
      lower.includes("cab") || lower.includes("travel") || lower.includes("meal deliver")) return "everyday";
  if (lower.includes("social") || lower.includes("personal care") || lower.includes("meal") ||
      lower.includes("respite") || lower.includes("medication") || lower.includes("med prom")) return "independence";
  return "independence";
}

function parseCurrency(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ─── AlayaCare format parser ──────────────────────────────────────────────────
// Tested against actual pdf-parse output from AlayaCare budget exports.
// Key patterns in extracted text:
//   "ServiceSAH - Registered Nurse"  (no space after Service)
//   "PremiumHCP - Transport Services" (no space after Premium)
//   "FeePackage Management - Level 3" (no space after Fee)
//   "Rate$155.00 per hour | 2 hours total | $310.00 total"
//   "Notes\nActual note text"  (notes value on next line)
//   "Service Total\n$310.00"
//   "Premium Total\n$600.00"
//   "Fee Total$3,763.15"

interface ParsedBlock {
  serviceName: string;
  sectionName: string;
  ratePerHour: number;
  hoursPerWeek: number;
  total: number;
  notes: string;
  blockType: "service" | "fee" | "premium";
}

function parseAlayaCare(text: string): ClientBudget | null {
  // Detect AlayaCare format
  if (!text.includes("alayacare") && !text.includes("FunderHCP") && !text.includes("Service Total")) {
    return null;
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // ─── Client name ────────────────────────────────────────────────────
  // Look for pattern: line with a name, next line is "Active"
  let clientName = "";
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if (lines[i + 1] && lines[i + 1] === "Active") {
      // This line has the name — strip preferred name in brackets
      clientName = lines[i].replace(/\s*\([^)]+\)\s*/, " ").trim();
      break;
    }
  }
  // Fallback: try "Client Budget - Name's ..."
  if (!clientName) {
    for (const line of lines) {
      const match = line.match(/Client Budget\s*-\s*(.+?)(?:'s|'s)\s/i);
      if (match) {
        clientName = match[1].trim();
        break;
      }
    }
  }

  // ─── HCP Level ──────────────────────────────────────────────────────
  let classificationId = "t3";
  for (const line of lines) {
    // "HCP SC (HCP SC) -\nLevel 3" or "Lvl 3" in budget name
    const lvlMatch = line.match(/Level\s*(\d)/i);
    if (lvlMatch) {
      classificationId = `t${lvlMatch[1]}`;
      break;
    }
    const lvlMatch2 = line.match(/Lvl\s*(\d)/i);
    if (lvlMatch2) {
      classificationId = `t${lvlMatch2[1]}`;
      break;
    }
  }

  // ─── Pass 1: Collect ALL section headers in order ────────────────────
  // Section headers appear as "HCP - Domestic Assistance" followed by a date range.
  // In some PDFs they cluster together (sidebar) before the actual blocks,
  // so we can't rely on a single currentSectionName variable.
  const allSectionHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match "HCP - Something" section headers (not Service/Premium/Fee/Funder prefixed)
    if (line.startsWith("FunderHCP") || line.startsWith("ServiceHCP") || line.startsWith("ServiceSAH") ||
        line.startsWith("PremiumHCP") || line.startsWith("PremiumTravel") || line.startsWith("PremiumSAH") ||
        line.startsWith("Rate") || line.startsWith("Fee") ||
        line.startsWith("Service Total") || line.startsWith("Premium Total") || line.startsWith("Fee Total")) {
      continue;
    }

    // "HCP - Something (dd/mm/yyyy - dd/mm/yyyy)" on same line
    const sectionWithDate = line.match(/^(HCP\s*-\s*.+?)\s*\(\d{2}\/\d{2}\/\d{4}/);
    if (sectionWithDate) {
      allSectionHeaders.push(sectionWithDate[1].trim());
      continue;
    }

    // "HCP - Something" where next line has date or is a continuation
    const sectionMatch = line.match(/^(HCP\s*-\s*.+?)$/);
    if (sectionMatch) {
      const nextLine = lines[i + 1] || "";
      const nextLine2 = lines[i + 2] || "";

      if (nextLine.match(/^\(\d{2}\/\d{2}\/\d{4}/)) {
        // Next line is "(dd/mm/yyyy ..." — simple case
        allSectionHeaders.push(sectionMatch[1].trim());
      } else if (nextLine.match(/^[A-Za-z]/) && !nextLine.match(/^(Funder|Service|Premium|Rate|Fee|Cost|Flag|Notes)/)) {
        // Next line is a name continuation: "Cab" + "Charges (18/08/..."
        // or "Cab" + "Charges" + "(18/08/..."
        let headerName = sectionMatch[1].trim();
        if (nextLine.match(/\(\d{2}\/\d{2}\/\d{4}/)) {
          headerName += " " + nextLine.replace(/\s*\(\d{2}\/\d{2}\/\d{4}.*$/, "").trim();
          allSectionHeaders.push(headerName);
        } else if (nextLine2.match(/^\(\d{2}\/\d{2}\/\d{4}/)) {
          headerName += " " + nextLine;
          allSectionHeaders.push(headerName);
        }
      } else if (line.match(/\(\d{2}\/\d{2}\/\d{4}/)) {
        allSectionHeaders.push(sectionMatch[1].replace(/\s*\(\d{2}\/\d{2}\/\d{4}.*$/, "").trim());
      }
    }

    // Also catch standalone section names followed by date on next line
    // like "Travel KMs Within Visit (18/08/2025 -" where "Travel" doesn't start with "HCP"
    const nonHcpSection = line.match(/^((?:Travel|Dementia|Income|Basic Daily)\s.+?)\s*\(\d{2}\/\d{2}\/\d{4}/);
    if (nonHcpSection) {
      allSectionHeaders.push(nonHcpSection[1].trim());
    }
  }

  // ─── Pass 2: Parse service/fee/premium blocks ──────────────────────
  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect service block start: "ServiceSAH - ..." or "ServiceHCP - ..."
    // Skip false positives like "Services", "Services Total", "Service Total"
    const serviceMatch = line.match(/^Service((?:SAH|HCP)\s*-\s*.+)/);
    if (serviceMatch) {
      // Handle split names: "ServiceHCP - Capital and" + next line "Consumables"
      // Or: "ServiceSAH - Individual Social Support" + "(31 - 50km Travel)"
      let fullName = serviceMatch[1].trim();
      const nextLine = lines[i + 1] || "";
      if (nextLine && !nextLine.startsWith("Rate") && !nextLine.startsWith("Funder") && !nextLine.startsWith("Service") && !nextLine.startsWith("Premium")) {
        if (fullName.endsWith(" and") || fullName.endsWith(" Sub-") || fullName.endsWith("-") || nextLine.startsWith("(")) {
          fullName += " " + nextLine;
        }
      }
      const block = parseBlock(lines, i, "service", fullName, "");
      if (block) blocks.push(block);
      continue;
    }

    // Detect premium block: "PremiumHCP - ..." or "PremiumTravel ..."
    // Skip false positives like "Premiums", "Premiums Total", "Premium Total"
    const premiumMatch = line.match(/^Premium((?:HCP|SAH|Travel)\s*.+)/);
    if (premiumMatch) {
      // Handle split names: "PremiumHCP - Other Sub-" + next line "contracted/Brokered Staff"
      let fullName = premiumMatch[1].trim();
      if (fullName.endsWith(" Sub-") || fullName.endsWith("-") || fullName.endsWith(" and")) {
        const nextLine = lines[i + 1] || "";
        if (nextLine && !nextLine.startsWith("Rate") && !nextLine.startsWith("Funder")) {
          fullName += nextLine;
        }
      }
      const block = parseBlock(lines, i, "premium", fullName, "");
      if (block) blocks.push(block);
      continue;
    }

    // Detect fee block: "FeePackage Management - Level 3" or "FeeCare Management - Level 3"
    // Skip false positives like "Fees", "Fees Total", "Fee Total"
    const feeMatch = line.match(/^Fee((?:Package|Care)\s+.+)/);
    if (feeMatch) {
      const block = parseBlock(lines, i, "fee", feeMatch[1].trim(), "");
      if (block) blocks.push(block);
      continue;
    }
  }

  if (blocks.length === 0) return null;

  // ─── Convert blocks to services ─────────────────────────────────────
  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);
  const ongoingTab = tabs.find(t => t.budgetType === "ongoing")!;

  // Track which section headers have been used (for positional fallback)
  const usedHeaders = new Set<number>();

  // Pre-pass: mark section headers as used when they exactly match a direct-name block
  // This prevents "Travel KMs Within Visit" header being grabbed by a generic premium's fallback
  for (const block of blocks) {
    if (block.total <= 0 || block.blockType === "fee") continue;
    const directName = block.serviceName.replace(/^(?:SAH|HCP)\s*-\s*/i, "").trim().toLowerCase();
    for (let h = 0; h < allSectionHeaders.length; h++) {
      const headerClean = allSectionHeaders[h].replace(/^HCP\s*-\s*/i, "").trim().toLowerCase();
      if (headerClean === directName) {
        usedHeaders.add(h);
        break;
      }
    }
  }

  for (const block of blocks) {
    if (block.total <= 0) continue;
    if (block.blockType === "fee") continue; // skip care/package management fees

    // Determine the best display name
    let name = block.serviceName.replace(/^(?:SAH|HCP)\s*-\s*/i, "").trim();

    // For generic names, try to find a better name from notes or section headers
    const isGeneric = name.includes("Other Sub") || name === "Consumables" ||
      name === "Allied Health" || name === "Transport Services" ||
      name.startsWith("Other") || name === "Capital and Consumables" ||
      name === "Third Party Services";

    if (isGeneric) {
      if (block.notes) {
        // Notes always have the real service name (e.g. "Cab Charge", "Domestic Assistance")
        name = block.notes;
      } else {
        // No notes — find matching section header by keyword overlap
        // The premium service name (e.g. "Transport Services") should be a substring
        // of the section header (e.g. "HCP - Transport Services - Cab Charges")
        const strippedName = name.toLowerCase();
        let bestMatch = "";
        let bestIdx = -1;

        for (let h = 0; h < allSectionHeaders.length; h++) {
          if (usedHeaders.has(h)) continue;
          const header = allSectionHeaders[h];
          const headerLower = header.toLowerCase().replace(/^hcp\s*-\s*/i, "");

          // Check if the premium's generic name is a prefix/substring of the header
          if (headerLower.startsWith(strippedName) && headerLower.length > strippedName.length) {
            // Extract the more specific suffix: "Transport Services - Cab Charges" → "Cab Charges"
            bestMatch = header.replace(/^HCP\s*-\s*/i, "").trim();
            bestIdx = h;
            break;
          }
        }

        if (bestIdx >= 0) {
          // Use the section header's full specific name
          // e.g. "Transport Services - Cab Charges" or "Allied Health - Podiatry"
          // Strip the generic prefix to get just the specific part
          const parts = bestMatch.split(" - ");
          if (parts.length > 1) {
            // "Transport Services - Cab Charges" → "Cab Charges"
            // "Allied Health - Podiatry" → "Podiatry"
            name = parts.slice(1).join(" - ").trim();
          } else {
            name = bestMatch;
          }
          usedHeaders.add(bestIdx);
        } else {
          // Positional fallback: find first unused section header
          for (let h = 0; h < allSectionHeaders.length; h++) {
            if (usedHeaders.has(h)) continue;
            const header = allSectionHeaders[h];
            // Skip headers that are clearly for services/fees, not this block
            if (header.match(/Capital|Third Party|Clinical|SS,\s*SH|DA,\s*SS|Medication|Meal Prep/i)) continue;
            if (header.match(/Management/i)) continue;
            name = header.replace(/^HCP\s*-\s*/i, "").trim();
            usedHeaders.add(h);
            break;
          }
        }
      }
    }

    const category = normaliseCategory(name + " " + block.sectionName);

    // Convert annual total to quarterly (AlayaCare budgets are annual)
    const quarterlyTotal = Math.round((block.total / 4) * 100) / 100;

    // Use actual rate if we have it, otherwise lump sum
    const hasRate = block.ratePerHour > 0 && block.hoursPerWeek > 0;

    const service: ServiceLineItem = {
      id: uuidv4(),
      name,
      category,
      ratePerHour: hasRate ? block.ratePerHour : 0,
      hoursPerWeek: hasRate ? block.hoursPerWeek : 0,
      weeksInQuarter: hasRate ? 13 : 1,
      isLumpSum: !hasRate,
      lumpSumAmount: hasRate ? 0 : quarterlyTotal,
    };

    ongoingTab.services.push(service);
  }

  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    clientName,
    macId: "",
    providerName: "Just Better Care Sunshine Coast PTY LTD",
    classificationId,
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

// Parse a single service/premium/fee block starting from the name line
// Scans forward to find Rate, Notes, and Total lines
function parseBlock(
  lines: string[],
  startIdx: number,
  blockType: "service" | "fee" | "premium",
  serviceName: string,
  sectionName: string
): ParsedBlock | null {
  let ratePerHour = 0;
  let hoursPerWeek = 0;
  let total = 0;
  let notes = "";

  const totalPattern = blockType === "fee" ? /^Fee Total/i
    : blockType === "premium" ? /^Premium Total/i
    : /^Service Total/i;

  // Scan forward up to 20 lines looking for Rate, Notes, Total
  for (let j = startIdx + 1; j < Math.min(startIdx + 20, lines.length); j++) {
    const line = lines[j];

    // Rate line: "Rate$155.00 per hour | 2 hours total" or "Rate1 x $10.31 | $10.31 Every Day"
    // Rate content may be split across this line and the next
    if (line.startsWith("Rate")) {
      let rateContent = line.substring(4); // strip "Rate"
      // If the line ends with "per" or doesn't have "total" or "week" or "month" or "Day", merge next line
      const nextLine = (j + 1 < lines.length) ? lines[j + 1] : "";
      if (nextLine && !nextLine.startsWith("Notes") && !nextLine.startsWith("Cost") &&
          !nextLine.startsWith("Funder") && !nextLine.startsWith("Service") &&
          !nextLine.startsWith("Premium") && !nextLine.startsWith("Fee") &&
          !nextLine.startsWith("Flag")) {
        rateContent += " " + nextLine;
      }

      const hourlyMatch = rateContent.match(/\$?([\d,.]+)\s*per\s*hour/i);
      if (hourlyMatch) {
        ratePerHour = parseFloat(hourlyMatch[1].replace(",", ""));
      }
      // "1 hour per week" or "2 hours total" or "1 hour per month"
      const hoursMatch = rateContent.match(/(\d+(?:\.\d+)?)\s*hour(?:s)?\s*(?:per\s*(week|month)|total)/i);
      if (hoursMatch) {
        const hrs = parseFloat(hoursMatch[1]);
        const period = hoursMatch[2]?.toLowerCase();
        if (period === "month") {
          hoursPerWeek = Math.round((hrs / 4.33) * 100) / 100;
        } else if (period === "week") {
          hoursPerWeek = hrs;
        }
        // "total" means it's not recurring — leave hoursPerWeek as 0
      }
    }

    // Notes — the value is on the NEXT line
    if (line === "Notes") {
      if (j + 1 < lines.length) {
        const nextLine = lines[j + 1];
        // Make sure it's not another field label
        if (!nextLine.startsWith("Service Total") && !nextLine.startsWith("Premium Total") &&
            !nextLine.startsWith("Fee Total") && !nextLine.startsWith("Funder") &&
            !nextLine.startsWith("Rate") && !nextLine.startsWith("Cost")) {
          notes = nextLine;
        }
      }
    }

    // Notes on same line (shouldn't happen per actual data, but just in case)
    if (line.startsWith("Notes") && line.length > 5 && line !== "Notes") {
      notes = line.substring(5).trim();
    }

    // Total line — value might be on same line or next line
    if (totalPattern.test(line)) {
      const amountOnLine = line.match(/\$([\d,.]+)/);
      if (amountOnLine) {
        total = parseCurrency(amountOnLine[0]);
      } else if (j + 1 < lines.length) {
        const nextLine = lines[j + 1];
        const amountNext = nextLine.match(/\$([\d,.]+)/);
        if (amountNext) {
          total = parseCurrency(amountNext[0]);
        }
      }
      break; // End of this block
    }

    // If we hit the start of another block, stop
    if (line.startsWith("Service") && !line.startsWith("Service Total") && !line.startsWith("Services Total") && j > startIdx + 1) break;
    if (line.startsWith("Premium") && !line.startsWith("Premium Total") && !line.startsWith("Premiums Total") && j > startIdx + 1) break;
    if (line.startsWith("Fee") && !line.startsWith("Fee Total") && !line.startsWith("Fees Total") && j > startIdx + 1) break;
  }

  return { serviceName, sectionName, ratePerHour, hoursPerWeek, total, notes, blockType };
}

// ─── Our own PDF format ───────────────────────────────────────────────────────

function parseOwnFormat(text: string): ClientBudget | null {
  if (!text.includes("Support at Home") || !text.includes("Budget Plan")) return null;

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const fullText = text.replace(/\n/g, " ").replace(/\s+/g, " ");

  let clientName = "";
  const nameMatch = fullText.match(/Client\s*Name\s+([^$]+?)(?:\s+My Aged Care|$)/i);
  if (nameMatch) clientName = nameMatch[1].trim();

  let macId = "";
  const macMatch = fullText.match(/(?:My Aged Care ID|MAC ID)\s+([\d-]+)/i);
  if (macMatch) macId = macMatch[1].trim();

  let classificationId = "4";
  const classMatch = fullText.match(/Classification\s+(Classification\s+\d+|Transitioned[^$]+?Level\s+\d+)/i);
  if (classMatch) {
    const num = classMatch[1].match(/(\d+)/);
    if (num) classificationId = num[1];
  }

  let pensionStatus: PensionStatus = "full_pensioner";
  const pensionMatch = fullText.match(/Pension\s*Status\s+(Full Pensioner|Part Pensioner|Self.Funded)/i);
  if (pensionMatch) {
    const p = pensionMatch[1].toLowerCase();
    if (p.includes("self")) pensionStatus = "self_funded";
    else if (p.includes("part")) pensionStatus = "part_pensioner";
  }

  let quarter = QUARTERS[2];
  const quarterMatch = fullText.match(/Quarter\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^$]*?\(Q\d\))/i);
  if (quarterMatch) {
    for (const q of QUARTERS) { if (quarterMatch[0].includes(q)) { quarter = q; break; } }
  }

  let careManagementPct = CARE_MANAGEMENT_DEFAULT_PCT;
  const cmMatch = fullText.match(/Care\s*Management\s+(\d+(?:\.\d+)?)\s*%/i);
  if (cmMatch) careManagementPct = parseFloat(cmMatch[1]);

  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);
  let currentSection: BudgetType = "ongoing";
  const skipPatterns = /^(total|service$|category|qtr cost|client contrib|govt subsidy|budget|annual|quarterly|care management|available|utilisation|remaining|carryover|disclaimer|this document|verify current|generated)/i;

  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    if (lower === "ongoing services") { currentSection = "ongoing"; continue; }
    if (lower.includes("restorative") && lower.length < 30) { currentSection = "restorative"; continue; }
    if (lower.includes("end-of-life") && lower.length < 30) { currentSection = "end_of_life"; continue; }
    if (lower.includes("at-hm") && lower.length < 30) { currentSection = "at_hm"; continue; }

    const dollarMatches = line.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (!dollarMatches) continue;
    const firstDollar = line.indexOf("$");
    let servicePart = line.substring(0, firstDollar).trim();
    if (!servicePart || skipPatterns.test(servicePart)) continue;

    const cost = parseCurrency(dollarMatches[0]);
    if (cost <= 0) continue;

    const tab = tabs.find(t => t.budgetType === currentSection);
    if (tab) tab.services.push({
      id: uuidv4(), name: servicePart, category: normaliseCategory(servicePart),
      ratePerHour: 0, hoursPerWeek: 0, weeksInQuarter: 1, isLumpSum: true, lumpSumAmount: cost,
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
  if (alaya) return alaya;

  // Fallback: generic
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const tabs: BudgetTab[] = (["ongoing", "restorative", "end_of_life", "at_hm"] as BudgetType[]).map(defaultTab);
  const ongoingTab = tabs.find(t => t.budgetType === "ongoing")!;

  let clientName = "";
  const nameMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+Active/);
  if (nameMatch) clientName = nameMatch[1].replace(/\s*\([^)]+\)\s*/, " ").trim();

  for (const line of lines) {
    const dollarMatches = line.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (!dollarMatches) continue;
    const firstDollar = line.indexOf("$");
    const servicePart = line.substring(0, firstDollar).trim();
    if (!servicePart || servicePart.length < 3 || servicePart.length > 60) continue;
    if (/^(total|source|income|balance|expense|fee|funder|rate|notes|cost|flag)/i.test(servicePart)) continue;
    const cost = parseCurrency(dollarMatches[0]);
    if (cost <= 0) continue;
    ongoingTab.services.push({
      id: uuidv4(), name: servicePart, category: normaliseCategory(servicePart),
      ratePerHour: 0, hoursPerWeek: 0, weeksInQuarter: 1, isLumpSum: true, lumpSumAmount: cost,
    });
  }

  const now = new Date().toISOString();
  return {
    id: uuidv4(), clientName, macId: "", providerName: "Just Better Care Sunshine Coast PTY LTD",
    classificationId: "4", pensionStatus: "full_pensioner", quarter: QUARTERS[2],
    careManagementPct: CARE_MANAGEMENT_DEFAULT_PCT,
    partPensionerRates: { independence: 0.25, everyday: 0.475 },
    tabs, activeTab: "ongoing", createdAt: now, updatedAt: now,
  };
}
