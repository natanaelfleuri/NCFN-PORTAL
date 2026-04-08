// @ts-nocheck
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// GET — lista credenciais WebAuthn do usuário
export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: token.email as string },
        include: { webAuthnCredentials: true },
    });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    const devices = user.webAuthnCredentials.map(c => ({
        id: c.id,
        deviceName: c.deviceName || "Dispositivo sem nome",
        createdAt: c.createdAt.toISOString(),
        lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
        transports: c.transports ? JSON.parse(c.transports) : [],
    }));

    return NextResponse.json({ devices });
}

// DELETE — revoga uma credencial WebAuthn
export async function DELETE(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const { credentialId } = await req.json();
    if (!credentialId) return NextResponse.json({ error: "ID da credencial obrigatório." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: token.email as string } });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    // Verificar que a credencial pertence ao usuário
    const cred = await prisma.webAuthnCredential.findFirst({
        where: { id: credentialId, userId: user.id },
    });
    if (!cred) return NextResponse.json({ error: "Credencial não encontrada." }, { status: 404 });

    await prisma.webAuthnCredential.delete({ where: { id: credentialId } });

    return NextResponse.json({ ok: true, message: "Dispositivo revogado com sucesso." });
}

// PATCH — renomeia uma credencial
export async function PATCH(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const { credentialId, deviceName } = await req.json();
    if (!credentialId || !deviceName?.trim()) {
        return NextResponse.json({ error: "ID e nome obrigatórios." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: token.email as string } });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    const cred = await prisma.webAuthnCredential.findFirst({
        where: { id: credentialId, userId: user.id },
    });
    if (!cred) return NextResponse.json({ error: "Credencial não encontrada." }, { status: 404 });

    await prisma.webAuthnCredential.update({
        where: { id: credentialId },
        data: { deviceName: deviceName.trim() },
    });

    return NextResponse.json({ ok: true });
}
