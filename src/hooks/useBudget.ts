"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { apiFetchBudget, apiSaveBudget } from "@/lib/api-client";
import { createNewBudget } from "@/lib/storage";
import type { ClientBudget, ServiceLineItem, BudgetType, PathwayConfig } from "@/lib/types";

const MAX_HISTORY = 50;

export function useBudget(id: string) {
  const [budget, setBudget] = useState<ClientBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [canUndo, setCanUndo] = useState(false);

  // Ref always holds the latest budget for synchronous reads inside callbacks
  const budgetRef = useRef<ClientBudget | null>(null);
  useEffect(() => { budgetRef.current = budget; }, [budget]);

  // History stack — stored in a ref to avoid stale closures
  const pastRef = useRef<ClientBudget[]>([]);
  // Flag to prevent snapshotting the initial load
  const isLoaded = useRef(false);

  // Load from API on mount
  useEffect(() => {
    async function load() {
      try {
        const existing = await apiFetchBudget(id);
        if (existing) {
          setBudget(existing);
        } else {
          const fresh = { ...createNewBudget(), id };
          setBudget(fresh);
          await apiSaveBudget(fresh);
        }
      } catch {
        const fresh = { ...createNewBudget(), id };
        setBudget(fresh);
      }
      setLoading(false);
      isLoaded.current = true;
    }
    load();
  }, [id]);

  // Debounced save to API
  useEffect(() => {
    if (!budget) return;
    const timer = setTimeout(() => {
      apiSaveBudget(budget).catch(console.error);
    }, 500);
    return () => clearTimeout(timer);
  }, [budget]);

  // Snapshot the current budget onto the history stack before a change
  const snapshot = useCallback(() => {
    if (!budgetRef.current || !isLoaded.current) return;
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), budgetRef.current];
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    setBudget(prev);
    setCanUndo(pastRef.current.length > 0);
  }, []);

  const updateClientDetails = useCallback(
    (updates: Partial<Omit<ClientBudget, "id" | "tabs" | "createdAt" | "updatedAt">>) => {
      snapshot();
      setBudget((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    [snapshot]
  );

  const setActiveTab = useCallback((tab: BudgetType) => {
    setBudget((prev) => (prev ? { ...prev, activeTab: tab } : prev));
  }, []);

  const updatePathwayConfig = useCallback((budgetType: BudgetType, config: Partial<PathwayConfig>) => {
    snapshot();
    setBudget((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tabs: prev.tabs.map((t) =>
          t.budgetType === budgetType
            ? { ...t, pathwayConfig: { ...t.pathwayConfig, ...config } }
            : t
        ),
      };
    });
  }, [snapshot]);

  const addService = useCallback((budgetType: BudgetType, item: Omit<ServiceLineItem, "id">) => {
    snapshot();
    setBudget((prev) => {
      if (!prev) return prev;
      const newItem: ServiceLineItem = { ...item, id: uuidv4() };
      return {
        ...prev,
        tabs: prev.tabs.map((t) =>
          t.budgetType === budgetType
            ? { ...t, services: [...t.services, newItem] }
            : t
        ),
      };
    });
  }, [snapshot]);

  const updateService = useCallback(
    (budgetType: BudgetType, itemId: string, updates: Partial<ServiceLineItem>) => {
      snapshot();
      setBudget((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tabs: prev.tabs.map((t) =>
            t.budgetType === budgetType
              ? {
                  ...t,
                  services: t.services.map((s) =>
                    s.id === itemId ? { ...s, ...updates } : s
                  ),
                }
              : t
          ),
        };
      });
    },
    [snapshot]
  );

  const removeService = useCallback((budgetType: BudgetType, itemId: string) => {
    snapshot();
    setBudget((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tabs: prev.tabs.map((t) =>
          t.budgetType === budgetType
            ? { ...t, services: t.services.filter((s) => s.id !== itemId) }
            : t
        ),
      };
    });
  }, [snapshot]);

  const clearServices = useCallback((budgetType: BudgetType) => {
    snapshot();
    setBudget((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tabs: prev.tabs.map((t) =>
          t.budgetType === budgetType ? { ...t, services: [] } : t
        ),
      };
    });
  }, [snapshot]);

  return {
    budget,
    loading,
    canUndo,
    undo,
    updateClientDetails,
    setActiveTab,
    updatePathwayConfig,
    addService,
    updateService,
    removeService,
    clearServices,
  };
}
