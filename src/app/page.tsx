"use client";

import { BudgetList } from "@/components/dashboard/BudgetList";
import type { ClientBudget } from "@/lib/types";

export default function DashboardPage() {
  async function handleExportPDF(budget: ClientBudget) {
    const { exportBudgetPDF } = await import("@/lib/export-pdf");
    exportBudgetPDF(budget);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Client Budgets</h1>
        <p className="text-muted-foreground mt-1">
          Manage Support at Home quarterly budgets for your clients.
        </p>
      </div>
      <BudgetList onExportPDF={handleExportPDF} />
    </div>
  );
}
