"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useBudget } from "@/hooks/useBudget";
import { calcBudget, calcServiceCost, calcClientContribution, getClassification } from "@/lib/calculations";
import { BUDGET_TYPE_LABELS, PENSION_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { SignaturePad } from "@/components/budget/SignaturePad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BudgetType } from "@/lib/types";

export default function BudgetSignPage() {
  const { id } = useParams<{ id: string }>();
  const { budget, loading } = useBudget(id);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [carePartnerName, setCarePartnerName] = useState("");
  const [clientPrintName, setClientPrintName] = useState("");
  const [relationshipToClient, setRelationshipToClient] = useState("self");
  const [jbcRepName, setJbcRepName] = useState("");
  const [jbcRepRole, setJbcRepRole] = useState("");
  const [jbcSignatureDataUrl, setJbcSignatureDataUrl] = useState<string | null>(null);

  const relationshipLabels: Record<string, string> = {
    self: "Self",
    family_member: "Family Member",
    legal_guardian: "Legal Guardian",
    authorised_representative: "Authorised Representative",
    other: "Other",
  };

  useEffect(() => {
    async function fetchCarePartner() {
      try {
        const res = await fetch("/api/budgets/" + id);
        if (res.ok) {
          const data = await res.json();
          if (data.user?.name) setCarePartnerName(data.user.name);
        }
      } catch {}
    }
    if (id) fetchCarePartner();
  }, [id]);

  useEffect(() => {
    if (budget) {
      setClientPrintName(budget.clientName || "");
    }
  }, [budget]);

  useEffect(() => {
    if (carePartnerName) setJbcRepName(carePartnerName);
  }, [carePartnerName]);

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
  const grandTotalSubsidy = allCalcs.reduce((sum, t) => sum + t.calcs.govtSubsidy, 0);
  const grandTotalExcess = allCalcs.reduce((sum, t) => sum + t.calcs.clientExcess, 0);
  const grandTotalGfUsed = allCalcs.reduce((sum, t) => sum + t.calcs.grandfatheredFundsUsed, 0);
  const grandTotalGfRemaining = allCalcs.reduce((sum, t) => sum + t.calcs.grandfatheredFundsRemaining, 0);

  const ongoingCalcs = calcBudget(budget, "ongoing");

  const isSigned =
    signatureDataUrl !== null &&
    clientPrintName.trim().length > 0 &&
    jbcSignatureDataUrl !== null &&
    jbcRepName.trim().length > 0;

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          nav, header, .no-print, .no-print-element { display: none !important; }
          @page { margin: 1.5cm 2cm; }
          .print-only { display: block !important; }
          .sig-print-img { display: block !important; max-height: 70px; margin-top: 4px; }
          /* Remove all card styling */
          [class*="rounded"], [class*="border"], [class*="shadow"] {
            border: none !important; box-shadow: none !important;
            border-radius: 0 !important; padding-left: 0 !important; padding-right: 0 !important;
          }
          /* Add subtle separators between sections */
          #print-area > div > div { border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 12px; }
          #print-area > div > div:last-child { border-bottom: none; }
          /* Tighten spacing */
          .space-y-8 > * + * { margin-top: 0.75rem !important; }
          .space-y-4 > * + * { margin-top: 0.5rem !important; }
          h1 { font-size: 1.25rem !important; }
          /* Remove background colors */
          [class*="bg-blue"], [class*="bg-gray"], [class*="bg-amber"], [class*="bg-red"] {
            background-color: transparent !important;
          }
          /* Keep text colors */
          .text-blue-700 { color: #1d4ed8 !important; }
          .text-red-600 { color: #dc2626 !important; }
          .text-amber-600 { color: #d97706 !important; }
          .text-green-600 { color: #16a34a !important; }
          /* Table styling */
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
          /* Signature clean look */
          .sig-print-img + div { display: none !important; }
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

          {/* Participant Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participant Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Participant Name:</span>{" "}
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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Quarterly Budget</p>
                  <p className="text-xl font-bold mt-1 text-blue-700">{formatCurrency(ongoingCalcs.totalQuarterlyBudget)}</p>
                </div>
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Care Management</p>
                  <p className="text-xl font-bold mt-1 text-blue-700">{formatCurrency(ongoingCalcs.careManagementAmount)}</p>
                </div>
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Available for Services</p>
                  <p className="text-xl font-bold mt-1 text-blue-700">{formatCurrency(ongoingCalcs.availableForServices)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center mt-4">
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Service Cost</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(grandTotalCost)}</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Participant Contribution</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(grandTotalContribution)}</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining Budget</p>
                  <p className={`text-xl font-bold mt-1 ${ongoingCalcs.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(ongoingCalcs.remaining)}</p>
                </div>

                {grandTotalGfUsed > 0 && (
                  <div>
                    <p className="text-xs text-amber-600 uppercase tracking-wide">HCP Funds Used (Grandfathered)</p>
                    <p className="text-xl font-bold mt-1 text-amber-600">{formatCurrency(grandTotalGfUsed)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Remaining: {formatCurrency(grandTotalGfRemaining)}</p>
                  </div>
                )}
                {grandTotalExcess > 0 && (
                  <div>
                    <p className="text-xs text-red-600 uppercase tracking-wide">Participant Excess (Out of Pocket)</p>
                    <p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(grandTotalExcess)}</p>
                  </div>
                )}
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
                      <th className="py-2 font-medium text-right">Participant Contrib.</th>
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

                    {/* Acknowledgement of Consent - Budget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acknowledgement of Consent - Budget</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed space-y-3">
              <p>
                This form acknowledges consent to the content of this Budget and the related service delivery considerations.
              </p>
              <p>
                This form assumes the content and considerations regarding this Budget have been discussed, agreed to, and understood, so that the customer (or the person signing on their behalf) has provided informed consent.
              </p>
            </CardContent>
          </Card>

          {/* Acknowledgement of Consent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acknowledgement of Consent</CardTitle>
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
                  My estimated participant contribution is{" "}
                  <strong>{formatCurrency(grandTotalContribution)}</strong>, calculated in accordance
                  with the Support at Home contribution framework based on my pension status.
                </li>
                <li>
                  I have the right to change providers at any time with 14 days written notice as set out
                  in my Home Care Agreement.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Person Acknowledging Consent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Person Acknowledging Consent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="no-print-element">
                  <label className="block text-sm font-medium mb-1">Full Name (print)</label>
                  <Input
                    value={clientPrintName}
                    onChange={(e) => setClientPrintName(e.target.value)}
                    placeholder="Enter your full name"
                    className="max-w-sm"
                  />
                </div>
                <p className="print-only text-sm" style={{ display: "none" }}>
                  <span className="font-medium">Name:</span> {clientPrintName}
                </p>
              </div>
              <div>
                <div className="no-print-element">
                <label className="block text-sm font-medium mb-1">Relationship to Participant</label>
                <Select value={relationshipToClient} onValueChange={(val) => { setRelationshipToClient(val); if (val === "self" && budget) setClientPrintName(budget.clientName || ""); else if (val !== "self") setClientPrintName(""); }}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Self</SelectItem>
                    <SelectItem value="family_member">Family Member</SelectItem>
                    <SelectItem value="legal_guardian">Legal Guardian</SelectItem>
                    <SelectItem value="authorised_representative">Authorised Representative</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                </div>
                {relationshipToClient !== "self" && (
                  <p className="print-only text-sm" style={{ display: "none" }}>
                    <span className="font-medium">Relationship to Participant:</span> {relationshipLabels[relationshipToClient] || relationshipToClient}
                  </p>
                )}
              </div>
              <div>
                <div className="no-print-element">
                  <label className="block text-sm font-medium mb-1">Signature</label>
                  <SignaturePad onSignatureChange={setSignatureDataUrl} />
                </div>
                {signatureDataUrl && (
                  <img src={signatureDataUrl} alt="Signature" className="sig-print-img" style={{ display: "none" }} />
                )}
              </div>
              <div className="text-sm">
                <span className="font-medium">Date:</span> {new Date().toLocaleDateString("en-AU")}
              </div>
            </CardContent>
          </Card>

          {/* Authorised Person from Just Better Care */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Authorised Person from Just Better Care</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="no-print-element">
                  <label className="block text-sm font-medium mb-1">Name of authorised person from Just Better Care</label>
                  <Input
                    value={jbcRepName}
                    onChange={(e) => setJbcRepName(e.target.value)}
                    placeholder="Enter name"
                    className="max-w-sm"
                  />
                </div>
                <p className="print-only text-sm" style={{ display: "none" }}>
                  <span className="font-medium">Name:</span> {jbcRepName}
                </p>
              </div>
              <div>
                <div className="no-print-element">
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <Input
                    value={jbcRepRole}
                    onChange={(e) => setJbcRepRole(e.target.value)}
                    placeholder="Enter role"
                    className="max-w-sm"
                  />
                </div>
                <p className="print-only text-sm" style={{ display: "none" }}>
                  <span className="font-medium">Role:</span> {jbcRepRole}
                </p>
              </div>
              <div>
                <div className="no-print-element">
                  <label className="block text-sm font-medium mb-1">Signature</label>
                  <SignaturePad onSignatureChange={setJbcSignatureDataUrl} />
                </div>
                {jbcSignatureDataUrl && (
                  <img src={jbcSignatureDataUrl} alt="Signature" className="sig-print-img" style={{ display: "none" }} />
                )}
              </div>
              <div className="text-sm">
                <span className="font-medium">Date:</span> {new Date().toLocaleDateString("en-AU")}
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
