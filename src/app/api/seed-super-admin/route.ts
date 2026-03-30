import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Not admin" }, { status: 403 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { organisationId: null },
  });

  return NextResponse.json({ ok: true, message: "You are now a super admin (no org scope)" });
}
