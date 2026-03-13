// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from '@/lib/prisma';
import { exec } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";
const execAsync = promisify(exec);

function isSuperAdmin(token: any): boolean {
  return token?.role === "admin";
}

// ─── GET /api/admin/ia-config ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!isSuperAdmin(token)) {
    return NextResponse.json({ error: "Acesso restrito ao superadmin." }, { status: 403 });
  }

  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

  // Check Ollama status
  let ollamaOnline = false;
  let models: string[] = [];
  let activeModel = process.env.OLLAMA_MODEL || "mistral";

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      ollamaOnline = true;
      const data = await res.json();
      models = (data.models || []).map((m: any) => m.name);
    }
  } catch { /* offline */ }

  // Keywords
  const keywords = await prisma.osintKeyword.findMany({ orderBy: { category: "asc" } });

  // Last 5 cron scans summary
  const recentScans = await prisma.osintScheduledScan.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, target: true, tool: true, status: true, durationSecs: true, createdAt: true },
  });

  return NextResponse.json({
    ollamaUrl,
    ollamaOnline,
    activeModel,
    models,
    keywords,
    recentScans,
  });
}

// ─── POST /api/admin/ia-config ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!isSuperAdmin(token)) {
    return NextResponse.json({ error: "Acesso restrito ao superadmin." }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  // ── Test AI prompt ──────────────────────────────────────────────────────
  if (action === "test_prompt") {
    const { prompt } = body;
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const model = process.env.OLLAMA_MODEL || "mistral";
    try {
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error("Ollama indisponível");
      const data = await res.json();
      return NextResponse.json({ ok: true, response: data.response, model });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
  }

  // ── Pull Ollama model ───────────────────────────────────────────────────
  if (action === "pull_model") {
    const { model } = body;
    if (!model || !/^[\w:./-]+$/.test(model)) {
      return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
    }
    try {
      const ollamaUrl = process.env.OLLAMA_URL || "http://host.docker.internal:11434";
      const res = await fetch(`${ollamaUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model, stream: false }),
        signal: AbortSignal.timeout(600000),
      });
      if (!res.ok) throw new Error(`Ollama pull retornou HTTP ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ ok: true, message: `Modelo ${model} atualizado.`, data });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
  }

  // ── Add keyword ─────────────────────────────────────────────────────────
  if (action === "add_keyword") {
    const { keyword, category, legalRef } = body;
    if (!keyword || !category) {
      return NextResponse.json({ error: "keyword e category são obrigatórios." }, { status: 400 });
    }
    const kw = await prisma.osintKeyword.create({
      data: { keyword: keyword.trim(), category: category.trim(), legalRef: legalRef?.trim() },
    });
    return NextResponse.json({ ok: true, keyword: kw });
  }

  // ── Toggle keyword active ───────────────────────────────────────────────
  if (action === "toggle_keyword") {
    const { id } = body;
    const kw = await prisma.osintKeyword.findUnique({ where: { id } });
    if (!kw) return NextResponse.json({ error: "Keyword não encontrada." }, { status: 404 });
    const updated = await prisma.osintKeyword.update({ where: { id }, data: { active: !kw.active } });
    return NextResponse.json({ ok: true, keyword: updated });
  }

  // ── Delete keyword ──────────────────────────────────────────────────────
  if (action === "delete_keyword") {
    const { id } = body;
    await prisma.osintKeyword.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  // ── Seed default keywords (CP/CPP) ──────────────────────────────────────
  if (action === "seed_keywords") {
    const defaults = [
      { keyword: "tráfico de drogas", category: "Tráfico", legalRef: "Art. 33 Lei 11.343/06" },
      { keyword: "lavagem de dinheiro", category: "Corrupção", legalRef: "Art. 1º Lei 9.613/98" },
      { keyword: "extorsão mediante sequestro", category: "Crimes Contra Pessoa", legalRef: "Art. 159 CP" },
      { keyword: "pornografia infantil", category: "ECA", legalRef: "Art. 241-A ECA" },
      { keyword: "fraude bancária", category: "Crimes Financeiros", legalRef: "Art. 171 CP" },
      { keyword: "estelionato digital", category: "Crimes Digitais", legalRef: "Art. 171 CP" },
      { keyword: "golpe whatsapp", category: "Crimes Digitais", legalRef: "Art. 154-A CP" },
      { keyword: "venda de armas", category: "Crimes contra a Paz", legalRef: "Art. 17 Lei 10.826/03" },
      { keyword: "falsificação de documentos", category: "Fé Pública", legalRef: "Art. 297 CP" },
      { keyword: "corrupção de menores", category: "ECA", legalRef: "Art. 244-B ECA" },
    ];
    let created = 0;
    for (const d of defaults) {
      try {
        await prisma.osintKeyword.create({ data: d });
        created++;
      } catch { /* unique constraint, skip */ }
    }
    return NextResponse.json({ ok: true, created });
  }



  // ── Analyze image with LLaVA ────────────────────────────────────────────
  if (action === "analyze_image") {
    const { imageBase64, prompt } = body;
    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 é obrigatório." }, { status: 400 });
    }
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const model = process.env.OLLAMA_VISION_MODEL || "llava";
    const analysisPrompt = prompt || "Analise esta imagem forense detalhadamente. Descreva: elementos visuais relevantes, textos visíveis, metadados aparentes, possíveis evidências, anomalias ou manipulações detectadas. Seja técnico e objetivo.";
    try {
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: analysisPrompt,
          images: [imageBase64],
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) throw new Error(`Ollama ${model} indisponível — rode: ollama pull ${model}`);
      const data = await res.json();
      return NextResponse.json({ ok: true, response: data.response, model });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
