"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MetricCard } from "./MetricCard";
import {
  SAH_CLASSIFICATIONS,
  TRANSITIONED_HCP_LEVELS,
  QUARTERS,
  PENSION_STATUS_LABELS,
  CARE_MANAGEMENT_DEFAULT_PCT,
  SUPPLEMENTS,
} from "@/lib/constants";
import { calcBudget } from "@/lib/calculations";
import type { ClientBudget, PensionStatus } from "@/lib/types";

interface ClientDetailsFormProps {
  budget: ClientBudget;
  onChange: (updates: Partial<ClientBudget>) => void;
}

export function ClientDetailsForm({ budget, onChange }: ClientDetailsFormProps) {
  const calcs = calcBudget(budget, "ongoing");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="clientName">Client Name</Label>
          <Input
            id="clientName"
            value={budget.clientName}
            onChange={(e) => onChange({ clientName: e.target.value })}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="macId">My Aged Care ID</Label>
          <Input
            id="macId"
            value={budget.macId}
            onChange={(e) => onChange({ macId: e.target.value })}
            placeholder="1-XXXXXXX"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Provider Name</Label>
          <p className="text-sm font-medium py-2 px-3 bg-muted rounded-md">
            Just Better Care Sunshine Coast PTY LTD
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Classification</Label>
          <Select value={budget.classificationId} onValueChange={(v) => onChange({ classificationId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>SaH Classifications</SelectLabel>
                {SAH_CLASSIFICATIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Transitioned HCP</SelectLabel>
                {TRANSITIONED_HCP_LEVELS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Pension Status</Label>
          <Select value={budget.pensionStatus} onValueChange={(v) => onChange({ pensionStatus: v as PensionStatus })}>
            <SelectTrigger>
              <SelectValue placeholder="Select pension status" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PENSION_STATUS_LABELS) as [PensionStatus, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 flex items-end">
          <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={budget.isGrandfathered ?? false}
              onChange={() => onChange({ isGrandfathered: !(budget.isGrandfathered ?? false) })}
              className="rounded border-gray-300"
            />
            <span>Grandfathered (0% contributions)</span>
          </label>
        </div>
        <div className="space-y-1.5 flex items-end">
          <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={budget.isGrandfatheredContributions ?? false}
              onChange={() => onChange({ isGrandfatheredContributions: !(budget.isGrandfatheredContributions ?? false) })}
              className="rounded border-gray-300"
            />
            <span>Grandfathered Contributions</span>
          </label>
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={budget.isPartiallyFunded ?? false}
              onChange={() => {
                const toggled = !(budget.isPartiallyFunded ?? false);
                onChange({
                  isPartiallyFunded: toggled,
                  customQuarterlyBudget: toggled ? calcs.quarterlyBudget : undefined,
                });
              }}
              className="rounded border-gray-300"
            />
            <span>Partially Funded</span>
          </label>
          {budget.isPartiallyFunded && (
            <div className="mt-1.5">
              <Label htmlFor="customQuarterlyBudget">Quarterly Budget ($)</Label>
              <Input
                id="customQuarterlyBudget"
                type="number"
                min={0}
                step={0.01}
                value={budget.customQuarterlyBudget ?? 0}
                onChange={(e) => onChange({ customQuarterlyBudget: Math.max(0, Number(e.target.value)) })}
              />
              <p className="text-xs text-muted-foreground">Override the standard classification budget</p>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Quarter</Label>
          <Select value={budget.quarter} onValueChange={(v) => onChange({ quarter: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="careManagement">Care Management Fee (%)</Label>
          <Input
            id="careManagement"
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={budget.careManagementPct}
            onChange={(e) => onChange({ careManagementPct: Math.min(10, Math.max(0, Number(e.target.value))) })}
          />
          <p className="text-xs text-muted-foreground">0–10%, default 10%</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unspentFunds">Unspent Funds (Prior Quarter)</Label>
          <Input
            id="unspentFunds"
            type="number"
            min={0}
            step={0.01}
            value={budget.unspentPriorQuarter ?? 0}
            onChange={(e) => onChange({ unspentPriorQuarter: Math.max(0, Number(e.target.value)) })}
          />
          <p className="text-xs text-muted-foreground">
            Unspent SaH funds carried forward (capped at carryover limit)
          </p>
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label>Supplements</Label>
          <div className="flex flex-wrap gap-4">
            {SUPPLEMENTS.map((supp) => {
              const isChecked = (budget.supplements ?? []).includes(supp.id);
              return (
                <label key={supp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const current = budget.supplements ?? [];
                      const updated = isChecked
                        ? current.filter((s) => s !== supp.id)
                        : [...current, supp.id];
                      onChange({ supplements: updated });
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>{supp.label}</span>
                  <span className="text-xs text-muted-foreground">
                    (${supp.quarterlyAmount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}/qtr)
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Supplements are added to the base classification budget. Eligibility must be confirmed via My Aged Care.
          </p>
        </div>

        {(!budget.isGrandfathered || budget.isGrandfatheredContributions) && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="indepRate">Independence Contribution Rate (%)</Label>
              <Input
                id="indepRate"
                type="number"
                min={budget.isGrandfatheredContributions ? 0 : 5}
                max={50}
                step={0.01}
                value={Math.round(budget.partPensionerRates.independence * 10000) / 100}
                onChange={(e) =>
                  onChange({
                    partPensionerRates: {
                      ...budget.partPensionerRates,
                      independence: Math.min(0.5, Math.max(budget.isGrandfatheredContributions ? 0 : 0.05, Number(e.target.value) / 100)),
                    },
                  })
                }
              />
              <p className="text-xs text-muted-foreground">{budget.isGrandfatheredContributions ? '0%–50% (grandfathered)' : '5%–50% (means-tested)'}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="everydayRate">Everyday Living Contribution Rate (%)</Label>
              <Input
                id="everydayRate"
                type="number"
                min={budget.isGrandfatheredContributions ? 0 : 17.5}
                max={80}
                step={0.01}
                value={Math.round(budget.partPensionerRates.everyday * 10000) / 100}
                onChange={(e) =>
                  onChange({
                    partPensionerRates: {
                      ...budget.partPensionerRates,
                      everyday: Math.min(0.8, Math.max(budget.isGrandfatheredContributions ? 0 : 0.175, Number(e.target.value) / 100)),
                    },
                  })
                }
              />
              <p className="text-xs text-muted-foreground">{budget.isGrandfatheredContributions ? '0%–80% (grandfathered)' : '17.5%–80% (means-tested)'}</p>
            </div>
          </>
        )}
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Quarterly Budget"
          value={calcs.totalQuarterlyBudget}
          subLabel={calcs.supplementsQuarterly > 0 ? `Incl. $${calcs.supplementsQuarterly.toLocaleString("en-AU", { minimumFractionDigits: 2 })} supplements` : undefined}
          variant="blue"
        />
        <MetricCard
          label="Care Management"
          value={calcs.careManagementAmount}
          subLabel={`${budget.careManagementPct}% of quarterly`}
          variant="amber"
        />
        <MetricCard
          label="Available for Services"
          value={calcs.availableForServices}
          subLabel={calcs.effectiveCarryover > 0 ? `+ ${calcs.effectiveCarryover.toLocaleString("en-AU", { minimumFractionDigits: 2, style: "currency", currency: "AUD" })} carryover` : "After care management"}
          variant="green"
        />
      </div>
    </div>
  );
}
