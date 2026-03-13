// @ts-nocheck
/**
 * NCFN Unified AI Service
 * Routes forensic AI prompts to Ollama (default) or external APIs.
 * Security: AI can only generate text within forensic analysis context.
 */

import path from 'path';
import fs from 'fs';

const CONFIG_PATH = path.resolve(process.cwd(), '../COFRE_NCFN/_AI_CONFIG.json');

export type AIProvider = 'ollama' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'mistral';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  ollamaUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'ollama',
  model: process.env.OLLAMA_MODEL || 'mistral',
  ollamaUrl: process.env.OLLAMA_URL || 'http://host.docker.internal:11434',
  temperature: 0.1,
  maxTokens: 2000,
};

export function readAIConfig(): AIConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const saved = JSON.parse(raw);
      return { ...DEFAULT_AI_CONFIG, ...saved };
    }
  } catch {}
  return { ...DEFAULT_AI_CONFIG };
}

export function saveAIConfig(updates: Partial<AIConfig>): void {
  const current = readAIConfig();
  const merged = { ...current, ...updates };
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (e) {
    console.error('[aiService] saveAIConfig error:', e);
  }
}

/**
 * Main AI call — routes to the configured provider.
 * configOverride allows per-request override (e.g., user selects model in UI).
 */
export async function callAI(
  prompt: string,
  systemPrompt?: string,
  configOverride?: Partial<AIConfig>
): Promise<string> {
  const config: AIConfig = { ...readAIConfig(), ...configOverride };

  switch (config.provider) {
    case 'openai':
      return callOpenAI(prompt, systemPrompt, config);
    case 'anthropic':
      return callAnthropic(prompt, systemPrompt, config);
    case 'google':
      return callGoogle(prompt, systemPrompt, config);
    case 'deepseek':
      return callDeepSeek(prompt, systemPrompt, config);
    case 'mistral':
      return callMistralAPI(prompt, systemPrompt, config);
    case 'ollama':
    default:
      return callOllama(prompt, systemPrompt, config);
  }
}

// ── Providers ──────────────────────────────────────────────────────────────

async function callOllama(prompt: string, systemPrompt?: string, config?: AIConfig): Promise<string> {
  const ollamaUrl = config?.ollamaUrl || process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const model = config?.model || process.env.OLLAMA_MODEL || 'mistral';
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
      options: { temperature: config?.temperature ?? 0.1, num_predict: config?.maxTokens ?? 2000 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status} — verifique se o Ollama está rodando`);
  const data = await res.json();
  return data.response || '';
}

async function callOpenAI(prompt: string, systemPrompt?: string, config?: AIConfig): Promise<string> {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key não configurada. Configure em IA Config.');
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config?.model || 'gpt-4o',
      messages,
      max_tokens: config?.maxTokens ?? 2000,
      temperature: config?.temperature ?? 0.1,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    throw new Error(`OpenAI HTTP ${res.status}: ${e.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(prompt: string, systemPrompt?: string, config?: AIConfig): Promise<string> {
  const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key não configurada. Configure em IA Config.');
  const body: any = {
    model: config?.model || 'claude-sonnet-4-6',
    max_tokens: config?.maxTokens ?? 2000,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    throw new Error(`Anthropic HTTP ${res.status}: ${e.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callGoogle(prompt: string, systemPrompt?: string, config?: AIConfig): Promise<string> {
  const apiKey = config?.apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('Google AI API key não configurada. Configure em IA Config.');
  const model = config?.model || 'gemini-2.0-flash';
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: config?.maxTokens ?? 2000, temperature: config?.temperature ?? 0.1 },
      }),
      signal: AbortSignal.timeout(120_000),
    }
  );
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    throw new Error(`Google AI HTTP ${res.status}: ${e.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callDeepSeek(prompt: string, systemPrompt?: string, config?: AIConfig): Promise<string> {
  const apiKey = config?.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DeepSeek API key não configurada. Configure em IA Config.');
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config?.model || 'deepseek-chat',
      messages,
      max_tokens: config?.maxTokens ?? 2000,
      temperature: config?.temperature ?? 0.1,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${e.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callMistralAPI(prompt: string, systemPrompt?: string, config?: AIConfig): Promise<string> {
  const apiKey = config?.apiKey || process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('Mistral API key não configurada. Configure em IA Config.');
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config?.model || 'mistral-large-latest',
      messages,
      max_tokens: config?.maxTokens ?? 2000,
      temperature: config?.temperature ?? 0.1,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    throw new Error(`Mistral API HTTP ${res.status}: ${e.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
