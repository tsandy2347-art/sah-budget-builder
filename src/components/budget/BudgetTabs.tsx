"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServiceTable } from "./ServiceTable";
import { BudgetSummary } from "./BudgetSummary";
import { ProviderSummary } from "./ProviderSummary";
import { MetricCard } from "./MetricCard";
import { calcBudget, getPathwayWeeks } from "@/lib/calculations";
import { BUDGET_TYPE_LABELS, RESTORATIVE_BUDGETS, ATHM_BUDGETS, EOL_BUDGET, EOL_WEEKS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { ClientBudget, BudgetType, ServiceLineItem, PathwayConfig } from "@/lib/types";

interface BudgetTabsProps {
  budget: ClientBudget;
  onAddService: (budgetType: BudgetType, item: Omit<ServiceLineItem, "id">) => void;
  onUpdateService: (budgetType: BudgetType, itemId: string, updates: Partial<ServiceLineItem>) => void;
  onRemoveService: (budgetType: BudgetType, itemId: string) => void;
  onUpdatePathway: (budgetType: BudgetType, config: Partial<PathwayConfig>) => void;
  onTabChange: (tab: BudgetType) => void;
}

const TABS: BudgetType[] = ["ongoing", "restorative", "end_of_life", "at_hm"];

export function BudgetTabs({
  budget,
  onAddService,
  onUpdateService,
  onRemoveService,
  onUpdatePathway,
  onTabChange,
}: BudgetTabsProps) {
  return (
    <Tabs value={budget.activeTab} onValueChange={(v) => onTabChange(v as BudgetType)}>
      <TabsList className="grid w-full grid-cols-4">
        {TABS.map((t) => {
          const calcs = calcBudget(budget, t);
          const isOver = calcs.utilisation > 100;
          return (
            <TabsTrigger key={t} value={t} className="relative text-xs sm:text-sm">
              <span className="hidden sm:inline">{BUDGET_TYPE_LABELS[t]}</span>
              <span className="sm:hidden">{t === "at_hm" ? "AT-HM" : t === "end_of_life" ? "EoL" : t === "restorative" ? "Restor." : "Ongoing"}</span>
              {isOver && <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {TABS.map((tabType) => {
        const tab = budget.tabs.find((t) => t.budgetType === tabType)!;
        const calcs = calcBudget(budget, tabType);
        const defaultWeeks = getPathwayWeeks(tabType, tab.pathwayConfig);

        return (
          <TabsContent key={tabType} value={tabType} className="space-y-6 mt-6">
            {/* Pathway config panels */}
            {tabType === "restorative" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Restorative Care Pathway</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button
                    variant={tab.pathwayConfig.restorativeTier === "standard" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onUpdatePathway("restorative", { restorativeTier: "standard" })}
                  >
                    Standard — {formatCurrency(RESTORATIVE_BUDGETS.standard)} / 16 weeks
                  </Button>
                  <Button
                    variant={tab.pathwayConfig.restorativeTier === "extended" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onUpdatePathway("restorative", { restorativeTier: "extended" })}
                  >
                    Extended — {formatCurrency(RESTORATIVE_BUDGETS.extended)} / 16 weeks
                  </Button>
                  <Badge variant="outline" className="self-center text-xs">
                    Envelope: {formatCurrency(calcs.budgetEnvelope)}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {tabType === "end_of_life" && (
              <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700">
                <CardContent className="pt-4 flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">End-of-Life Pathway</p>
                    <p className="text-xs text-muted-foreground">
                      Fixed budget of {formatCurrency(EOL_BUDGET)} for up to {EOL_WEEKS} weeks of intensive support.
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">{formatCurrency(EOL_BUDGET)}</Badge>
                </CardContent>
              </Card>
            )}

            {tabType === "at_hm" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Assistive Technology &amp; Home Modifications</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  {(["low", "medium", "high"] as const).map((tier) => (
                    <Button
                      key={tier}
                      variant={tab.pathwayConfig.athmTier === tier ? "default" : "outline"}
                      size="sm"
                      onClick={() => onUpdatePathway("at_hm", { athmTier: tier })}
                    >
                      {tier.charAt(0).toUpperCase() + tier.slice(1)} — {formatCurrency(ATHM_BUDGETS[tier])}
                    </Button>
                  ))}
                  <Badge variant="outline" className="self-center text-xs">
                    Envelope: {formatCurrency(calcs.budgetEnvelope)}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Metric summary for this tab's envelope */}
            {tabType !== "ongoing" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="Pathway Envelope" value={calcs.budgetEnvelope} variant="blue" />
                <MetricCard label="Services Planned" value={calcs.tabCalcs.totalCost} variant="default" />
                <MetricCard
                  label="Remaining"
                  value={calcs.remaining}
                  variant={calcs.remaining < 0 ? "amber" : "green"}
                />
              </div>
            )}

            {/* Service table */}
            <ServiceTable
              services={tab.services}
              budgetType={tabType}
              pensionStatus={budget.pensionStatus}
              partPensionerRates={budget.partPensionerRates}
              defaultWeeks={defaultWeeks}
              onAdd={(item) => onAddService(tabType, item)}
              onUpdate={(id, updates) => onUpdateService(tabType, id, updates)}
              onRemove={(id) => onRemoveService(tabType, id)}
            />

            {/* Budget summary */}
            <BudgetSummary calcs={calcs} />

            {/* Provider summary (ongoing only) */}
            {tabType === "ongoing" && <ProviderSummary calcs={calcs} />}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
