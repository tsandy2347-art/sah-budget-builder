"use client";

import { useEffect, useRef } from "react";
import { saveBudget } from "@/lib/storage";
import type { ClientBudget } from "@/lib/types";

export function useAutoSave(budget: ClientBudget | null, delay = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!budget) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveBudget(budget);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [budget, delay]);
}
