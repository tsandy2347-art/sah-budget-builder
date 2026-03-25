"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CategoryBadge } from "./CategoryBadge";
import { DEFAULT_SERVICES_BY_TYPE, FREQUENCY_LABELS, SERVICE_FREQUENCIES } from "@/lib/constants";
import type { ServiceLineItem, ServiceCategory, ServiceFrequency, BudgetType } from "@/lib/types";

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: Omit<ServiceLineItem, "id">) => void;
  budgetType: BudgetType;
  defaultWeeks: number;
}

const EMPTY_FORM = {
  name: "",
  category: "clinical" as ServiceCategory,
  ratePerHour: 0,
  hrsPerSession: 1,
  daysPerFrequency: 1,
  frequency: "weekly" as ServiceFrequency,
  isLumpSum: false,
  lumpSumAmount: 0,
};

export function AddServiceModal({ open, onClose, onAdd, budgetType, defaultWeeks }: AddServiceModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [mode, setMode] = useState<"quick" | "custom">("quick");

  const defaults = DEFAULT_SERVICES_BY_TYPE[budgetType];

  function handleQuickAdd(d: typeof defaults[0]) {
    onAdd({
      name: d.name,
      category: d.category,
      ratePerHour: d.ratePerHour,
      frequency: d.defaultFrequency ?? "weekly",
      hrsPerSession: d.defaultHrsPerSession ?? 1,
      daysPerFrequency: d.defaultDaysPerFrequency ?? 1,
      isLumpSum: d.isLumpSum ?? false,
      lumpSumAmount: d.defaultLumpSumAmount ?? 0,
    });
    onClose();
  }

  function handleCustomAdd() {
    if (!form.name.trim()) return;
    onAdd(form);
    setForm({ ...EMPTY_FORM });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant={mode === "quick" ? "default" : "outline"} size="sm" onClick={() => setMode("quick")}>
            Quick Add
          </Button>
          <Button variant={mode === "custom" ? "default" : "outline"} size="sm" onClick={() => setMode("custom")}>
            Custom Service
          </Button>
        </div>

        {mode === "quick" ? (
          <div className="space-y-2">
            {defaults.map((d) => (
              <button
                key={d.name}
                onClick={() => handleQuickAdd(d)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CategoryBadge category={d.category} size="sm" />
                  <span className="text-sm font-medium truncate">{d.name}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {d.isLumpSum ? `$${d.defaultLumpSumAmount} lump sum` : `$${d.ratePerHour}/hr`}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Service Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Home nursing"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as ServiceCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinical">Clinical</SelectItem>
                  <SelectItem value="independence">Independence</SelectItem>
                  <SelectItem value="everyday">Everyday Living</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isLumpSum}
                  onChange={(e) => setForm((f) => ({ ...f, isLumpSum: e.target.checked }))}
                  className="rounded"
                />
                Lump sum item
              </label>
            </div>
            {form.isLumpSum ? (
              <div className="space-y-1.5">
                <Label>Lump Sum Amount ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.lumpSumAmount}
                  onChange={(e) => setForm((f) => ({ ...f, lumpSumAmount: Number(e.target.value) }))}
                />
              </div>
            ) : (<>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as ServiceFrequency }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq} value={freq}>{FREQUENCY_LABELS[freq]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Rate/Hr ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.ratePerHour}
                    onChange={(e) => setForm((f) => ({ ...f, ratePerHour: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hrs/Session</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.hrsPerSession}
                    onChange={(e) => setForm((f) => ({ ...f, hrsPerSession: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Days/Freq</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={form.daysPerFrequency}
                    onChange={(e) => setForm((f) => ({ ...f, daysPerFrequency: Number(e.target.value) }))}
                  />
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {mode === "custom" && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCustomAdd} disabled={!form.name.trim()}>Add Service</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
