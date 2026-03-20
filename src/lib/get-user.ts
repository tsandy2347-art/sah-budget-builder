import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) return null;
  return { id: (session.user as any).id as string, name: session.user.name!, email: session.user.email! };
}
