import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { scaleAmount, VIEW_PERIOD_LABELS } from "@/lib/calculations";
import type { BudgetCalculations, ViewPeriod } from "@/lib/types";

interface ProviderSummaryProps {
  calcs: BudgetCalculations;
  viewPeriod: ViewPeriod;
}

export function ProviderSummary({ calcs, viewPeriod }: ProviderSummaryProps) {
  const unspentGovt = Math.max(0, calcs.availableForServices - calcs.tabCalcs.totalGovtSubsidy);
  const periodLabel = VIEW_PERIOD_LABELS[viewPeriod];
  const s = (amount: number) => scaleAmount(amount, viewPeriod);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Provider Cost Summary ({periodLabel})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total service cost</span>
            <span className="font-medium">{formatCurrency(s(calcs.tabCalcs.totalCost))}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span className="pl-4">— Client contributions</span>
            <span>({formatCurrency(s(calcs.tabCalcs.totalClientContribution))})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Government subsidy (services)</span>
            <span className="font-medium">{formatCurrency(s(calcs.tabCalcs.totalGovtSubsidy))}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Care management fee</span>
            <span className="font-medium">{formatCurrency(s(calcs.careManagementAmount))}</span>
          </div>
          {calcs.effectiveCarryover > 0 && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carryover from prior quarter</span>
                <span className="font-medium text-blue-600">+{formatCurrency(s(calcs.effectiveCarryover))}</span>
              </div>
            </>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total govt funding used</span>
            <span>{formatCurrency(s(calcs.tabCalcs.totalGovtSubsidy + calcs.careManagementAmount))}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Unspent govt budget</span>
            <span className="text-green-600 font-medium">{formatCurrency(s(unspentGovt))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
