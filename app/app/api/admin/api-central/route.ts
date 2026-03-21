// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(token: any): boolean {
  return token?.role === "admin";
}

function maskKey(key: string | null | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••••••" + key.slice(-4);
}

// ─── Default API catalogue ────────────────────────────────────────────────────
const DEFAULT_SERVICES = [
  {
    serviceId: "gemini",
    displayName: "Google Gemini",
    website: "https://aistudio.google.com/app/apikey",
    icon: "google",
    color: "#4285F4",
    instructions:
      "1. Acesse aistudio.google.com\n2. Faça login com sua conta Google\n3. Clique em 'Get API Key' → 'Create API Key'\n4. Copie a chave gerada",
    functionality:
      "Análise forense de documentos e evidências com IA Gemini (modelos gemini-2.0-flash, gemini-1.5-pro). Usada na Central de IA do SANSÃO.",
    envVar: "GEMINI_API_KEY",
  },
  {
    serviceId: "openai",
    displayName: "OpenAI",
    website: "https://platform.openai.com/api-keys",
    icon: "openai",
    color: "#10A37F",
    instructions:
      "1. Acesse platform.openai.com\n2. Vá em 'API Keys' no menu esquerdo\n3. Clique em '+ Create new secret key'\n4. Dê um nome e copie a chave (aparece apenas uma vez)",
    functionality:
      "Análise forense alternativa com GPT-4o/GPT-4o-mini. Usada na geração de laudos e relatórios forenses.",
    envVar: "OPENAI_API_KEY",
  },
  {
    serviceId: "anthropic",
    displayName: "Anthropic Claude",
    website: "https://console.anthropic.com/settings/keys",
    icon: "anthropic",
    color: "#D97706",
    instructions:
      "1. Acesse console.anthropic.com\n2. Vá em 'Settings' → 'API Keys'\n3. Clique em 'Create Key'\n4. Copie a chave (começa com 'sk-ant-')",
    functionality:
      "Análise forense com Claude (Opus, Sonnet, Haiku). Alternativa premium para laudos complexos.",
    envVar: "ANTHROPIC_API_KEY",
  },
  {
    serviceId: "browserless",
    displayName: "Browserless.io",
    website: "https://app.browserless.io/",
    icon: "globe",
    color: "#7C3AED",
    instructions:
      "1. Acesse app.browserless.io e crie uma conta\n2. No dashboard, vá em 'API Tokens'\n3. Crie um token com permissões de 'Chrome'\n4. Copie o token gerado",
    functionality:
      "Captura de páginas web forense em tempo real — screenshots, PDF, HTML, HAR e dados SSL/WHOIS. Usada no Sistema de Coleta de Ativos.",
    envVar: "BROWSERLESS_API_KEY",
  },
];

// ─── Seed defaults if not present ────────────────────────────────────────────
async function seedDefaults() {
  for (const svc of DEFAULT_SERVICES) {
    const exists = await prisma.apiConfig.findUnique({
      where: { serviceId: svc.serviceId },
    });
    if (!exists) {
      await prisma.apiConfig.create({
        data: {
          serviceId: svc.serviceId,
          displayName: svc.displayName,
          apiKey: null,
          enabled: false,
          verified: false,
        },
      });
    }
  }
}

