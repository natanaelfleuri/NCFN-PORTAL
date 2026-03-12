// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { triggerCanaryAlert } from "@/lib/canaryAlert";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const VAULT_BASE = process.env.VAULT_PATH || path.join(process.cwd(), "..", "COFRE_NCFN");

function isAdmin(token: any) {
    return token?.role === "admin";
}

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isAdmin(token)) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

    const canaries = await prisma.canaryFile.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ canaries });
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isAdmin(token)) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // ── Criar canary file ─────────────────────────────────────────────────────
    if (action === "create") {
        const { filename, folder, description, alertEmail } = body;
        if (!filename || !folder || !alertEmail) {
            return NextResponse.json({ error: "filename, folder e alertEmail são obrigatórios." }, { status: 400 });
        }

        // Path traversal protection
        if (filename.includes("..") || folder.includes("..") || filename.includes("/")) {
            return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
        }

        // Criar arquivo físico placeholder no vault
        const folderPath = path.join(VAULT_BASE, folder);
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
        const filePath = path.join(folderPath, filename);

        if (!fs.existsSync(filePath)) {
            const content = `NCFN CANARY FILE
================
Este arquivo é uma isca forense do Portal NCFN.
Qualquer acesso a este arquivo é monitorado e registrado.
ID: ${Date.now()}
Criado: ${new Date().toISOString()}`;
            fs.writeFileSync(filePath, content, "utf-8");
        }

        const canary = await prisma.canaryFile.create({
            data: { filename, folder, description: description?.trim() || null, alertEmail, active: true },
        });

        return NextResponse.json({ ok: true, canary });
    }

    // ── Deletar canary file ───────────────────────────────────────────────────
    if (action === "delete") {
        const { id } = body;
        const canary = await prisma.canaryFile.findUnique({ where: { id } });
        if (!canary) return NextResponse.json({ error: "Canary não encontrado." }, { status: 404 });

        // Remove arquivo físico
        const filePath = path.join(VAULT_BASE, canary.folder, canary.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await prisma.canaryFile.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    }

    // ── Testar alerta ─────────────────────────────────────────────────────────
    if (action === "test") {
        const { id } = body;
        const canary = await prisma.canaryFile.findUnique({ where: { id } });
        if (!canary) return NextResponse.json({ error: "Canary não encontrado." }, { status: 404 });

        await triggerCanaryAlert({
            filename: canary.filename,
            folder: canary.folder,
            alertEmail: canary.alertEmail,
            accessorEmail: token.email || "teste@ncfn.local",
            ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1",
            accessCount: canary.accessCount,
        });

        return NextResponse.json({ ok: true, message: "Alerta de teste enviado para " + canary.alertEmail });
    }

    // ── Toggle ativo/inativo ──────────────────────────────────────────────────
    if (action === "toggle") {
        const { id } = body;
        const canary = await prisma.canaryFile.findUnique({ where: { id } });
        if (!canary) return NextResponse.json({ error: "Canary não encontrado." }, { status: 404 });
        const updated = await prisma.canaryFile.update({ where: { id }, data: { active: !canary.active } });
        return NextResponse.json({ ok: true, canary: updated });
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
