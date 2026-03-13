// @ts-nocheck
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { readAIConfig, callAI } from '@/lib/aiService';

// ─── Paths ────────────────────────────────────────────────────────────────────
const ARQUIVOS_BASE  = path.resolve(process.cwd(), '../COFRE_NCFN');
const PROMPTS_DIR    = path.join(ARQUIVOS_BASE, 'COMANDOS - PERITO SANSÃO');

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://host.docker.internal:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

// ─── Extension → prompt-file mapping ─────────────────────────────────────────
const EXT_MAP: Record<string, string> = {
    '.html': '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.htm':  '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.json': '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.csv':  '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.xml':  '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.js':   '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.ts':   '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.sql':  '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.yaml': '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.yml':  '1-ARQUIVOS WEB - PERITO SANSÃO.md',
    '.mp4':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.mkv':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.avi':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.mov':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.mp3':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.wav':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.flac': '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.ogg':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.aac':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.pdf':  '3-TEXTOS - PERITO SANSÃO.md',
    '.docx': '3-TEXTOS - PERITO SANSÃO.md',
    '.doc':  '3-TEXTOS - PERITO SANSÃO.md',
    '.xlsx': '3-TEXTOS - PERITO SANSÃO.md',
    '.xls':  '3-TEXTOS - PERITO SANSÃO.md',
    '.odt':  '3-TEXTOS - PERITO SANSÃO.md',
    '.rtf':  '3-TEXTOS - PERITO SANSÃO.md',
    '.txt':  '3-TEXTOS - PERITO SANSÃO.md',
    '.md':   '3-TEXTOS - PERITO SANSÃO.md',
    '.zip':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.rar':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.7z':   '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.tar':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.gz':   '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.exe':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.bin':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.dll':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.iso':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.jpg':  '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.jpeg': '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.png':  '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.gif':  '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.bmp':  '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.tiff': '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.webp': '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.eml':  '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.msg':  '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.pcap': '5-APROFUNDAMENTO - PERITO SANSÃO.md',
    '.heic': '6 - MODIFICAÇÕES IA - PERITO SANSÃO.md',
    '.heif': '6 - MODIFICAÇÕES IA - PERITO SANSÃO.md',
};

