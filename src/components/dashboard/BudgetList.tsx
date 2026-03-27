"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BudgetCard } from "./BudgetCard";
import { ImportBudgetButton } from "./ImportBudgetButton";
import { apiFetchBudgets, apiSaveBudget } from "@/lib/api-client";
import { createNewBudget } from "@/lib/storage";
import type { ClientBudget } from "@/lib/types";
import { Plus, Search, FileSpreadsheet, Loader2 } from "lucide-react";

interface BudgetListProps {
  onExportPDF: (budget: ClientBudget) => void;
}

export function BudgetList({ onExportPDF }: BudgetListProps) {
  const router = useRouter();
  const { status } = useSession();
  const [myBudgets, setMyBudgets] = useState<ClientBudget[]>([]);
  const [searchResults, setSearchResults] = useState<ClientBudget[] | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetchBudgets();
      setMyBudgets(data);
    } catch {
      setMyBudgets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") refresh();
    if (status === "unauthenticated") router.push("/login");
  }, [status, refresh, router]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetchBudgets(search);
        const filtered = data.filter((b) =>
          b.clientName.toLowerCase().includes(search.toLowerCase()) ||
          b.macId.toLowerCase().includes(search.toLowerCase())
        );
        setSearchResults(filtered);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleCreate() {
    const budget = createNewBudget();
    await apiSaveBudget(budget);
    router.push(`/budget/${budget.id}`);
  }

  const budgets = searchResults !== null ? searchResults : myBudgets;
  const isSearching = search.trim().length > 0;

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search all participants by name or MAC ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <ImportBudgetButton onImported={refresh} />
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Forecast Budget
          </Button>
        </div>
      </div>

      {!isSearching && budgets.length > 0 && (
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">My Participants</h2>
      )}
      {isSearching && budgets.length > 0 && (
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Search Results {searching ? "(searching...)" : ""}</h2>
      )}
      {budgets.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          </div>
          {search ? (
            <div>
              <p className="font-medium">No forecast budgets match &ldquo;{search}&rdquo;</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-lg">No forecast budgets yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new forecast budget to get started with a participant&apos;s Support at Home plan.
              </p>
              <Button className="mt-4 gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Create your first forecast budget
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onRefresh={refresh}
              onExportPDF={onExportPDF}
            />
          ))}
        </div>
      )}
    </div>
  );
}
