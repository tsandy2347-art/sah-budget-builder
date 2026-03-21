"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  Lightbulb,
  TrendingUp,
  Stethoscope,
  Home,
  Heart,
  PiggyBank,
  ArrowRightLeft,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import type { BudgetCalculations, ClientBudget, BudgetType } from "@/lib/types";
import { calcBudget } from "@/lib/calculations";
import { ALL_CLASSIFICATIONS, SUPPLEMENTS } from "@/lib/constants";

interface Tip {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "revenue" | "efficiency" | "funding" | "compliance";
}

interface BudgetOptimisationTipsProps {
  budget: ClientBudget;
  calcs: BudgetCalculations;
  budgetType: BudgetType;
}

export function BudgetOptimisationTips({ budget, calcs, budgetType }: BudgetOptimisationTipsProps) {
  const [expanded, setExpanded] = useState(true);
  const tips = generateTips(budget, calcs, budgetType);

  if (tips.length === 0) return null;

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTips = [...tips].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
      <CardHeader className="pb-3">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-base text-blue-900 dark:text-blue-200">
              Budget Optimisation Tips
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {tips.length} {tips.length === 1 ? "tip" : "tips"}
            </Badge>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {sortedTips.map((tip) => (
            <div
              key={tip.id}
              className="flex gap-3 rounded-lg border bg-white/80 dark:bg-slate-900/60 p-3"
            >
              <div className="flex-shrink-0 mt-0.5">{tip.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{tip.title}</span>
                  <PriorityBadge priority={tip.priority} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tip.description}
                </p>
              </div>
            </div>
          ))}

          <p className="text-[11px] text-muted-foreground italic pt-1">
            Tips are based on SaH Program Manual guidelines. Always confirm with the client&apos;s
            support plan and assessed needs before making changes.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function generateTips(
  budget: ClientBudget,
  calcs: BudgetCalculations,
  budgetType: BudgetType
): Tip[] {
  const tips: Tip[] = [];
  const tab = budget.tabs.find((t) => t.budgetType === budgetType);
  const services = tab?.services ?? [];

  // ── 1. Under-utilised budget — money left on the table ──
  if (budgetType === "ongoing" && calcs.remaining > calcs.carryoverCap && calcs.remaining > 500) {
    const excess = calcs.remaining - calcs.carryoverCap;
    tips.push({
      id: "underutilised",
      icon: <TrendingUp className="h-4 w-4 text-amber-600" />,
      title: "Budget under-utilised",
      description: `${formatCurrency(calcs.remaining)} remaining exceeds the carryover cap of ${formatCurrency(calcs.carryoverCap)}. Up to ${formatCurrency(excess)} could be lost at quarter end. Consider adding more services to maximise the funding envelope.`,
      priority: "high",
      category: "efficiency",
    });
  }

  // ── 2. No clinical services — biggest margin opportunity ──
  if (budgetType === "ongoing" && calcs.tabCalcs.byCategory.clinical === 0 && services.length > 0) {
    tips.push({
      id: "no-clinical",
      icon: <Stethoscope className="h-4 w-4 text-blue-600" />,
      title: "Add clinical services (0% client contribution)",
      description:
        "Clinical services (nursing, physio, OT, podiatry, dietitian, psychology) have 0% client contribution across all pension statuses. This means 100% government subsidy — the highest-margin service category. Consider adding clinically appropriate services.",
      priority: "high",
      category: "revenue",
    });
  }

  // ── 3. Low clinical proportion — suggest rebalancing ──
  const clinicalPct =
    calcs.tabCalcs.totalCost > 0
      ? (calcs.tabCalcs.byCategory.clinical / calcs.tabCalcs.totalCost) * 100
      : 0;
  if (
    budgetType === "ongoing" &&
    clinicalPct > 0 &&
    clinicalPct < 20 &&
    calcs.tabCalcs.totalCost > 0
  ) {
    tips.push({
      id: "low-clinical",
      icon: <ArrowRightLeft className="h-4 w-4 text-purple-600" />,
      title: "Clinical services are only " + formatPercent(clinicalPct) + " of spend",
      description:
        "Clinical services attract 0% client contribution (100% govt subsidy), while Everyday services can be up to 80% client-funded. Where clinically appropriate, shifting the service mix toward clinical categories improves revenue. For example, a registered nurse doing medication management counts as clinical.",
      priority: "medium",
      category: "revenue",
    });
  }

  // ── 4. Restorative Care pathway not used ──
  if (budgetType === "ongoing") {
    const restorativeCalcs = calcBudget(budget, "restorative");
    if (restorativeCalcs.tabCalcs.totalCost === 0) {
      tips.push({
        id: "restorative-unused",
        icon: <Heart className="h-4 w-4 text-pink-600" />,
        title: "Restorative Care Pathway available",
        description:
          "Each participant can access $6,000–$12,000 in additional restorative care funding (on top of their ongoing budget). This covers physio, OT, exercise physiology — services that improve independence. Check if the client would benefit from a short-term restorative program.",
        priority: "medium",
        category: "funding",
      });
    }
  }

  // ── 5. AT-HM not used ──
  if (budgetType === "ongoing") {
    const athmCalcs = calcBudget(budget, "at_hm");
    if (athmCalcs.tabCalcs.totalCost === 0) {
      tips.push({
        id: "athm-unused",
        icon: <Home className="h-4 w-4 text-teal-600" />,
        title: "AT-HM Scheme funding available",
        description:
          "Assistive Technology & Home Modifications funding ($5k–$15k depending on tier) is separate from the ongoing budget. Grab rails, shower chairs, ramps, and home modifications can be funded through this stream without reducing ongoing service hours.",
        priority: "low",
        category: "funding",
      });
    }
  }

  // ── 6. High everyday spend — contribution impact ──
  const everydayPct =
    calcs.tabCalcs.totalCost > 0
      ? (calcs.tabCalcs.byCategory.everyday / calcs.tabCalcs.totalCost) * 100
      : 0;
  if (budgetType === "ongoing" && everydayPct > 40 && budget.pensionStatus !== "full_pensioner") {
    const contribRate =
      budget.pensionStatus === "part_pensioner" ? "up to 47.5%" : "up to 80%";
    tips.push({
      id: "high-everyday",
      icon: <PiggyBank className="h-4 w-4 text-orange-600" />,
      title: `${formatPercent(everydayPct)} of spend is Everyday services`,
      description: `For ${budget.pensionStatus === "part_pensioner" ? "part pensioners" : "self-funded retirees"}, Everyday services have ${contribRate} client contribution. This means a significant portion is paid by the client, not government subsidy. Review whether any services could be reclassified or substituted with Independence (lower contribution) or Clinical (0% contribution) alternatives.`,
      priority: "medium",
      category: "revenue",
    });
  }

  // ── 7. Care management at less than 10% ──
  if (budget.careManagementPct < 10 && budgetType === "ongoing") {
    const potential = calcs.totalQuarterlyBudget * 0.1;
    const current = calcs.careManagementAmount;
    const missed = potential - current;
    tips.push({
      id: "care-mgmt-low",
      icon: <Package className="h-4 w-4 text-slate-600" />,
      title: "Care management below 10%",
      description: `Care management is set to ${budget.careManagementPct}% (${formatCurrency(current)}/qtr). The maximum 10% would be ${formatCurrency(potential)}/qtr — an additional ${formatCurrency(missed)}. Care management fees are pooled across all participants in a branch, so maximising this supports the whole team's coordination capacity.`,
      priority: "low",
      category: "revenue",
    });
  }

  // ── 8. Transitioned HCP — unspent funds reminder ──
  const classification = ALL_CLASSIFICATIONS.find((c) => c.id === budget.classificationId);
  if (classification?.isTransitioned && budgetType === "ongoing") {
    tips.push({
      id: "hcp-unspent",
      icon: <PiggyBank className="h-4 w-4 text-indigo-600" />,
      title: "Transitioned HCP — check for unspent funds",
      description:
        "Transitioned Home Care Package participants may have accumulated unspent funds from their previous package. These funds remain available under Support at Home. Check My Aged Care for any unspent balance that could supplement this quarter's budget.",
      priority: "medium",
      category: "funding",
    });
  }

  // ── 9. Supplements not applied ──
  if (budgetType === "ongoing") {
    const appliedSupps = budget.supplements ?? [];
    const missingSupps = SUPPLEMENTS.filter((s) => !appliedSupps.includes(s.id));
    if (missingSupps.length > 0) {
      const suppList = missingSupps.map((s) => `${s.label} ($${s.quarterlyAmount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}/qtr)`).join(", ");
      tips.push({
        id: "supplements-available",
        icon: <TrendingUp className="h-4 w-4 text-cyan-600" />,
        title: "Check supplement eligibility",
        description: `Supplements increase the quarterly budget on top of the base classification. Available supplements: ${suppList}. Check if this client qualifies for any — particularly the Dementia Supplement for clients with a formal diagnosis. Enable them in the Client Details section above.`,
        priority: "medium",
        category: "funding",
      });
    }
  }

  // ── 10. Third-party brokered services — markup opportunity ──
  if (budgetType === "ongoing" && services.length > 0) {
    const hasEveryday = services.some((s) => s.category === "everyday");
    if (hasEveryday) {
      tips.push({
        id: "brokered-markup",
        icon: <TrendingUp className="h-4 w-4 text-green-600" />,
        title: "Third-party brokerage markup",
        description:
          "For services JBC brokers to third-party providers (e.g., cleaners, gardeners), a 25% markup can be applied to cover coordination and quality oversight. Ensure the total unit price (including markup) is built into the rate. No separate admin or travel fees — all costs must be in the unit price.",
        priority: "low",
        category: "revenue",
      });
    }
  }

  // ── 10. Over budget ──
  if (calcs.remaining < 0) {
    tips.push({
      id: "over-budget",
      icon: <TrendingUp className="h-4 w-4 text-red-600" />,
      title: "Budget is over-allocated",
      description: `This budget is ${formatCurrency(Math.abs(calcs.remaining))} over the envelope. Either reduce hours/services, check if the client qualifies for a higher classification via reassessment, or consider moving some services to a separate pathway (Restorative, AT-HM) if clinically appropriate.`,
      priority: "high",
      category: "compliance",
    });
  }

  return tips;
}
