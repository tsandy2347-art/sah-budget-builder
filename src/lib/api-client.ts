import type { ClientBudget } from "./types";

// ─── Budget API client (replaces localStorage) ─────────────────────────────

export async function apiFetchBudgets(): Promise<ClientBudget[]> {
  const res = await fetch("/api/budgets");
  if (!res.ok) throw new Error("Failed to fetch budgets");
  const rows = await res.json();
  return rows.map((r: any) => ({
    ...r.data,
    _dbId: r.id,
    _owner: r.user?.name ?? "Unknown",
  }));
}

export async function apiFetchBudget(id: string): Promise<ClientBudget | null> {
  const res = await fetch(`/api/budgets/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch budget");
  const row = await res.json();
  return row.data as ClientBudget;
}

export async function apiSaveBudget(budget: ClientBudget): Promise<void> {
  await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: budget.id, data: budget }),
  });
}

export async function apiDeleteBudget(id: string): Promise<void> {
  await fetch(`/api/budgets/${id}`, { method: "DELETE" });
}

export async function apiDuplicateBudget(original: ClientBudget): Promise<ClientBudget> {
  const { v4: uuidv4 } = await import("uuid");
  const now = new Date().toISOString();
  const copy: ClientBudget = {
    ...JSON.parse(JSON.stringify(original)),
    id: uuidv4(),
    clientName: `${original.clientName} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  await apiSaveBudget(copy);
  return copy;
}
