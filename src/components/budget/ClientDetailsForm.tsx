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

        {budget.pensionStatus === "part_pensioner" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="indepRate">Independence Contribution Rate (%)</Label>
              <Input
                id="indepRate"
                type="number"
                min={5}
                max={50}
                step={1}
                value={Math.round(budget.partPensionerRates.independence * 100)}
                onChange={(e) =>
                  onChange({
                    partPensionerRates: {
                      ...budget.partPensionerRates,
                      independence: Math.min(0.5, Math.max(0.05, Number(e.target.value) / 100)),
                    },
                  })
                }
              />
              <p className="text-xs text-muted-foreground">5%–50% (means-tested)</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="everydayRate">Everyday Living Contribution Rate (%)</Label>
              <Input
                id="everydayRate"
                type="number"
                min={17.5}
                max={80}
                step={1}
                value={Math.round(budget.partPensionerRates.everyday * 100)}
                onChange={(e) =>
                  onChange({
                    partPensionerRates: {
                      ...budget.partPensionerRates,
                      everyday: Math.min(0.8, Math.max(0.175, Number(e.target.value) / 100)),
                    },
                  })
                }
              />
              <p className="text-xs text-muted-foreground">17.5%–80% (means-tested)</p>
            </div>
          </>
        )}
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Annual Budget" value={calcs.annualBudget} variant="blue" />
        <MetricCard label="Quarterly Budget" value={calcs.quarterlyBudget} variant="blue" />
        <MetricCard
          label="Care Management"
          value={calcs.careManagementAmount}
          subLabel={`${budget.careManagementPct}% of quarterly`}
          variant="amber"
        />
        <MetricCard
          label="Available for Services"
          value={calcs.availableForServices}
          subLabel="After care management"
          variant="green"
        />
      </div>
    </div>
  );
}
