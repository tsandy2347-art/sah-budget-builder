"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StackedBar } from "./StackedBar";
import { formatCurrency, formatPercent } from "@/lib/format";
import { LIFETIME_CONTRIBUTION_CAP } from "@/lib/constants";
import { scaleAmount, VIEW_PERIOD_LABELS } from "@/lib/calculations";
import { AlertTriangle, CheckCircle2, TrendingUp, Info, ArrowDownRight } from "lucide-react";
import type { BudgetCalculations, ViewPeriod } from "@/lib/types";

interface BudgetSummaryProps {
  calcs: BudgetCalculations;
  viewPeriod: ViewPeriod;
}

export function BudgetSummary({ calcs, viewPeriod }: BudgetSummaryProps) {
  const isOverBudget = calcs.remaining < 0;
  const isUnderutilised = calcs.remaining > calcs.carryoverCap;
  const isWithinCarryover = !isOverBudget && !isUnderutilised;
  const periodLabel = VIEW_PERIOD_LABELS[viewPeriod];
  const s = (amount: number) => scaleAmount(amount, viewPeriod);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Budget Summary ({periodLabel})</CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-bold tabular-nums ${
                isOverBudget ? "text-red-600" : isUnderutilised ? "text-amber-600" : "text-green-600"
              }`}
            >
              {formatPercent(calcs.utilisation)}
            </span>
            <span className="text-sm text-muted-foreground">utilised</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StackedBar
          byCategory={calcs.tabCalcs.byCategory}
          careManagement={calcs.careManagementAmount}
          envelope={calcs.budgetEnvelope + calcs.careManagementAmount}
        />

        {isOverBudget && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Over budget by {formatCurrency(Math.abs(calcs.remaining))}</strong>. Consider reducing service
              hours, removing services, or requesting a reassessment for a higher classification.
            </AlertDescription>
          </Alert>
        )}

        {isUnderutilised && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              {formatCurrency(calcs.remaining)} remaining — above the carryover cap of{" "}
              {formatCurrency(calcs.carryoverCap)}. Consider adding more services to make full use of the funding.
            </AlertDescription>
          </Alert>
        )}

        {isWithinCarryover && calcs.tabCalcs.totalCost > 0 && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              Budget is well utilised. {formatCurrency(calcs.remaining)} remaining — within the carryover cap of{" "}
              {formatCurrency(calcs.carryoverCap)}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total service cost</span>
            <span className="font-medium">{formatCurrency(s(calcs.tabCalcs.totalCost))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base budget envelope</span>
            <span className="font-medium">{formatCurrency(s(calcs.budgetEnvelope))}</span>
          </div>
          {calcs.effectiveCarryover > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" /> Carryover applied
                </span>
                <span className="font-medium text-blue-600">+{formatCurrency(s(calcs.effectiveCarryover))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective envelope</span>
                <span className="font-medium">{formatCurrency(s(calcs.effectiveBudgetEnvelope))}</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining</span>
            <span className={`font-medium ${isOverBudget ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(s(calcs.remaining))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Carryover cap</span>
            <span className="font-medium">{formatCurrency(s(calcs.carryoverCap))}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground border rounded-md p-2.5 bg-muted/30">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Lifetime participant contribution cap: <strong>{formatCurrency(LIFETIME_CONTRIBUTION_CAP)}</strong> (indexed 20
            March & 20 September each year). Track total contributions separately via My Aged Care.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
