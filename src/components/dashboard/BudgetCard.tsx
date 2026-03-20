"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Copy, Trash2, FileDown } from "lucide-react";
import { duplicateBudget, deleteBudget } from "@/lib/storage";
import { calcBudget, getClassification } from "@/lib/calculations";
import { ALL_CLASSIFICATIONS, PENSION_STATUS_LABELS } from "@/lib/constants";
import type { ClientBudget } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface BudgetCardProps {
  budget: ClientBudget;
  onRefresh: () => void;
  onExportPDF: (budget: ClientBudget) => void;
}

export function BudgetCard({ budget, onRefresh, onExportPDF }: BudgetCardProps) {
  const router = useRouter();
  const calcs = calcBudget(budget, budget.activeTab ?? "ongoing");
  const classification = getClassification(budget.classificationId);
  const utilisation = calcs.utilisation;

  const utilisationColor =
    utilisation > 100 ? "text-red-600" : utilisation > 85 ? "text-amber-600" : "text-green-600";

  function handleDuplicate() {
    duplicateBudget(budget.id);
    onRefresh();
  }

  function handleDelete() {
    if (confirm(`Delete budget for "${budget.clientName || "Unnamed client"}"?`)) {
      deleteBudget(budget.id);
      onRefresh();
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex-1 min-w-0"
            onClick={() => router.push(`/budget/${budget.id}`)}
          >
            <h3 className="font-semibold text-base truncate">
              {budget.clientName || <span className="text-muted-foreground italic">Unnamed client</span>}
            </h3>
            {budget.macId && (
              <p className="text-xs text-muted-foreground truncate">{budget.macId}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/budget/${budget.id}`)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportPDF(budget)}>
                <FileDown className="h-4 w-4 mr-2" /> Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3" onClick={() => router.push(`/budget/${budget.id}`)}>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">
            {classification?.label ?? budget.classificationId}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {budget.quarter}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {PENSION_STATUS_LABELS[budget.pensionStatus]}
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget utilisation</span>
            <span className={`font-medium ${utilisationColor}`}>{utilisation.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(utilisation, 100)} className="h-2" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(calcs.tabCalcs.totalCost)} used</span>
          <span>{formatCurrency(calcs.budgetEnvelope)} available</span>
        </div>
      </CardContent>
    </Card>
  );
}
