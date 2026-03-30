import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Super admin (no org) sees everyone; org admin sees own org + all other admins
  const users = await prisma.user.findMany({
    where: admin.organisationId
      ? { OR: [{ organisationId: admin.organisationId }, { role: "ADMIN" }] }
      : {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approved: true,
      createdAt: true,
      organisation: { select: { id: true, name: true } },
      _count: { select: { budgets: true } },
    },
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ users, adminOrgId: admin.organisationId || null });
}
