"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryBadge } from "./CategoryBadge";
import { AddServiceModal } from "./AddServiceModal";
import { calcServiceCost, calcClientContribution, scaleAmount, VIEW_PERIOD_LABELS } from "@/lib/calculations";
import { FREQUENCY_LABELS, SERVICE_FREQUENCIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import type { ServiceLineItem, BudgetType, PensionStatus, PartPensionerRates, ViewPeriod, ServiceFrequency } from "@/lib/types";

interface ServiceTableProps {
  services: ServiceLineItem[];
  budgetType: BudgetType;
  pensionStatus: PensionStatus;
  partPensionerRates: PartPensionerRates;
  isGrandfathered?: boolean;
  defaultWeeks: number;
  viewPeriod: ViewPeriod;
  onAdd: (item: Omit<ServiceLineItem, "id">) => void;
  onUpdate: (id: string, updates: Partial<ServiceLineItem>) => void;
  onRemove: (id: string) => void;
}

export function ServiceTable({
  services,
  budgetType,
  pensionStatus,
  partPensionerRates,
  isGrandfathered,
  defaultWeeks,
  viewPeriod,
  onAdd,
  onUpdate,
  onRemove,
}: ServiceTableProps) {
  const [showModal, setShowModal] = useState(false);

  function validate(item: ServiceLineItem): string | null {
    if (!item.isLumpSum) {
      if (item.ratePerHour <= 0) return "Rate must be > 0";
      if (item.hrsPerSession <= 0) return "Hrs/session must be > 0";
      if (item.daysPerFrequency <= 0) return "Days must be > 0";
      if (item.ratePerHour > 1000) return "Rate seems high (>$1,000/hr)";
    } else {
      if (item.lumpSumAmount < 0) return "Amount must be ≥ 0";
    }
    return null;
  }

  const costLabel = viewPeriod === "quarterly" ? "Qtr Cost" : viewPeriod === "monthly" ? "Monthly Cost" : "F/N Cost";

  const totals = {
    cost: services.reduce((sum, s) => sum + calcServiceCost(s), 0),
    contrib: services.reduce((sum, s) => sum + calcClientContribution(s, pensionStatus, partPensionerRates, isGrandfathered), 0),
  };

  return (
    <div className="space-y-3">
      {services.length === 0 ? (
        <div className="text-center py-10 border rounded-lg border-dashed bg-muted/20">
          <p className="text-sm text-muted-foreground">No services added yet.</p>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setShowModal(true)}>
            <Plus className="h-3 w-3" /> Add service
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground min-w-[160px]">Service</th>
                  <th className="text-left px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Provider</th>
                  <th className="text-left px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Category</th>
                  <th className="text-left px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Frequency</th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Rate/Hr</th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Hrs/Session</th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Days/Freq</th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{costLabel}</th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Client Contrib</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((item, idx) => {
                  const cost = calcServiceCost(item);
                  const contrib = calcClientContribution(item, pensionStatus, partPensionerRates, isGrandfathered);
                  const warning = validate(item);
                  return (
                    <tr key={item.id} className={`border-b last:border-b-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {warning && (
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" aria-label={warning ?? undefined} />
                          )}
                          <Input
                            className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-1 focus-visible:ring-ring"
                            value={item.name}
                            onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          className="h-7 text-sm border rounded px-1 bg-background w-full min-w-[90px]"
                          value={item.staffType ?? "jbc"}
                          onChange={(e) => onUpdate(item.id, { staffType: e.target.value as "jbc" | "third_party" })}
                        >
                          <option value="jbc">JBC Staff</option>
                          <option value="third_party">Third Party</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <CategoryBadge category={item.category} size="sm" />
                      </td>
                      {item.isLumpSum ? (
                        <>
                          <td colSpan={4} className="px-2 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs text-muted-foreground">$</span>
                              <Input
                                className="h-7 w-24 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="number"
                                min={0}
                                value={item.lumpSumAmount}
                                onChange={(e) => onUpdate(item.id, { lumpSumAmount: Number(e.target.value) })}
                              />
                              <span className="text-xs text-muted-foreground">lump</span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2">
                            <select
                              className="h-7 text-sm border rounded px-1 bg-background w-full min-w-[90px]"
                              value={item.frequency ?? "weekly"}
                              onChange={(e) => onUpdate(item.id, { frequency: e.target.value as ServiceFrequency })}
                            >
                              {SERVICE_FREQUENCIES.map((f) => (
                                <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              className="h-7 w-20 text-sm text-right pr-1 ml-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              type="number"
                              min={0}
                              value={item.ratePerHour}
                              onChange={(e) => onUpdate(item.id, { ratePerHour: Number(e.target.value) })}
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              className="h-7 w-16 text-sm text-right pr-1 ml-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              type="number"
                              min={0}
                              step={0.5}
                              value={item.hrsPerSession ?? 0}
                              onChange={(e) => onUpdate(item.id, { hrsPerSession: Number(e.target.value) })}
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              className="h-7 w-14 text-sm text-right pr-1 ml-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              type="number"
                              min={1}
                              max={52}
                              value={item.daysPerFrequency ?? 1}
                              onChange={(e) => onUpdate(item.id, { daysPerFrequency: Number(e.target.value) })}
                            />
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2 text-right font-medium whitespace-nowrap">{formatCurrency(scaleAmount(cost, viewPeriod))}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground whitespace-nowrap">{formatCurrency(scaleAmount(contrib, viewPeriod))}</td>
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemove(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 font-semibold">
                  <td colSpan={7} className="px-3 py-2.5 text-right text-sm">Total ({VIEW_PERIOD_LABELS[viewPeriod]})</td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">{formatCurrency(scaleAmount(totals.cost, viewPeriod))}</td>
                  <td className="px-2 py-2.5 text-right text-muted-foreground whitespace-nowrap">{formatCurrency(scaleAmount(totals.contrib, viewPeriod))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Add service
          </Button>
        </>
      )}

      <AddServiceModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onAdd={onAdd}
        budgetType={budgetType}
        defaultWeeks={defaultWeeks}
      />
    </div>
  );
}
