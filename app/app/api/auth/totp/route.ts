// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: token.email as string } });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    if (user.totpEnabled) {
        return NextResponse.json({ enabled: true });
    }

    // Gerar novo secret para configuração
    const secret = authenticator.generateSecret();
    const appName = "PortalNCFN";
    const otpauthUrl = authenticator.keyuri(user.email!, appName, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Salvar secret temporariamente (não habilitar ainda)
    await prisma.user.update({
        where: { id: user.id },
        data: { totpSecret: secret },
    });

    return NextResponse.json({
        enabled: false,
        secret,
        otpauthUrl,
        qrDataUrl,
    });
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const { action, code } = await req.json();

    const user = await prisma.user.findUnique({ where: { email: token.email as string } });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    // ── Verificar e ativar TOTP ───────────────────────────────────────────────
    if (action === "verify") {
        if (!user.totpSecret) {
            return NextResponse.json({ error: "Nenhum secret gerado. Acesse GET primeiro." }, { status: 400 });
        }
        const isValid = authenticator.verify({ token: code, secret: user.totpSecret });
        if (!isValid) {
            return NextResponse.json({ ok: false, error: "Código TOTP inválido." }, { status: 400 });
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { totpEnabled: true },
        });
        return NextResponse.json({ ok: true, message: "TOTP 2FA ativado com sucesso." });
    }

    // ── Desativar TOTP ────────────────────────────────────────────────────────
    if (action === "disable") {
        if (!user.totpEnabled || !user.totpSecret) {
            return NextResponse.json({ error: "TOTP não está ativo." }, { status: 400 });
        }
        const isValid = authenticator.verify({ token: code, secret: user.totpSecret });
        if (!isValid) {
            return NextResponse.json({ ok: false, error: "Código TOTP inválido." }, { status: 400 });
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { totpEnabled: false, totpSecret: null },
        });
        return NextResponse.json({ ok: true, message: "TOTP 2FA desativado." });
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
