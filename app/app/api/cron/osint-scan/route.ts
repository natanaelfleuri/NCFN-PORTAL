// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { exec } from "child_process";
import { createHash } from "crypto";
import { promisify } from "util";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for Vercel/Next edge

const execAsync = promisify(exec);

// ─── Auth by CRON_SECRET ────────────────────────────────────────────────────
function validateCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;
  // Also accept X-Cron-Secret header
  if (req.headers.get("x-cron-secret") === cronSecret) return true;
  return false;
}

// ─── Docker command builder ─────────────────────────────────────────────────
function buildScanCommand(tool: string, target: string): string {
  // ncfn-osint-cli: imagem leve pré-instalada com sherlock, theharvester e nmap.
  // Build: docker build -f scripts/Dockerfile.osint-cli -t ncfn-osint-cli .
  const baseFlags = "--rm --network host --memory=512m --cpus=1.0";
  const t = target.replace(/[^a-zA-Z0-9@._\-+]/g, "").trim().slice(0, 100);
  switch (tool) {
    case "sherlock":
      return `docker run ${baseFlags} ncfn-osint-cli sherlock ${t} --print-found --no-color 2>&1 | head -150`;
    case "theharvester":
      return `docker run ${baseFlags} ncfn-osint-cli theHarvester -d ${t} -b all -l 50 2>&1 | head -150`;
    default:
      return `docker run ${baseFlags} ncfn-osint-cli nmap -sV -Pn --open -T3 ${t} 2>&1 | head -100`;
  }
}

// ─── Ollama AI formatter ────────────────────────────────────────────────────
async function formatWithAI(rawOutput: string, keyword: string, tool: string): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "mistral";

  const prompt = `VOCÊ É UM ANALISTA DE INTELIGÊNCIA DO CIBER-GAECO.
Analise este output de varredura digital "${tool}" buscando evidências críticas para a palavra-chave "${keyword}".

ELABORE UM RELATÓRIO DE MATERIALIDADE DIGITAL SEGUINDO ESTA ESTRUTURA:

# 1. MATERIALIDADE E ACHADOS
Descreva de forma fria e técnica o que foi encontrado (emails, perfis, domínios, chaves).
# 2. NEXO CAUSAL CRIMINAL
Relacione os achados com possíveis condutas previstas no Código Penal Brasileiro ou leis especiais (Ex: Crimes Cibernéticos, Narcotráfico).
# 3. IDENTIFICADORES TÉCNICOS (SHA-256)
Liste URLs, IPs ou usernames com foco em identificação unívoca.
# 4. GRAU DE RISCO / RELEVÂNCIA (ALTA/CRÍTICIA/MÉDIA)
# 5. ESTRATÉGIA DE PRÓXIMAS DILIGÊNCIAS

Seja objetivo e técnico. Não use linguagem informal.

OUTPUT BRUTO:
${rawOutput.slice(0, 3000)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("Ollama indisponível");
    const data = await res.json();
    return data.response || "IA não retornou análise.";
  } catch {
    return `⚠️ Análise IA indisponível (Ollama offline ou timeout).\n\nOutput bruto disponível para análise manual.`;
  }
}

// ─── GET /api/cron/osint-scan ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const triggeredBy = new URL(req.url).searchParams.get("trigger") || "cron";
  const startedAt = new Date();

  // Fetch all active keywords
  const keywords = await prisma.osintKeyword.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  if (keywords.length === 0) {
    return NextResponse.json({ ok: true, message: "Nenhuma keyword ativa para varrer.", scanned: 0 });
  }

  const results: any[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Process keywords sequentially to avoid memory pressure
  for (const kw of keywords) {
    const tool = kw.category?.toLowerCase().includes("rede") ? "sherlock" : "theharvester";
    const command = buildScanCommand(tool, kw.keyword);
    const scanStart = new Date();

    let rawOutput = "";
    let status = "success";
    let errorMessage: string | undefined;
    let durationSecs = 0;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 180000, // 3 min per scan
        maxBuffer: 1024 * 1024 * 2,
        env: process.env,
      });
      rawOutput = stdout || "";
      if (stderr?.trim()) rawOutput += `\n\n[STDERR]\n${stderr.trim()}`;
    } catch (err: any) {
      rawOutput = err.stdout || err.message || "Container falhou sem output.";
      status = err.killed ? "timeout" : "error";
      errorMessage = err.message?.slice(0, 500);
      errorCount++;
    }

    durationSecs = (new Date().getTime() - scanStart.getTime()) / 1000;
    const sha256Hash = createHash("sha256").update(rawOutput).digest("hex");
    const aiReport = await formatWithAI(rawOutput, kw.keyword, tool);

    const scan = await prisma.osintScheduledScan.create({
      data: {
        keywordId: kw.id,
        tool,
        target: kw.keyword,
        command,
        rawOutput,
        aiReport,
        sha256Hash,
        status,
        errorMessage,
        durationSecs,
        triggeredBy,
      },
    });

    if (status === "success") successCount++;
    results.push({ id: scan.id, keyword: kw.keyword, tool, status, sha256Hash, durationSecs });
  }

  const totalSecs = (new Date().getTime() - startedAt.getTime()) / 1000;

  return NextResponse.json({
    ok: true,
    startedAt: startedAt.toISOString(),
    totalDurationSecs: totalSecs,
    scanned: keywords.length,
    successCount,
    errorCount,
    results,
  });
}
