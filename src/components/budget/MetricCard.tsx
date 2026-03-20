import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface MetricCardProps {
  label: string;
  value: number;
  subLabel?: string;
  highlight?: boolean;
  variant?: "default" | "blue" | "amber" | "green";
}

const variantClasses = {
  default: "bg-card",
  blue:    "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  amber:   "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  green:   "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
};

export function MetricCard({ label, value, subLabel, variant = "default" }: MetricCardProps) {
  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1 tabular-nums">{formatCurrency(value)}</p>
        {subLabel && <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>}
      </CardContent>
    </Card>
  );
}
