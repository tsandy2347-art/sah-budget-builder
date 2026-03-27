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

// PATCH - approve/reject user, change role
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.approved === "boolean") data.approved = body.approved;
  if (body.role === "ADMIN" || body.role === "USER") data.role = body.role;
  if (typeof body.organisationId === "string") data.organisationId = body.organisationId || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  // Prevent removing your own admin role
  if (id === admin.id && data.role === "USER") {
    return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
  }

  // Prevent unapproving yourself
  if (id === admin.id && data.approved === false) {
    return NextResponse.json({ error: "You cannot revoke your own access." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, approved: true, createdAt: true },
  });

  return NextResponse.json(user);
}

// DELETE - remove user
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
