import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const org1 = await prisma.organisation.upsert({
      where: { name: "Sunshine Coast" },
      update: {},
      create: {
        name: "Sunshine Coast",
        providerName: "Just Better Care Sunshine Coast PTY LTD",
      },
    });

    const org2 = await prisma.organisation.upsert({
      where: { name: "Central Queensland" },
      update: {},
      create: {
        name: "Central Queensland",
        providerName: "Just Better Care CQ PTY LTD",
      },
    });

    return NextResponse.json({ ok: true, organisations: [org1, org2] });
  } catch (error) {
    console.error("Seed orgs error:", error);
    return NextResponse.json({ error: "Failed to seed organisations." }, { status: 500 });
  }
}
