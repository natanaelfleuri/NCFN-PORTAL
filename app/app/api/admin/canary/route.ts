// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { triggerCanaryAlert } from "@/lib/canaryAlert";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const VAULT_BASE = process.env.VAULT_PATH || path.join(process.cwd(), "..", "COFRE_NCFN");

const VAULT_FOLDERS = [
    "0_NCFN-ULTRASECRETOS",
    "1_NCFN-PROVAS-SENSÍVEIS",
    "2_NCFN-ELEMENTOS-DE-PROVA",
    "3_NCFN-DOCUMENTOS-GERENTE",
    "4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS",
    "5_NCFN-GOVERNOS-EMPRESAS",
    "6_NCFN-FORNECIDOS_sem_registro_de_coleta",
    "7_NCFN-CAPTURAS-WEB_OSINT",
    "8_NCFN-VIDEOS",
    "9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS",
    "10_NCFN-ÁUDIO",
    "11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS",
    "12_NCFN-METADADOS-LIMPOS",
    "100_BURN_IMMUTABILITY",
];

const CANARY_NAMES: Record<string, string> = {
    "0_NCFN-ULTRASECRETOS":                          "SENHAS_MASTER_COFRE_2024.txt",
    "1_NCFN-PROVAS-SENSÍVEIS":                       "PROVAS_SECRETAS_CONFIDENCIAL.txt",
    "2_NCFN-ELEMENTOS-DE-PROVA":                     "ELEMENTOS_COMPROMETEDORES_COMPLETO.txt",
    "3_NCFN-DOCUMENTOS-GERENTE":                     "DADOS_PESSOAIS_DIRETORIA.txt",
    "4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS":      "CONTRATOS_SIGILOSOS_VALORES.txt",
    "5_NCFN-GOVERNOS-EMPRESAS":                      "CONTATOS_GOVERNO_VAZADOS.txt",
    "6_NCFN-FORNECIDOS_sem_registro_de_coleta":      "DADOS_VAZADOS_SEM_RASTREIO.txt",
    "7_NCFN-CAPTURAS-WEB_OSINT":                     "OSINT_ALVOS_COMPLETO_2024.txt",
    "8_NCFN-VIDEOS":                                 "VIDEOS_COMPROMETEDORES_BACKUP.txt",
    "9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS":  "LISTA_NEGRA_CRIMINOSOS_2024.txt",
    "10_NCFN-ÁUDIO":                                 "GRAVACOES_SECRETAS_REUNIOES.txt",
    "11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS":       "DADOS_CLIENTES_EXPORTACAO.txt",
    "12_NCFN-METADADOS-LIMPOS":                      "METADADOS_REMOVIDOS_RASTROS.txt",
    "100_BURN_IMMUTABILITY":                         "CHAVES_CRIPTOGRAFIA_MASTER.txt",
};

function buildCanaryContent(folder: string, filename: string): string {
    return `\u26A0 AÇÃO DE CONTRAINTELIGÊNCIA NCFN \u26A0
${"=".repeat(60)}

SEUS LOGS FORAM SALVOS PARA AUDITORIA GLOBAL.
SEU ACESSO A ESTE ARQUIVO ESTÁ SENDO VERIFICADO.

${"─".repeat(60)}
Este arquivo é um CANARY TOKEN — uma armadilha forense digital
implantada pelo sistema NCFN (Nexus Cloud Forensic Network).

Seu acesso foi registrado com:
  • Endereço IP e localização geográfica estimada
  • Timestamp preciso (UTC)
  • Identidade do usuário autenticado
  • Fingerprint de dispositivo e navegador
  • Sessão e cadeia de custódia completa

${"─".repeat(60)}
AVISO LEGAL: O acesso não autorizado a sistemas de informação
constitui crime tipificado nos Arts. 154-A, 154-B e 313-A do
Código Penal Brasileiro e na Lei 12.737/2012 (Carolina Dieckmann).
${"─".repeat(60)}

Arquivo: ${filename}
Pasta: ${folder}
Sistema: NCFN FORENSIC SYSTEM · CANARY INTELLIGENCE · v2.0
Gerado: ${new Date().toISOString()}
`;
}

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
            fs.writeFileSync(filePath, buildCanaryContent(folder, filename), "utf-8");
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

    // ── Implantar em todas as pastas ─────────────────────────────────────────
    if (action === "deploy-all") {
        const { alertEmail } = body;
        if (!alertEmail) return NextResponse.json({ error: "alertEmail obrigatório." }, { status: 400 });

        const results = [];
        for (const folder of VAULT_FOLDERS) {
            const filename = CANARY_NAMES[folder];
            if (!filename) continue;

            const folderPath = path.join(VAULT_BASE, folder);
            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
            const filePath = path.join(folderPath, filename);
            fs.writeFileSync(filePath, buildCanaryContent(folder, filename), "utf-8");

            try {
                await prisma.canaryFile.upsert({
                    where: { folder_filename: { folder, filename } },
                    update: { alertEmail, active: true },
                    create: {
                        filename, folder,
                        description: `Isca automática NCFN — ${folder}`,
                        alertEmail, active: true,
                    },
                });
                results.push({ folder, filename, status: "ok" });
            } catch (e: any) {
                results.push({ folder, filename, status: "error", error: e.message });
            }
        }
        return NextResponse.json({ ok: true, deployed: results.length, results });
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
