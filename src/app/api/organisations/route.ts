import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const organisations = await prisma.organisation.findMany({
      select: {
        id: true,
        name: true,
        providerName: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(organisations);
  } catch (error) {
    console.error("Fetch organisations error:", error);
    return NextResponse.json({ error: "Failed to fetch organisations." }, { status: 500 });
  }
}
