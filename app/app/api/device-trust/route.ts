// @ts-nocheck
export const dynamic = "force-dynamic";
/**
 * Endpoint de bypass de dispositivo confiável.
 * Gera uma sessão NextAuth de 30 dias sem exigir qualquer formulário.
 * URL: /api/auth/device-trust?k=<HMAC(NEXTAUTH_SECRET,"ncfn-trusted-device-bypass-v1")[:32]>
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac }               from "crypto";
import { encode }                    from "next-auth/jwt";
import { prisma }                    from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const SECRET      = process.env.NEXTAUTH_SECRET!;

function deviceKey(): string {
  return createHmac("sha256", SECRET)
    .update("ncfn-trusted-device-bypass-v1")
    .digest("hex")
    .slice(0, 32);
}

export async function GET(req: NextRequest) {
  const k = req.nextUrl.searchParams.get("k");
  if (!k || k !== deviceKey()) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Garante que o admin existe no banco
  try {
    await prisma.user.upsert({
      where:  { email: ADMIN_EMAIL },
      update: { lastSeenAt: new Date(), role: "admin" },
      create: { email: ADMIN_EMAIL, lastSeenAt: new Date(), role: "admin" },
    });
  } catch (_) {}

  // Cria sessão NextAuth JWT de 30 dias
  const maxAge = 30 * 24 * 60 * 60;
  const sessionToken = await encode({
    token: {
      sub:              ADMIN_EMAIL,
      email:            ADMIN_EMAIL,
      name:             ADMIN_EMAIL,
      role:             "admin",
      loginAt:          Date.now(),
      totpVerified:     true,
      policyAcceptedAt: new Date().toISOString(),
    },
    secret: SECRET,
    maxAge,
  });

  const next = req.nextUrl.searchParams.get("next") ?? "/admin";
  const res  = NextResponse.redirect(new URL(next, req.url));

  // Cookie de sessão NextAuth (produção exige __Secure- prefix com HTTPS)
  res.cookies.set("__Secure-next-auth.session-token", sessionToken, {
    httpOnly: true,
    secure:   true,
    sameSite: "lax",
    maxAge,
    path: "/",
  });

  return res;
}