// ─── Verify API key against service ──────────────────────────────────────────
async function verifyApiKey(
  serviceId: string,
  apiKey: string
): Promise<{ ok: boolean; msg: string }> {
  try {
    if (serviceId === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) return { ok: true, msg: "Chave Gemini verificada com sucesso." };
      return { ok: false, msg: `Chave inválida (HTTP ${res.status})` };
    }

    if (serviceId === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return { ok: true, msg: "Chave OpenAI verificada com sucesso." };
      return { ok: false, msg: `Chave inválida (HTTP ${res.status})` };
    }

    if (serviceId === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return { ok: true, msg: "Chave Anthropic verificada com sucesso." };
      return { ok: false, msg: `Chave inválida (HTTP ${res.status})` };
    }

    if (serviceId === "browserless") {
      const res = await fetch(
        `https://chrome.browserless.io/pressure?token=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) return { ok: true, msg: "Token Browserless verificado com sucesso." };
      return { ok: false, msg: `Token inválido (HTTP ${res.status})` };
    }

    return { ok: false, msg: "Serviço desconhecido — verificação não disponível." };
  } catch (err: any) {
    return { ok: false, msg: `Erro de conexão: ${err.message}` };
  }
}

// ─── GET /api/admin/api-central ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!isAdmin(token))
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  await seedDefaults();

  const configs = await prisma.apiConfig.findMany({ orderBy: { createdAt: "asc" } });

  // Check Ollama status
  const ollamaUrl = process.env.OLLAMA_URL || "http://host.docker.internal:11434";
  let ollamaOnline = false;
  let ollamaModels: string[] = [];
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      ollamaOnline = true;
      const data = await res.json();
      ollamaModels = (data.models || []).map((m: any) => m.name);
    }
  } catch {}

  // Return masked keys
  const masked = configs.map((c) => ({
    ...c,
    apiKey: maskKey(c.apiKey),
    hasKey: !!c.apiKey,
  }));

  const servicesMeta = DEFAULT_SERVICES.reduce(
    (acc, s) => ({ ...acc, [s.serviceId]: s }),
    {} as Record<string, (typeof DEFAULT_SERVICES)[0]>
  );

  return NextResponse.json({
    configs: masked,
    servicesMeta,
    ollamaUrl,
    ollamaOnline,
    ollamaModels,
    activeOllamaModel: process.env.OLLAMA_MODEL || "mistral",
  });
}

// ─── POST /api/admin/api-central ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!isAdmin(token))
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  // ── Unlock: verify password and return full keys ─────────────────────────
  if (action === "unlock") {
    const { password } = body;
    const adminPassphrase = process.env.ADMIN_PASSPHRASE || "";
    if (password !== adminPassphrase) {
      return NextResponse.json({ ok: false, error: "Senha incorreta." }, { status: 401 });
    }
    const configs = await prisma.apiConfig.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ ok: true, configs });
  }

  // ── Save API key and verify ───────────────────────────────────────────────
  if (action === "save_key") {
    const { serviceId, apiKey, skipVerify } = body;
    if (!serviceId) return NextResponse.json({ error: "serviceId obrigatório." }, { status: 400 });

    let verified = false;
    let verifyMsg = "";

    if (apiKey && !skipVerify) {
      const result = await verifyApiKey(serviceId, apiKey);
      verified = result.ok;
      verifyMsg = result.msg;
    }

    const config = await prisma.apiConfig.upsert({
      where: { serviceId },
      update: {
        apiKey: apiKey || null,
        verified,
        enabled: verified,
        lastVerifiedAt: verified ? new Date() : undefined,
        updatedAt: new Date(),
      },
      create: {
        serviceId,
        displayName:
          DEFAULT_SERVICES.find((s) => s.serviceId === serviceId)?.displayName || serviceId,
        apiKey: apiKey || null,
        verified,
        enabled: verified,
        lastVerifiedAt: verified ? new Date() : undefined,
      },
    });

    return NextResponse.json({ ok: true, config, verified, verifyMsg });
  }

  // ── Toggle enabled/disabled ──────────────────────────────────────────────
  if (action === "toggle") {
    const { serviceId } = body;
    const existing = await prisma.apiConfig.findUnique({ where: { serviceId } });
    if (!existing) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

    // Can only enable if has a key
    if (!existing.enabled && !existing.apiKey) {
      return NextResponse.json({
        ok: false,
        error: "Adicione uma chave antes de ativar.",
      });
    }

    const updated = await prisma.apiConfig.update({
      where: { serviceId },
      data: { enabled: !existing.enabled, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, enabled: updated.enabled });
  }

  // ── Test Ollama connection ────────────────────────────────────────────────
  if (action === "test_ollama") {
    const ollamaUrl = process.env.OLLAMA_URL || "http://host.docker.internal:11434";
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name);
        return NextResponse.json({ ok: true, ollamaUrl, models });
      }
      return NextResponse.json({
        ok: false,
        error: `Ollama respondeu HTTP ${res.status}`,
      });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: `Ollama offline: ${err.message}` });
    }
  }

  // ── Pull Ollama model ─────────────────────────────────────────────────────
  if (action === "pull_model") {
    const { model } = body;
    if (!model || !/^[\w:./-]+$/.test(model)) {
      return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
    }
    const ollamaUrl = process.env.OLLAMA_URL || "http://host.docker.internal:11434";
    try {
      const res = await fetch(`${ollamaUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model, stream: false }),
        signal: AbortSignal.timeout(600000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return NextResponse.json({ ok: true, msg: `Modelo ${model} instalado com sucesso.` });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
