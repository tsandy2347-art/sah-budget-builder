import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { createElement } from "react";
import { calcBudget, calcServiceCost, calcClientContribution, getClassification } from "./calculations";
import { BUDGET_TYPE_LABELS, PENSION_STATUS_LABELS, SUPPLEMENTS, FREQUENCY_LABELS } from "./constants";
import type { ClientBudget, BudgetType } from "./types";

const BUDGET_TYPES: BudgetType[] = ["ongoing", "restorative", "end_of_life", "at_hm"];

function fmtCurrency(n: number) {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  page:         { padding: 40, paddingBottom: 65, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  header:       { marginBottom: 20, borderBottomWidth: 1.5, borderBottomColor: "#2563eb", paddingBottom: 10 },
  title:        { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginBottom: 4 },
  subtitle:     { fontSize: 10, color: "#64748b" },
  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#1e293b", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingBottom: 3 },
  row:          { flexDirection: "row", marginBottom: 3 },
  label:        { width: 160, color: "#64748b" },
  value:        { flex: 1, fontFamily: "Helvetica-Bold" },
  table:        { marginTop: 4 },
  th:           { backgroundColor: "#f1f5f9", fontFamily: "Helvetica-Bold", fontSize: 8, padding: "4 6" },
  td:           { padding: "3 6", fontSize: 8, borderBottomWidth: 0.3, borderBottomColor: "#e2e8f0" },
  tr:           { flexDirection: "row" },
  trAlt:        { flexDirection: "row", backgroundColor: "#f8fafc" },
  footer:       { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 7, color: "#94a3b8", borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 6 },
  badge:        { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 7 },
  metricRow:    { flexDirection: "row", gap: 10, marginBottom: 12 },
  metricCard:   { flex: 1, backgroundColor: "#eff6ff", borderRadius: 4, padding: 8 },
  metricLabel:  { fontSize: 7, color: "#64748b", marginBottom: 2, textTransform: "uppercase" },
  metricValue:  { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
  pageNumber:   { position: "absolute", bottom: 10, right: 40, fontSize: 7, color: "#94a3b8" },
});

function categoryColor(cat: string) {
  if (cat === "clinical") return "#dbeafe";
  if (cat === "independence") return "#ccfbf1";
  return "#fef3c7";
}

function BudgetPDF({ budget }: { budget: ClientBudget }) {
  const classification = getClassification(budget.classificationId);
  const ongoingCalcs = calcBudget(budget, "ongoing");
  const today = new Date().toLocaleDateString("en-AU");

  return createElement(Document, null,
    createElement(Page, { size: "A4", style: styles.page, wrap: true },
      // Header
      createElement(View, { style: styles.header },
        createElement(Text, { style: styles.title }, "Support at Home — Forecast Budget Plan"),
        createElement(Text, { style: styles.subtitle }, `${budget.providerName || "Provider"} · Generated ${today}`)
      ),

      // Client details
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Participant Details"),
        ...[
          ["Participant Name", budget.clientName || "—"],
          ["My Aged Care ID", budget.macId || "—"],
          ["Classification", classification?.label ?? budget.classificationId],
          ["Pension Status", PENSION_STATUS_LABELS[budget.pensionStatus]],
          ["Quarter", budget.quarter],
          ["Care Management", `${budget.careManagementPct}%`],
          ...((budget.supplements ?? []).length > 0
            ? [["Supplements", (budget.supplements ?? []).map((id) => SUPPLEMENTS.find((s) => s.id === id)?.label ?? id).join(", ")]]
            : []),
        ].map(([label, value]) =>
          createElement(View, { style: styles.row, key: label },
            createElement(Text, { style: styles.label }, label),
            createElement(Text, { style: styles.value }, value)
          )
        )
      ),

      // Funding summary
      createElement(View, { style: [styles.section] },
        createElement(Text, { style: styles.sectionTitle }, "Funding Summary"),
        createElement(View, { style: styles.metricRow },
          ...[
            ["Quarterly Budget", fmtCurrency(ongoingCalcs.totalQuarterlyBudget)],
            ...(ongoingCalcs.supplementsQuarterly > 0 ? [["Supplements (Quarterly)", fmtCurrency(ongoingCalcs.supplementsQuarterly)]] : []),
            ["Care Management", fmtCurrency(ongoingCalcs.careManagementAmount)],
            ["Available for Services", fmtCurrency(ongoingCalcs.availableForServices)],
          ].map(([lbl, val]) =>
            createElement(View, { style: styles.metricCard, key: lbl },
              createElement(Text, { style: styles.metricLabel }, lbl),
              createElement(Text, { style: styles.metricValue }, val)
            )
          )
        )
      ),

      // Service tables per tab
      ...BUDGET_TYPES.map((budgetType) => {
        const tab = budget.tabs.find((t) => t.budgetType === budgetType);
        if (!tab || tab.services.length === 0) return null;
        const calcs = calcBudget(budget, budgetType);

        return createElement(View, { style: styles.section, key: budgetType },
          createElement(Text, { style: styles.sectionTitle }, BUDGET_TYPE_LABELS[budgetType]),
          createElement(View, { style: styles.table },
            createElement(View, { style: styles.tr },
              createElement(Text, { style: [styles.th, { flex: 2.5 }] }, "Service"),
              createElement(Text, { style: [styles.th, { flex: 1 }] }, "Category"),
              createElement(Text, { style: [styles.th, { flex: 1 }] }, "Frequency"),
              createElement(Text, { style: [styles.th, { flex: 0.7, textAlign: "right" }] }, "Rate/Hr"),
              createElement(Text, { style: [styles.th, { flex: 0.6, textAlign: "right" }] }, "Hrs"),
              createElement(Text, { style: [styles.th, { flex: 0.5, textAlign: "right" }] }, "Days"),
              createElement(Text, { style: [styles.th, { flex: 1, textAlign: "right" }] }, "Qtr Cost"),
              createElement(Text, { style: [styles.th, { flex: 1, textAlign: "right" }] }, "Contrib"),
            ),
            ...tab.services.map((item, idx) => {
              const cost = calcServiceCost(item);
              const contrib = calcClientContribution(item, budget.pensionStatus, budget.partPensionerRates, budget.isGrandfathered);
              return createElement(View, { style: idx % 2 === 0 ? styles.tr : styles.trAlt, key: item.id },
                createElement(Text, { style: [styles.td, { flex: 2.5 }] }, item.name),
                createElement(View, { style: [styles.td, { flex: 1, justifyContent: "center" }] },
                  createElement(Text, {
                    style: [styles.badge, { backgroundColor: categoryColor(item.category) }]
                  }, item.category.charAt(0).toUpperCase() + item.category.slice(1))
                ),
                createElement(Text, { style: [styles.td, { flex: 1 }] }, item.isLumpSum ? "Lump Sum" : (item.frequency ? FREQUENCY_LABELS[item.frequency] : "Weekly")),
                createElement(Text, { style: [styles.td, { flex: 0.7, textAlign: "right" }] }, item.isLumpSum ? "—" : fmtCurrency(item.ratePerHour)),
                createElement(Text, { style: [styles.td, { flex: 0.6, textAlign: "right" }] }, item.isLumpSum ? "—" : String(item.hrsPerSession ?? 0)),
                createElement(Text, { style: [styles.td, { flex: 0.5, textAlign: "right" }] }, item.isLumpSum ? "—" : String(item.daysPerFrequency ?? 1)),
                createElement(Text, { style: [styles.td, { flex: 1, textAlign: "right" }] }, fmtCurrency(cost)),
                createElement(Text, { style: [styles.td, { flex: 1, textAlign: "right" }] }, fmtCurrency(contrib)),
              );
            }),
            createElement(View, { style: [styles.tr, { backgroundColor: "#f1f5f9" }] },
              createElement(Text, { style: [styles.td, { flex: 2.5, fontFamily: "Helvetica-Bold" }] }, "Total"),
              createElement(Text, { style: [styles.td, { flex: 1 }] }, ""),
              createElement(Text, { style: [styles.td, { flex: 1 }] }, ""),
              createElement(Text, { style: [styles.td, { flex: 0.7 }] }, ""),
              createElement(Text, { style: [styles.td, { flex: 0.6 }] }, ""),
              createElement(Text, { style: [styles.td, { flex: 0.5 }] }, ""),
              createElement(Text, { style: [styles.td, { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }] }, fmtCurrency(calcs.tabCalcs.totalCost)),
              createElement(Text, { style: [styles.td, { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }] }, fmtCurrency(calcs.tabCalcs.totalClientContribution)),
            ),
          ),
          createElement(Text, { style: { fontSize: 8, marginTop: 4, color: "#64748b" } },
            `Utilisation: ${calcs.utilisation.toFixed(1)}% · Remaining: ${fmtCurrency(calcs.remaining)} · Carryover cap: ${fmtCurrency(calcs.carryoverCap)}`
          )
        );
      }).filter(Boolean),

      // AT Purchases from Grandfathered Funds
      ...((budget.atPurchases ?? []).length > 0 ? [
        createElement(View, { style: styles.section },
          createElement(Text, { style: styles.sectionTitle }, "AT Purchases (from HCP Unspent Funds)"),
          createElement(View, { style: styles.table },
            createElement(View, { style: styles.tr },
              createElement(Text, { style: [styles.th, { flex: 3 }] }, "Description"),
              createElement(Text, { style: [styles.th, { flex: 1, textAlign: "right" }] }, "Cost"),
            ),
            ...(budget.atPurchases ?? []).map((item, idx) =>
              createElement(View, { style: idx % 2 === 0 ? styles.tr : styles.trAlt, key: item.id },
                createElement(Text, { style: [styles.td, { flex: 3 }] }, item.description || "Unnamed item"),
                createElement(Text, { style: [styles.td, { flex: 1, textAlign: "right" }] }, fmtCurrency(item.cost)),
              )
            ),
            createElement(View, { style: [styles.tr, { backgroundColor: "#f1f5f9" }] },
              createElement(Text, { style: [styles.td, { flex: 3, fontFamily: "Helvetica-Bold" }] }, "Total AT Purchases"),
              createElement(Text, { style: [styles.td, { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }] }, fmtCurrency(ongoingCalcs.atPurchasesTotal)),
            ),
            createElement(View, { style: styles.tr },
              createElement(Text, { style: [styles.td, { flex: 3, color: "#d97706" }] }, "HCP Balance After AT"),
              createElement(Text, { style: [styles.td, { flex: 1, textAlign: "right", color: "#d97706", fontFamily: "Helvetica-Bold" }] }, fmtCurrency(ongoingCalcs.grandfatheredFundsAfterAT)),
            ),
          ),
          createElement(Text, { style: { fontSize: 7, marginTop: 3, color: "#94a3b8" } }, "HCP unspent funds must be used before accessing AT-HM scheme funding")
        ),
      ] : []),

      // Footer
      createElement(View, { style: styles.footer, fixed: true },
        createElement(Text, null,
          "This document is a planning tool only and does not constitute financial advice. Actual funding amounts are subject to indexation. " +
          "Verify current rates via the Schedule of Subsidies and Supplements on the Department of Health, Disability and Ageing website."
        )
      ),

      // Page numbers on every page
      createElement(Text, {
        style: styles.pageNumber,
        fixed: true,
        render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
      })
    )
  );
}

export async function exportBudgetPDF(budget: ClientBudget): Promise<void> {
  const doc = createElement(BudgetPDF, { budget });
  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SaH-Budget-${(budget.clientName || "Participant").replace(/\s+/g, "-")}-${budget.quarter.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
