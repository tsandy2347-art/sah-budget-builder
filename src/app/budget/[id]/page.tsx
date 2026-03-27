"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientDetailsForm } from "@/components/budget/ClientDetailsForm";
import { BudgetTabs } from "@/components/budget/BudgetTabs";
import { useBudget } from "@/hooks/useBudget";
import { ChevronLeft, FileDown, Sheet, Loader2, PenLine } from "lucide-react";
import type { ClientBudget } from "@/lib/types";

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    budget,
    loading,
    updateClientDetails,
    setActiveTab,
    updatePathwayConfig,
    addService,
    updateService,
    removeService,
  } = useBudget(id);

  async function handleExportPDF() {
    if (!budget) return;
    const { exportBudgetPDF } = await import("@/lib/export-pdf");
    exportBudgetPDF(budget);
  }

  async function handleExportExcel() {
    if (!budget) return;
    const { exportBudgetExcel } = await import("@/lib/export-excel");
    exportBudgetExcel(budget);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!budget) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {budget.clientName || <span className="text-muted-foreground italic font-normal">Unnamed client</span>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {budget.quarter} &middot; Auto-saved
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
            <Sheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link href={`/budget/${id}/sign`}>
              <PenLine className="h-4 w-4" />
              Client Sign
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Client Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Client &amp; Funding Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientDetailsForm
            budget={budget}
            onChange={(updates) => updateClientDetails(updates as Partial<Omit<ClientBudget, "id" | "tabs" | "createdAt" | "updatedAt">>)}
          />
        </CardContent>
      </Card>

      {/* Budget Tabs */}
      <BudgetTabs
        budget={budget}
        onAddService={addService}
        onUpdateService={updateService}
        onRemoveService={removeService}
        onUpdatePathway={updatePathwayConfig}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
