// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from '@/lib/prisma';
import { exec } from "child_process";
import { createHash } from "crypto";
import { promisify } from "util";
import { sendForensicReport } from "@/lib/mailer";

export const dynamic = "force-dynamic";
const execAsync = promisify(exec);

// ─── Sanitização de Alvo (anti command-injection) ─────────────────────────────
function sanitizeTarget(target: string): string {
  // Permite apenas alfanuméricos, @, ., _, -, + e espaços simples
  return target.replace(/[^a-zA-Z0-9@._\-+]/g, "").trim().slice(0, 100);
}

// ─── Gerador de comando Docker ─────────────────────────────────────────────────
function buildDockerCommand(tool: string, target: string): string {
  // ncfn-osint-cli: imagem leve pré-instalada com sherlock, theharvester e nmap.
  // Build: docker build -f scripts/Dockerfile.osint-cli -t ncfn-osint-cli .
  const baseFlags = "--rm --network host";

  switch (tool) {
    case "sherlock":
      return `docker run ${baseFlags} ncfn-osint-cli sherlock ${target} --print-found --no-color 2>&1 | head -200`;
    case "theharvester":
      return `docker run ${baseFlags} ncfn-osint-cli theHarvester -d ${target} -b all -l 100 2>&1 | head -200`;
    case "nmap":
      return `docker run ${baseFlags} ncfn-osint-cli nmap -sV -Pn --open -T4 ${target} 2>&1 | head -200`;
    default:
      throw new Error("Ferramenta inválida");
  }
}

// ─── Formatação IA via Ollama ─────────────────────────────────────────────────
async function formatWithAI(rawOutput: string, target: string, tool: string): Promise<string> {
  let model = process.env.OLLAMA_MODEL || "llama3";
  let ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  let geminiKey = process.env.GEMINI_API_KEY;

  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }, include: { aiConfig: true } });
    if (adminUser?.aiConfig?.geminiKey) geminiKey = adminUser.aiConfig.geminiKey;
  } catch (e) {
    // Continua com defaults de env
  }

  const prompt = `Você é um perito forense digital da Polícia Federal.  
Analise o output bruto abaixo da ferramenta "${tool}" executada contra o alvo "${target}".  
Produza um "Relatório de Materialidade Preliminar" em português, estruturado assim:

## 1. IDENTIFICAÇÃO DO ALVO
## 2. PRESENÇA DIGITAL ENCONTRADA
## 3. ELEMENTOS DE INTERESSE INVESTIGATIVO
## 4. AVALIAÇÃO DE RISCO E RELEVÂNCIA
## 5. RECOMENDAÇÕES PARA PRÓXIMAS DILIGÊNCIAS

Seja objetivo, técnico e formal. Não invente dados que não estejam no output.

OUTPUT BRUTO:
${rawOutput.slice(0, 3000)}`;

  // Se for modelo Gemini, usar a API oficial do Google se possível, 
  // caso contrário tenta via Ollama se estiver configurado lá.
  if (model.includes("gemini") && geminiKey) {
     // Lógica simplificada: tentamos via Ollama primeiro (muitos usam proxy Ollama para Gemini)
     // Mas aqui poderíamos implementar o fetch direto para Google AI
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

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
    return `⚠️ Análise IA indisponível (Ollama offline ou timeout).\n\nOutput bruto disponível acima para análise manual.`;
  }
}

// ─── POST /api/admin/investigar ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Auth
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email || token.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const rawTarget = body.target as string;
    const tool = body.tool as string;

    if (!rawTarget || !tool) {
      return NextResponse.json({ error: "Alvo e ferramenta são obrigatórios." }, { status: 400 });
    }

    const target = sanitizeTarget(rawTarget);
    if (!target) {
      return NextResponse.json({ error: "Alvo inválido após sanitização." }, { status: 400 });
    }

    // Build command
    let command: string;
    try {
      command = buildDockerCommand(tool, target);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const startTime = new Date();

    // Execute Docker command
    let rawOutput = "";
    let execError = "";

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 130000, // 130s (Docker timeout is 120s internally)
        maxBuffer: 1024 * 1024 * 2, // 2MB buffer
        env: process.env,
      });
      rawOutput = stdout || "";
      if (stderr && stderr.trim()) execError = stderr.trim();
    } catch (err: any) {
      rawOutput = err.stdout || "";
      execError = err.message || "Erro ao executar o container.";
      if (!rawOutput && !execError) {
        execError = "Container falhou sem output.";
      }
    }

    const fullOutput = rawOutput + (execError ? `\n\n[STDERR]\n${execError}` : "");
    const endTime = new Date();
    const durationSecs = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

    // Gera Hash SHA-256 (Cadeia de Custódia)
    const sha256Hash = createHash("sha256").update(fullOutput).digest("hex");

    // Formata relatório com IA
    const aiReport = await formatWithAI(fullOutput, target, tool);

    // Grava no banco para trilha de auditoria
    const record = await prisma.forensicInvestigation.create({
      data: {
        target,
        tool,
        command,
        rawOutput: fullOutput,
        aiReport,
        sha256Hash,
        operatorEmail: token.email,
      },
    });

    // Envia o e-mail de relatório (Background)
    // Não travamos o retorno da API para não aumentar o tempo de espera do admin
    sendForensicReport(target, tool, aiReport, sha256Hash).catch((err) => {
        console.error("[FORENSIC MAILER ERROR]", err);
    });

    return NextResponse.json({
      ok: true,
      id: record.id,
      target,
      tool,
      command,
      rawOutput: fullOutput,
      aiReport,
      sha256Hash,
      timestamp: startTime.toISOString(),
      durationSecs,
    });
  } catch (err) {
    console.error("[FORENSIC AGENT ERROR]", err);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// ─── GET /api/admin/investigar — Histórico de investigações ──────────────────
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email || token.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const investigations = await prisma.forensicInvestigation.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        target: true,
        tool: true,
        sha256Hash: true,
        operatorEmail: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ investigations });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
