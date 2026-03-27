import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/get-user";

// GET /api/budgets — list budgets
// ?search=term — search all participants by name/MAC ID within the same organisation
// default — only the current user's budgets
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search");

  let budgets;
  if (search) {
    // Search across budgets within the same organisation
    const where: Record<string, unknown> = {};
    if (user.organisationId) {
      where.user = { organisationId: user.organisationId };
    }
    budgets = await prisma.budget.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });
  } else {
    // Default: only current user's budgets
    budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });
  }

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

  // If creating a new budget and providerName is not set, use the org's providerName
  if (data && !data.providerName && user.organisationId) {
    const org = await prisma.organisation.findUnique({
      where: { id: user.organisationId },
      select: { providerName: true },
    });
    if (org) {
      data.providerName = org.providerName;
    }
  }

  const budget = await prisma.budget.upsert({
    where: { id },
    create: { id, data, userId: user.id },
    update: { data },
  });

  return NextResponse.json(budget);
}
