// @ts-nocheck
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    // Brute-force protection: 5 tentativas por 5 minutos por usuário
    if (!checkRateLimit(`totp-verify:${token.email}`, 5, 5 * 60_000)) {
        return NextResponse.json(
            { ok: false, error: "Muitas tentativas. Aguarde 5 minutos." },
            { status: 429 }
        );
    }

    const { code } = await req.json();
    if (!code || String(code).length !== 6) {
        return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: token.email as string } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
        return NextResponse.json({ error: "TOTP não está ativo para este usuário." }, { status: 400 });
    }

    const isValid = authenticator.verify({ token: String(code), secret: user.totpSecret });
    if (!isValid) {
        return NextResponse.json({ ok: false, error: "Código incorreto. Tente novamente." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