const TEXT_EXTS = new Set([
    '.txt', '.md', '.json', '.csv', '.xml', '.html', '.htm',
    '.js', '.ts', '.sql', '.yaml', '.yml', '.rtf', '.eml',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sha256(buf: Buffer) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function extractFileData(abs: string, ext: string) {
    const stat = fs.statSync(abs);
    const buf  = fs.readFileSync(abs);
    const hash = sha256(buf);
    let preview = '';
    if (TEXT_EXTS.has(ext)) {
        preview = `\n\nCONTEÚDO (primeiros 4000 chars):\n${buf.toString('utf8', 0, 4000)}`;
    } else {
        const hex = buf.slice(0, 256).toString('hex').match(/.{1,32}/g)?.join('\n') ?? '';
        preview = `\n\nCABEÇALHO HEX (256 bytes):\n${hex}`;
    }
    return (
        `ARQUIVO: ${path.basename(abs)}\n` +
        `EXTENSÃO: ${ext}\n` +
        `TAMANHO: ${stat.size} bytes\n` +
        `ÚLTIMA MODIFICAÇÃO: ${stat.mtime.toISOString()}\n` +
        `SHA-256: ${hash}` +
        preview
    );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function adminGuard() {
    const session = await getSession();
    if (!session?.user?.email) return null;
    const dbUser = await getDbUser(session.user.email);
    return dbUser?.role === 'admin' ? dbUser : null;
}

function safePath(folder: string, filename: string): string | null {
    const abs = path.resolve(ARQUIVOS_BASE, folder, filename);
    if (!abs.startsWith(ARQUIVOS_BASE + path.sep)) return null;
    return abs;
}

// ─── POST — stream single-file analysis ──────────────────────────────────────
export async function POST(req: Request) {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    let body: { folder?: string; filename?: string };
    try { body = await req.json(); } catch { return new NextResponse('JSON inválido', { status: 400 }); }

    const { folder, filename } = body;
    if (!folder || !filename) return new NextResponse('folder e filename obrigatórios', { status: 400 });

    const abs = safePath(folder, filename);
    if (!abs || !fs.existsSync(abs)) return new NextResponse('Arquivo não encontrado', { status: 404 });

    const ext = path.extname(filename).toLowerCase();
    const promptFile = EXT_MAP[ext];

    const enc = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (payload: object) => {
                try { controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`)); } catch {}
            };

            try {
                // load prompt
                let systemPrompt = '';
                if (promptFile) {
                    const pPath = path.join(PROMPTS_DIR, promptFile);
                    if (fs.existsSync(pPath)) {
                        systemPrompt = fs.readFileSync(pPath, 'utf8');
                        send({ type: 'protocol', protocol: promptFile.replace(' - PERITO SANSÃO.md', '') });
                    }
                }

                if (!systemPrompt) {
                    // fallback generic prompt
                    systemPrompt = 'Você é um perito forense digital sênior do sistema NCFN. Analise o arquivo abaixo e produza um relatório forense detalhado, identificando metadados, integridade, possíveis anomalias e relevância jurídica.';
                    send({ type: 'protocol', protocol: 'Genérico — extensão não mapeada' });
                }

                // extract metadata / content
                send({ type: 'status', msg: 'Extraindo metadados e conteúdo...' });
                const fileData = extractFileData(abs, ext);

                // call AI (Ollama streaming or external API)
                const aiConfig = readAIConfig();
                send({ type: 'status', msg: `Enviando para ${aiConfig.provider === 'ollama' ? 'PERITO SANSÃO - IA NCFN' : aiConfig.provider.toUpperCase()} · ${aiConfig.model}...` });

                const fullPrompt = `Analise os dados extraídos abaixo do arquivo "${filename}":\n\n${fileData}`;
                let fullText = '';

                if (aiConfig.provider === 'ollama') {
                    // Streaming path for Ollama
                    const ollamaUrl = aiConfig.ollamaUrl || OLLAMA_URL;
                    const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n---\n${fullPrompt}` : fullPrompt;
                    const ollamaRes = await fetch(`${ollamaUrl}/api/generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: aiConfig.model || OLLAMA_MODEL,
                            prompt: combinedPrompt,
                            stream: true,
                            options: { num_predict: 1200, temperature: 0.1 },
                        }),
                        signal: AbortSignal.timeout(120_000),
                    });

                    if (!ollamaRes.ok || !ollamaRes.body) {
                        send({ type: 'error', msg: `Ollama retornou HTTP ${ollamaRes.status}` });
                        controller.close();
                        return;
                    }

                    const reader = ollamaRes.body.getReader();
                    const dec = new TextDecoder();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const lines = dec.decode(value, { stream: true }).split('\n').filter(Boolean);
                        for (const line of lines) {
                            try {
                                const j = JSON.parse(line);
                                if (j.response) {
                                    fullText += j.response;
                                    send({ type: 'chunk', text: j.response });
                                }
                                if (j.done) {
                                    send({ type: 'done', fullText, filename });
                                }
                            } catch {}
                        }
                    }
                } else {
                    // Non-streaming path for external APIs (OpenAI, Anthropic, Google, etc.)
                    try {
                        fullText = await callAI(fullPrompt, systemPrompt || undefined, aiConfig);
                        // Simulate streaming by sending chunks
                        const chunkSize = 80;
                        for (let i = 0; i < fullText.length; i += chunkSize) {
                            send({ type: 'chunk', text: fullText.slice(i, i + chunkSize) });
                        }
                        send({ type: 'done', fullText, filename });
                    } catch (err: any) {
                        send({ type: 'error', msg: `Erro na API ${aiConfig.provider}: ${err?.message}` });
                        controller.close();
                        return;
                    }
                }

                // Salvar laudo em [Laudo IA]
                if (fullText) {
                    try {
                        const laudoDir = path.join(ARQUIVOS_BASE, '[Laudo IA]');
                        fs.mkdirpSync(laudoDir);
                        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
                        const safeFolder = folder.replace(/[^a-zA-Z0-9._-]/g, '_');
                        const laudoName = `laudo_ia_${safeFolder}_${safeName}_${Date.now()}.md`;
                        const protocol = promptFile ? promptFile.replace(' - PERITO SANSÃO.md', '') : 'Genérico';
                        const header = [
                            `# Laudo IA — ${filename}`,
                            `**Pasta:** ${folder}`,
                            `**Protocolo:** ${protocol}`,
                            `**Data:** ${new Date().toLocaleString('pt-BR')}`,
                            '', '---', '',
                        ].join('\n');
                        fs.writeFileSync(path.join(laudoDir, laudoName), header + fullText);
                        send({ type: 'done', fullText, filename, saved: `[Laudo IA]/${laudoName}` });
                    } catch {
                        send({ type: 'done', fullText, filename });
                    }
                }
                // In case ollama didn't send done
                if (!fullText) send({ type: 'done', fullText: '', filename });

            } catch (err: any) {
                send({ type: 'error', msg: `Erro: ${err?.message ?? err}` });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    });
}
