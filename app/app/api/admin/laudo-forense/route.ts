// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import { callAI, readAIConfig } from "@/lib/aiService";

export const dynamic = "force-dynamic";

const VAULT_BASE = process.env.VAULT_PATH || path.join(process.cwd(), "..", "COFRE_NCFN");

function isAdmin(token: any) {
    return token?.role === "admin";
}

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isAdmin(token)) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

    // Return all custody-report pericias from VaultAccessLog, newest first
    const logs = await prisma.vaultAccessLog.findMany({
        where: { action: 'pericia' },
        orderBy: { createdAt: 'desc' },
    });

    // Annotate with version: for each filePath, count how many there are total and assign v1..vN
    // (oldest = v1, newest = vN)
    const countByPath: Record<string, number> = {};
    const versionByPath: Record<string, number> = {};
    // Walk from oldest to newest to assign ascending version numbers
    const sorted = [...logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const log of sorted) {
        versionByPath[log.id] = (countByPath[log.filePath] || 0) + 1;
        countByPath[log.filePath] = versionByPath[log.id];
    }
    const totalByPath: Record<string, number> = countByPath;

    const pericias = logs.map(log => {
        const parts = log.filePath.split('/');
        const folder = parts[0];
        const filename = parts.slice(1).join('/');
        const version = versionByPath[log.id];
        const total = totalByPath[log.filePath];
        return {
            id: log.id,
            filePath: log.filePath,
            folder,
            filename,
            version,
            totalVersions: total,
            userEmail: log.userEmail,
            createdAt: log.createdAt,
        };
    });

    return NextResponse.json({ pericias });
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isAdmin(token)) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // ── Criar novo laudo ──────────────────────────────────────────────────────
    if (action === "create") {
        const { titulo, numeroCaso, evidencias, quesitos } = body;
        if (!titulo || !evidencias) {
            return NextResponse.json({ error: "titulo e evidencias são obrigatórios." }, { status: 400 });
        }
        const laudo = await prisma.laudoForense.create({
            data: {
                titulo: titulo.trim(),
                numeroCaso: numeroCaso?.trim() || null,
                operatorEmail: token.email || "sistema",
                evidencias: JSON.stringify(evidencias),
                quesitos: quesitos?.trim() || null,
                status: "rascunho",
            },
        });
        return NextResponse.json({ ok: true, laudo });
    }

    // ── Gerar laudo com IA ────────────────────────────────────────────────────
    if (action === "generate_ai") {
        // Rate limit: 5 gerações por hora por admin
        if (!checkRateLimit(`laudo-ai:${token.email}`, 5, 3_600_000)) {
            return NextResponse.json({ error: "Limite de gerações IA atingido (5/hora). Aguarde." }, { status: 429 });
        }

        const { id } = body;
        const laudo = await prisma.laudoForense.findUnique({ where: { id } });
        if (!laudo) return NextResponse.json({ error: "Laudo não encontrado." }, { status: 404 });

        const evidencias = JSON.parse(laudo.evidencias || "[]");
        const evidenciasText = evidencias
            .map((e: any, i: number) => `  ${i + 1}. ${e.filename} (${e.folder})\n     SHA-256: ${e.hash || "N/D"}\n     Tipo: ${e.type || "N/D"}`)
            .join("\n");

        const prompt = `Você é um Perito em Forense Digital credenciado. Elabore um laudo técnico-jurídico formal e rigoroso em português brasileiro.

CASO: ${laudo.numeroCaso || "Sem número"}
TÍTULO: ${laudo.titulo}

EVIDÊNCIAS DIGITAIS CATALOGADAS:
${evidenciasText || "  (nenhuma evidência selecionada)"}

QUESITOS A RESPONDER:
${laudo.quesitos || "  (nenhum quesito específico — laudo de análise geral)"}

Responda EXCLUSIVAMENTE em formato JSON válido com os campos:
{
  "metodologia": "Descreva os métodos, ferramentas e procedimentos forenses utilizados na análise (mínimo 3 parágrafos técnicos)",
  "achados": "Relate os achados forenses detalhados: metadados, hash de integridade, timeline de eventos, anomalias detectadas, rastreabilidade de origem (mínimo 4 parágrafos)",
  "conclusao": "Conclusão técnica objetiva respondendo os quesitos, com nexo causal entre evidências e fatos investigados (mínimo 2 parágrafos)"
}`;

        // Accept optional per-request AI override from frontend
        const { aiProvider, aiModel } = body;
        const configOverride = aiProvider ? { provider: aiProvider, model: aiModel || undefined } : undefined;
        const aiCfg = readAIConfig();
        const modelLabel = configOverride?.provider ? `${configOverride.provider}/${configOverride.model || ''}` : `${aiCfg.provider}/${aiCfg.model}`;

        try {
            const rawResp = await callAI(prompt, undefined, configOverride);

            // Extrair JSON da resposta (strip markdown code blocks first)
            let parsed: any = {};
            try {
                const cleaned = rawResp.replace(/```json?\n?/gi, '').replace(/```/g, '');
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            } catch {
                parsed = {
                    metodologia: rawResp,
                    achados: "Ver metodologia completa acima.",
                    conclusao: "Análise gerada pela IA — revisar e complementar.",
                };
            }

            const updated = await prisma.laudoForense.update({
                where: { id },
                data: {
                    metodologia: parsed.metodologia || "",
                    achados: parsed.achados || "",
                    conclusao: parsed.conclusao || "",
                },
            });
            return NextResponse.json({ ok: true, laudo: updated });
        } catch (err: any) {
            return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
        }
    }

    // ── Gerar PDF final ───────────────────────────────────────────────────────
    if (action === "generate_pdf") {
        const { id } = body;
        const laudo = await prisma.laudoForense.findUnique({ where: { id } });
        if (!laudo) return NextResponse.json({ error: "Laudo não encontrado." }, { status: 404 });

        const evidencias = JSON.parse(laudo.evidencias || "[]");

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const WHITE = rgb(1, 1, 1);
        const CYAN = rgb(0, 0.95, 1);
        const PURPLE = rgb(0.74, 0.07, 0.99);
        const GRAY = rgb(0.7, 0.7, 0.7);
        const BLACK = rgb(0, 0, 0);
        const DARK = rgb(0.05, 0.05, 0.05);

        let page = pdfDoc.addPage([612, 792]);
        let { width, height } = page.getSize();
        let y = height - 40;

        const addPage = () => {
            page = pdfDoc.addPage([612, 792]);
            y = height - 40;
        };

        const checkY = (needed: number) => {
            if (y < needed) addPage();
        };

        // Header background
        page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: DARK });
        page.drawText("PORTAL NCFN — LAUDO FORENSE DIGITAL", {
            x: 30, y: height - 35, size: 14, font, color: CYAN,
        });
        page.drawText("Nexus Cyber Forensic Network | Confidencial", {
            x: 30, y: height - 55, size: 8, font: fontNormal, color: GRAY,
        });
        page.drawText(new Date().toISOString(), {
            x: 400, y: height - 35, size: 8, font: fontNormal, color: GRAY,
        });
        page.drawLine({ start: { x: 0, y: height - 80 }, end: { x: width, y: height - 80 }, thickness: 2, color: PURPLE });

        y = height - 110;

        // Identificação
        page.drawText("I. IDENTIFICAÇÃO DO DOCUMENTO", { x: 30, y, size: 11, font, color: PURPLE });
        y -= 20;
        const idLines = [
            ["Título:", laudo.titulo],
            ["Número do Caso:", laudo.numeroCaso || "Não atribuído"],
            ["Perito Responsável:", laudo.operatorEmail],
            ["Data de Criação:", new Date(laudo.createdAt).toLocaleString("pt-BR")],
            ["Status:", laudo.status.toUpperCase()],
            ["ID do Laudo:", laudo.id],
        ];
        for (const [label, value] of idLines) {
            checkY(60);
            page.drawText(label, { x: 40, y, size: 9, font, color: GRAY });
            page.drawText(String(value), { x: 160, y, size: 9, font: fontNormal, color: WHITE });
            y -= 15;
        }
        y -= 15;

        // Evidências
        checkY(100);
        page.drawLine({ start: { x: 30, y: y + 5 }, end: { x: width - 30, y: y + 5 }, thickness: 0.5, color: PURPLE });
        y -= 15;
        page.drawText("II. EVIDÊNCIAS DIGITAIS", { x: 30, y, size: 11, font, color: PURPLE });
        y -= 20;

        for (let i = 0; i < evidencias.length; i++) {
            const ev = evidencias[i];
            checkY(80);
            page.drawText(`${i + 1}. ${ev.filename}`, { x: 40, y, size: 9, font, color: CYAN });
            y -= 14;
            page.drawText(`   Pasta: ${ev.folder} | Tipo: ${ev.type || "N/D"}`, { x: 40, y, size: 8, font: fontNormal, color: GRAY });
            y -= 12;
            if (ev.hash) {
                page.drawText(`   SHA-256: ${ev.hash}`, { x: 40, y, size: 7, font: fontNormal, color: GRAY });
                y -= 14;
            }
        }
        y -= 10;

        // Metodologia
        const writeSection = (title: string, content: string) => {
            checkY(80);
            page.drawLine({ start: { x: 30, y: y + 5 }, end: { x: width - 30, y: y + 5 }, thickness: 0.5, color: PURPLE });
            y -= 15;
            page.drawText(title, { x: 30, y, size: 11, font, color: PURPLE });
            y -= 20;
            if (!content) {
                page.drawText("(Não gerado — execute 'Gerar com IA' primeiro)", { x: 40, y, size: 9, font: fontNormal, color: GRAY });
                y -= 20;
                return;
            }
            const words = content.split(" ");
            let line = "";
            for (const word of words) {
                const testLine = line ? `${line} ${word}` : word;
                const testWidth = fontNormal.widthOfTextAtSize(testLine, 9);
                if (testWidth > width - 80) {
                    checkY(30);
                    page.drawText(line, { x: 40, y, size: 9, font: fontNormal, color: WHITE });
                    y -= 14;
                    line = word;
                } else {
                    line = testLine;
                }
                if (word.endsWith("\n") || word.endsWith(".")) {
                    checkY(30);
                    page.drawText(line, { x: 40, y, size: 9, font: fontNormal, color: WHITE });
                    y -= 14;
                    line = "";
                }
            }
            if (line) {
                checkY(30);
                page.drawText(line, { x: 40, y, size: 9, font: fontNormal, color: WHITE });
                y -= 14;
            }
            y -= 10;
        };

        writeSection("III. METODOLOGIA", laudo.metodologia || "");
        writeSection("IV. QUESITOS", laudo.quesitos || "Análise de ofício — sem quesitos específicos.");
        writeSection("V. ACHADOS FORENSES", laudo.achados || "");
        writeSection("VI. CONCLUSÃO", laudo.conclusao || "");

        // Footer on last page
        const allPages = pdfDoc.getPages();
        const lastPage = allPages[allPages.length - 1];
        lastPage.drawLine({ start: { x: 30, y: 60 }, end: { x: width - 30, y: 60 }, thickness: 0.5, color: GRAY });
        lastPage.drawText("Este documento foi gerado digitalmente pelo Portal NCFN.", {
            x: 30, y: 45, size: 7, font: fontNormal, color: GRAY,
        });
        lastPage.drawText(`Protocolo: ${laudo.id} | RFC 3161 TSA | ${new Date().toISOString()}`, {
            x: 30, y: 33, size: 7, font: fontNormal, color: GRAY,
        });

        // Set metadata
        pdfDoc.setTitle(`Laudo Forense — ${laudo.titulo}`);
        pdfDoc.setAuthor(laudo.operatorEmail);
        pdfDoc.setCreator("Portal NCFN — Nexus Cyber Forensic Network");
        pdfDoc.setKeywords([`caso:${laudo.numeroCaso}`, `ncfn_laudo:${laudo.id}`]);

        const pdfBytes = await pdfDoc.save();

        const outDir = path.join(VAULT_BASE, "09_BURN_IMMUTABILITY");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const filename = `laudo_${id.slice(0, 8)}_${Date.now()}.pdf`;
        const outPath = path.join(outDir, filename);
        fs.writeFileSync(outPath, pdfBytes);

        const updated = await prisma.laudoForense.update({
            where: { id },
            data: { pdfFile: `09_BURN_IMMUTABILITY/${filename}`, status: "final" },
        });

        return NextResponse.json({ ok: true, laudo: updated, pdfFile: `09_BURN_IMMUTABILITY/${filename}` });
    }

    // ── Deletar laudo ─────────────────────────────────────────────────────────
    if (action === "delete") {
        const { id } = body;
        await prisma.laudoForense.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
