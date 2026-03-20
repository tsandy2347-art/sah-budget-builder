import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import type { BudgetCalculations } from "@/lib/types";

interface ProviderSummaryProps {
  calcs: BudgetCalculations;
}

export function ProviderSummary({ calcs }: ProviderSummaryProps) {
  const unspentGovt = Math.max(0, calcs.availableForServices - calcs.tabCalcs.totalGovtSubsidy);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Provider Cost Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total service cost</span>
            <span className="font-medium">{formatCurrency(calcs.tabCalcs.totalCost)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span className="pl-4">— Client contributions</span>
            <span>({formatCurrency(calcs.tabCalcs.totalClientContribution)})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Government subsidy (services)</span>
            <span className="font-medium">{formatCurrency(calcs.tabCalcs.totalGovtSubsidy)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Care management fee</span>
            <span className="font-medium">{formatCurrency(calcs.careManagementAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total govt funding used</span>
            <span>{formatCurrency(calcs.tabCalcs.totalGovtSubsidy + calcs.careManagementAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Unspent govt budget</span>
            <span className="text-green-600 font-medium">{formatCurrency(unspentGovt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
