// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { readAIConfig, saveAIConfig } from '@/lib/aiService';

export const dynamic = 'force-dynamic';

function isAdmin(token: any) {
  return token?.role === 'admin';
}

// GET — return current AI config (API key masked)
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!isAdmin(token)) return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });

  const config = readAIConfig();
  // Mask API key — only send a flag indicating if it exists
  const { apiKey, ...safe } = config;
  return NextResponse.json({ ...safe, hasApiKey: !!apiKey });
}

// POST — save AI config
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!isAdmin(token)) return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });

  try {
    const body = await req.json();
    const { provider, model, apiKey, temperature, maxTokens } = body;

    // Validate provider
    const validProviders = ['ollama', 'openai', 'anthropic', 'google', 'deepseek', 'mistral'];
    if (provider && !validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Provider inválido.' }, { status: 400 });
    }

    const update: any = {};
    if (provider) update.provider = provider;
    if (model) update.model = model;
    if (apiKey !== undefined) update.apiKey = apiKey || undefined; // empty string removes key
    if (temperature !== undefined) update.temperature = parseFloat(temperature);
    if (maxTokens !== undefined) update.maxTokens = parseInt(maxTokens);

    saveAIConfig(update);
    return NextResponse.json({ ok: true, config: readAIConfig().provider });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
