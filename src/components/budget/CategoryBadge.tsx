import { Badge } from "@/components/ui/badge";
import type { ServiceCategory } from "@/lib/types";

interface CategoryBadgeProps {
  category: ServiceCategory;
  size?: "sm" | "default";
}

const CATEGORY_CONFIG: Record<ServiceCategory, { label: string; className: string }> = {
  clinical:     { label: "Clinical",     className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  independence: { label: "Independence", className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800" },
  everyday:     { label: "Everyday",     className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
};

export function CategoryBadge({ category, size = "default" }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs"} font-medium whitespace-nowrap`}
    >
      {config.label}
    </Badge>
  );
}

export { CATEGORY_CONFIG };
