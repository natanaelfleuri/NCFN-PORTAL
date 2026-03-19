// @ts-nocheck
export const dynamic = "force-dynamic";
import VitrineClient from "@/app/components/VitrineClient";
import { getSession, getDbUser } from "@/lib/auth";

export default async function VitrinePage() {
  const session = await getSession();
  let isAdmin = false;
  if (session?.user?.email) {
    const dbUser = await getDbUser(session.user.email);
    isAdmin = dbUser?.role === 'admin';
  }
  return <VitrineClient initialIsAdmin={isAdmin} />;
}
