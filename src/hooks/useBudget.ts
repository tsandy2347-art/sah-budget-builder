"use client";

import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { apiFetchBudget, apiSaveBudget } from "@/lib/api-client";
import { createNewBudget } from "@/lib/storage";
import type { ClientBudget, ServiceLineItem, BudgetType, PathwayConfig } from "@/lib/types";

export function useBudget(id: string) {
  const [budget, setBudget] = useState<ClientBudget | null>(null);
  const [loading, setLoading] = useState(true);

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
        // Fallback: create fresh budget if API fails
        const fresh = { ...createNewBudget(), id };
        setBudget(fresh);
      }
      setLoading(false);
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

  const updateClientDetails = useCallback(
    (updates: Partial<Omit<ClientBudget, "id" | "tabs" | "createdAt" | "updatedAt">>) => {
      setBudget((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    []
  );

  const setActiveTab = useCallback((tab: BudgetType) => {
    setBudget((prev) => (prev ? { ...prev, activeTab: tab } : prev));
  }, []);

  const updatePathwayConfig = useCallback((budgetType: BudgetType, config: Partial<PathwayConfig>) => {
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
  }, []);

  const addService = useCallback((budgetType: BudgetType, item: Omit<ServiceLineItem, "id">) => {
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
  }, []);

  const updateService = useCallback(
    (budgetType: BudgetType, itemId: string, updates: Partial<ServiceLineItem>) => {
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
    []
  );

  const removeService = useCallback((budgetType: BudgetType, itemId: string) => {
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
  }, []);

  const clearServices = useCallback((budgetType: BudgetType) => {
    setBudget((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tabs: prev.tabs.map((t) =>
          t.budgetType === budgetType ? { ...t, services: [] } : t
        ),
      };
    });
  }, []);

  return {
    budget,
    loading,
    updateClientDetails,
    setActiveTab,
    updatePathwayConfig,
    addService,
    updateService,
    removeService,
    clearServices,
  };
}
