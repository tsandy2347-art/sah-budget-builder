import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/get-user";

// GET /api/budgets — list all budgets (everyone sees everything)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const budgets = await prisma.budget.findMany({
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(budgets);
}

// POST /api/budgets — create or update a budget
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, data } = body;

  if (!id || !data) {
    return NextResponse.json({ error: "id and data are required" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { id },
    create: { id, data, userId: user.id },
    update: { data },
  });

  return NextResponse.json(budget);
}
