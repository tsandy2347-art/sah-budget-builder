import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Create/update organisations
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

    // Assign all existing users without an org to Sunshine Coast
    const unassigned = await prisma.user.updateMany({
      where: { organisationId: null },
      data: { organisationId: org1.id },
    });

    // Make tsandy2347@gmail.com admin if they exist
    const adminUser = await prisma.user.findUnique({
      where: { email: "tsandy2347@gmail.com" },
    });
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { role: "ADMIN" },
      });
    }

    return NextResponse.json({
      ok: true,
      organisations: [org1, org2],
      usersAssignedToSunshineCoast: unassigned.count,
      adminSet: !!adminUser,
    });
  } catch (error) {
    console.error("Seed orgs error:", error);
    return NextResponse.json({ error: "Failed to seed organisations", details: String(error) }, { status: 500 });
  }
}
