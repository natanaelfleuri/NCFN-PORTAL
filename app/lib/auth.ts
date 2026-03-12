import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

const IS_DEV_BYPASS = process.env.DEV_BYPASS === "true";

// Sessão fake para DEV_BYPASS
const DEV_SESSION = {
  user: {
    name: "Dev Admin",
    email: process.env.ADMIN_EMAIL || "dev@ncfn.local",
    image: null,
    role: "admin" as const,
    policyAcceptedAt: new Date().toISOString(),
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

// Usuário fake para DEV_BYPASS — simula admin no banco
const DEV_DB_USER = {
  id: "dev-admin-bypass",
  name: "Dev Admin",
  email: process.env.ADMIN_EMAIL || "dev@ncfn.local",
  image: null,
  role: "admin",
  planType: "PRO",
  uploadedFilesCount: 0,
  totalBytesUsed: 0,
  policyAcceptedAt: new Date(),
  lastSeenAt: new Date(),
  deadManSwitchDays: null,
  deadManTriggerAction: "LOCKDOWN",
  fullName: null,
  documentId: null,
  certificationAuth: null,
  emailVerified: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  proAccessUntil: null,
};

/**
 * Wrapper de getServerSession com suporte a DEV_BYPASS.
 * Use em TODAS as rotas no lugar de getServerSession(authOptions).
 */
export async function getSession() {
  if (IS_DEV_BYPASS) return DEV_SESSION as any;
  return getServerSession(authOptions);
}

/**
 * Busca o usuário no banco ou retorna fake admin em DEV_BYPASS.
 * Use em rotas que precisam verificar role/planType do DB.
 */
export async function getDbUser(email: string) {
  if (IS_DEV_BYPASS) return DEV_DB_USER as any;
  return prisma.user.findUnique({ where: { email } });
}
