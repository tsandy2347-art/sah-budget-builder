import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) return null;

  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      organisationId: true,
      organisation: {
        select: {
          id: true,
          name: true,
          providerName: true,
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organisationId: user.organisationId,
    organisation: user.organisation,
  };
}
