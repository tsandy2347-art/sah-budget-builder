"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useBudget } from "@/hooks/useBudget";
import { calcBudget, calcServiceCost, calcClientContribution, getClassification } from "@/lib/calculations";
import { BUDGET_TYPE_LABELS, PENSION_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { SignaturePad } from "@/components/budget/SignaturePad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetType } from "@/lib/types";

export default function BudgetSignPage() {
  const { id } = useParams<{ id: string }>();
  const { budget, loading } = useBudget(id);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [clientPrintName, setClientPrintName] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading budget&#8230;</p>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Budget not found.</p>
      </div>
    );
  }

  const classification = getClassification(budget.classificationId);

  const tabsWithServices = budget.tabs.filter((t) => t.services.length > 0);

  const allCalcs = tabsWithServices.map((tab) => ({
    budgetType: tab.budgetType,
    services: tab.services,
    calcs: calcBudget(budget, tab.budgetType),
  }));

  const grandTotalCost = allCalcs.reduce((sum, t) => sum + t.calcs.tabCalcs.totalCost, 0);
  const grandTotalContribution = allCalcs.reduce((sum, t) => sum + t.calcs.tabCalcs.totalClientContribution, 0);
  const grandTotalSubsidy = allCalcs.reduce((sum, t) => sum + t.calcs.tabCalcs.totalGovtSubsidy, 0);

  const isSigned = signatureDataUrl !== null && clientPrintName.trim().length > 0;

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          nav, header, .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      ` }} />

      <div className="min-h-screen bg-gray-50">
        <div className="no-print border-b bg-white px-6 py-3 flex items-center justify-between">
          <Link href={`/budget/${id}`} className="text-sm text-blue-600 hover:underline">
            &larr; Back to Budget
          </Link>
          <Button onClick={handlePrint} disabled={!isSigned}>
            Print / Save PDF
          </Button>
        </div>

        <div id="print-area" className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Support at Home Budget Agreement</h1>
            <p className="text-sm text-muted-foreground">
              {budget.quarter} &#8212; {budget.providerName || "Provider"}
            </p>
          </div>

          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Client Name:</span>{" "}
                  {budget.clientName || "—"}
                </div>
                <div>
                  <span className="font-medium">MAC ID:</span>{" "}
                  {budget.macId || "—"}
                </div>
                <div>
                  <span className="font-medium">Classification:</span>{" "}
                  {classification?.label ?? "Not set"}
                </div>
                <div>
                  <span className="font-medium">Pension Status:</span>{" "}
                  {PENSION_STATUS_LABELS[budget.pensionStatus]}
                </div>
                <div>
                  <span className="font-medium">Provider:</span>{" "}
                  {budget.providerName || "—"}
                </div>
                <div>
                  <span className="font-medium">Quarter:</span>{" "}
                  {budget.quarter}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Funding Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funding Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Service Cost</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(grandTotalCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Client Contribution</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(grandTotalContribution)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Government Subsidy</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(grandTotalSubsidy)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Tables per Budget Type */}
          {allCalcs.map(({ budgetType, services, calcs }) => (
            <Card key={budgetType}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {BUDGET_TYPE_LABELS[budgetType]}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    &#8212; Budget Envelope: {formatCurrency(calcs.effectiveBudgetEnvelope)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 font-medium">Service</th>
                      <th className="py-2 font-medium">Category</th>
                      <th className="py-2 font-medium text-right">Cost (Qtr)</th>
                      <th className="py-2 font-medium text-right">Client Contrib.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((svc) => {
                      const cost = calcServiceCost(svc);
                      const contrib = calcClientContribution(
                        svc,
                        budget.pensionStatus,
                        budget.partPensionerRates,
                        budget.isGrandfathered
                      );
                      return (
                        <tr key={svc.id} className="border-b last:border-0">
                          <td className="py-2">{svc.name}</td>
                          <td className="py-2 capitalize">{svc.category}</td>
                          <td className="py-2 text-right">{formatCurrency(cost)}</td>
                          <td className="py-2 text-right">{formatCurrency(contrib)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-medium">
                      <td className="py-2" colSpan={2}>Subtotal</td>
                      <td className="py-2 text-right">{formatCurrency(calcs.tabCalcs.totalCost)}</td>
                      <td className="py-2 text-right">{formatCurrency(calcs.tabCalcs.totalClientContribution)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          ))}

          {/* Client Agreement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Agreement</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed space-y-3">
              <p>
                I acknowledge that I have reviewed the above budget and service schedule for the
                quarter <strong>{budget.quarter}</strong>.
              </p>
              <p>I understand and agree to the following:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  The total estimated cost of services for this quarter is{" "}
                  <strong>{formatCurrency(grandTotalCost)}</strong>.
                </li>
                <li>
                  My estimated client contribution is{" "}
                  <strong>{formatCurrency(grandTotalContribution)}</strong>, calculated in accordance
                  with the Support at Home contribution framework based on my pension status.
                </li>
                <li>
                  The Australian Government subsidy of{" "}
                  <strong>{formatCurrency(grandTotalSubsidy)}</strong> is paid directly to my
                  approved provider.
                </li>
                <li>
                  Services may be varied during the quarter by mutual agreement between myself and
                  my provider, subject to available funding.
                </li>
                <li>
                  I have the right to change providers at any time with reasonable notice as set out
                  in my Home Care Agreement.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name (print)</label>
                <Input
                  value={clientPrintName}
                  onChange={(e) => setClientPrintName(e.target.value)}
                  placeholder="Enter your full name"
                  className="max-w-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Signature</label>
                <SignaturePad onSignatureChange={setSignatureDataUrl} />
              </div>
              <div className="text-sm text-muted-foreground">
                Date: {new Date().toLocaleDateString("en-AU")}
              </div>
            </CardContent>
          </Card>

          {/* Provider Representative */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Provider Representative</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-medium mb-8">Name:</p>
                  <div className="border-b border-gray-400 w-full" />
                </div>
                <div>
                  <p className="font-medium mb-8">Position:</p>
                  <div className="border-b border-gray-400 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-medium mb-8">Signature:</p>
                  <div className="border-b border-gray-400 w-full" />
                </div>
                <div>
                  <p className="font-medium mb-8">Date:</p>
                  <div className="border-b border-gray-400 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>
              Support at Home Budget Agreement &#183; Generated on{" "}
              {new Date().toLocaleDateString("en-AU")} &#183;{" "}
              {budget.providerName || "Provider"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
