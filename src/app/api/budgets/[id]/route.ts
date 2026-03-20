import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/get-user";

// GET /api/budgets/:id — get a single budget
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const budget = await prisma.budget.findUnique({ where: { id } });
  if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(budget);
}

// DELETE /api/budgets/:id — delete a budget
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.budget.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
