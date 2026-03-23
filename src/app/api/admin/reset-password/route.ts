import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST - admin sets a new password for a user
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, password } = await req.json();

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, resetToken: null, resetTokenExpires: null },
  });

  return NextResponse.json({ message: `Password reset for ${user.email}.` });
}
