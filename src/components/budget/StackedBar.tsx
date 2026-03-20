"use client";

import { formatCurrency } from "@/lib/format";
import type { CategoryTotals } from "@/lib/types";

interface StackedBarProps {
  byCategory: CategoryTotals;
  careManagement: number;
  envelope: number;
}

const SEGMENTS = [
  { key: "clinical" as const,     label: "Clinical",         color: "bg-blue-500" },
  { key: "independence" as const, label: "Independence",     color: "bg-teal-500" },
  { key: "everyday" as const,     label: "Everyday Living",  color: "bg-amber-500" },
];

export function StackedBar({ byCategory, careManagement, envelope }: StackedBarProps) {
  const totalUsed = byCategory.clinical + byCategory.independence + byCategory.everyday + careManagement;
  const pct = (v: number) => (envelope > 0 ? Math.min((v / envelope) * 100, 100) : 0);

  const segments = [
    ...SEGMENTS.map((s) => ({ ...s, value: byCategory[s.key] })),
    { key: "careManagement", label: "Care Management", color: "bg-slate-400", value: careManagement },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-8 rounded-full overflow-hidden bg-muted gap-px">
        {segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.key}
              className={`${s.color} transition-all`}
              style={{ width: `${pct(s.value)}%` }}
              title={`${s.label}: ${formatCurrency(s.value)}`}
            />
          ) : null
        )}
        {totalUsed < envelope && (
          <div
            className="bg-muted-foreground/10 flex-1"
            title={`Unspent: ${formatCurrency(envelope - totalUsed)}`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.color} flex-shrink-0`} />
            <span className="text-muted-foreground">{s.label}:</span>
            <span className="font-medium">{formatCurrency(s.value)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/20 flex-shrink-0" />
          <span className="text-muted-foreground">Unspent:</span>
          <span className="font-medium">{formatCurrency(Math.max(0, envelope - totalUsed))}</span>
        </div>
      </div>
    </div>
  );
}
