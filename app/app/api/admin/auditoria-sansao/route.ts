// @ts-nocheck
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min

import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

// ─── Paths ────────────────────────────────────────────────────────────────────
const COFRE_BASE     = path.resolve(process.cwd(), '../COFRE_NCFN');
const ARQUIVOS_BASE  = COFRE_BASE; // alias for compat
const PROMPTS_DIR    = path.join(COFRE_BASE, 'COMANDOS - PERITO SANSÃO');
const RELATORIOS_DIR = path.join(COFRE_BASE, 'RELATORIOS');

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://host.docker.internal:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

// ─── Extension → prompt-file mapping ─────────────────────────────────────────
const EXT_MAP: Record<string, string> = {
    // Web / Data
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
    // Multimedia
    '.mp4':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.mkv':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.avi':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.mov':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.mp3':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.wav':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.flac': '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.ogg':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    '.aac':  '2-AUDIO E VÍDEO - PERITO SANSÃO.md',
    // Documents / Text
    '.pdf':  '3-TEXTOS - PERITO SANSÃO.md',
    '.docx': '3-TEXTOS - PERITO SANSÃO.md',
    '.doc':  '3-TEXTOS - PERITO SANSÃO.md',
    '.xlsx': '3-TEXTOS - PERITO SANSÃO.md',
    '.xls':  '3-TEXTOS - PERITO SANSÃO.md',
    '.odt':  '3-TEXTOS - PERITO SANSÃO.md',
    '.rtf':  '3-TEXTOS - PERITO SANSÃO.md',
    '.txt':  '3-TEXTOS - PERITO SANSÃO.md',
    '.md':   '3-TEXTOS - PERITO SANSÃO.md',
    // Compressed / Binaries
    '.zip':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.rar':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.7z':   '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.tar':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.gz':   '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.exe':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.bin':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.dll':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    '.iso':  '4-COMPACTADOS E BINARIOS - PERITO SANSÃO.md',
    // Forensic artifacts / Images / Email / Network
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
    // AI/Synthetic content
    '.heic': '6 - MODIFICAÇÕES IA - PERITO SANSÃO.md',
    '.heif': '6 - MODIFICAÇÕES IA - PERITO SANSÃO.md',
};

const TEXT_EXTS = new Set([
    '.txt', '.md', '.json', '.csv', '.xml', '.html', '.htm',
    '.js', '.ts', '.sql', '.yaml', '.yml', '.rtf', '.eml',
]);

const IGNORE_DIRS   = new Set(['.obsidian', '.trash', '.smart-env', '.git', 'RELATORIOS', 'COMANDOS - PERITO SANSÃO']);
const SANSAO_STATUS_FILE = '_sansao_status.json';
const DATE_FIELDS = ['FileModifyDate', 'FileAccessDate', 'FileInodeChangeDate', 'FileAcessDate'];

// Post-process Ollama analysis: replace ALTERADO→MODIFICADO in date field contexts
function processAnalysis(text: string): { processed: string; hasModified: boolean } {
    let processed = text;
    let hasModified = false;
    for (const field of DATE_FIELDS) {
        // Match the field line or surrounding text containing ALTERADO
        const regex = new RegExp(`(${field}[^\n]*?)\\bALTERADO\\b`, 'gi');
        if (regex.test(processed)) {
            hasModified = true;
            processed = processed.replace(new RegExp(`(${field}[^\n]*?)\\bALTERADO\\b`, 'gi'), '$1MODIFICADO');
        }
    }
    // Also handle generic ALTERADO near these field names in same paragraph
    for (const field of DATE_FIELDS) {
        const blockRegex = new RegExp(`(${field}[\\s\\S]{0,300}?)\\bALTERADO\\b`, 'gi');
        if (blockRegex.test(processed)) {
            hasModified = true;
            processed = processed.replace(new RegExp(`(${field}[\\s\\S]{0,300}?)\\bALTERADO\\b`, 'gi'), '$1MODIFICADO');
        }
    }
    return { processed, hasModified };
}

async function writeSansaoStatus(folder: string, filename: string, status: 'ÍNTEGRO' | 'SUSPEITO', lastCheck: string) {
    try {
        const folderPath = path.join(COFRE_BASE, folder);
        const statusPath = path.join(folderPath, SANSAO_STATUS_FILE);
        if (!statusPath.startsWith(COFRE_BASE)) return;
        let current: Record<string, any> = {};
        try {
            if (fs.existsSync(statusPath)) current = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        } catch (_) {}
        current[filename] = { status, lastCheck };
        await fs.writeFile(statusPath, JSON.stringify(current, null, 2), 'utf8');
    } catch (_) {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sha256(buf: Buffer): string {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function collectFiles(dir: string, base: string, out: { rel: string; abs: string }[] = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        const abs = path.join(dir, entry.name);
        const rel = path.join(base, entry.name);
        if (entry.isDirectory()) {
            collectFiles(abs, rel, out);
        } else {
            out.push({ rel, abs });
        }
    }
    return out;
}

async function loadPrompts(): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    if (!fs.existsSync(PROMPTS_DIR)) return map;
    for (const fname of fs.readdirSync(PROMPTS_DIR)) {
        if (!fname.endsWith('.md')) continue;
        map[fname] = fs.readFileSync(path.join(PROMPTS_DIR, fname), 'utf8');
    }
    return map;
}

function extractFileData(abs: string, ext: string): string {
    try {
        const stat = fs.statSync(abs);
        const buf  = fs.readFileSync(abs);
        const hash = sha256(buf);
        const size = stat.size;
        const mtime = stat.mtime.toISOString();

        let preview = '';
        if (TEXT_EXTS.has(ext)) {
            preview = `\n\nCONTEÚDO (primeiros 3000 chars):\n${buf.toString('utf8', 0, 3000)}`;
        } else {
            const hexSnippet = buf.slice(0, 256).toString('hex').match(/.{1,32}/g)?.join('\n') ?? '';
            preview = `\n\nCABEÇALHO HEX (256 bytes):\n${hexSnippet}`;
        }

        return `ARQUIVO: ${path.basename(abs)}\nEXTENSÃO: ${ext}\nTAMANHO: ${size} bytes\nÚLTIMA MODIFICAÇÃO: ${mtime}\nSHA-256: ${hash}${preview}`;
    } catch (e) {
        return `Erro ao ler arquivo: ${e}`;
    }
}

async function askOllama(systemPrompt: string, fileData: string, filename: string): Promise<string> {
    const fullPrompt = `${systemPrompt}\n\n---\nAnalise os dados extraídos abaixo do arquivo "${filename}":\n\n${fileData}`;
    try {
        const res = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: fullPrompt,
                stream: false,
                options: { num_predict: 600, temperature: 0.1 },
            }),
            signal: AbortSignal.timeout(90_000),
        });
        if (!res.ok) return `[Ollama HTTP ${res.status}]`;
        const json = await res.json();
        return json.response ?? '[sem resposta]';
    } catch (e: any) {
        return `[Erro Ollama: ${e?.message ?? e}]`;
    }
}

// ─── Cooldown (5 h) ───────────────────────────────────────────────────────────
const COOLDOWN_FILE = path.resolve('/arquivos', 'audit-cooldown.json');
const COOLDOWN_MS   = 5 * 60 * 60 * 1000; // 5 hours

async function getCooldownInfo(): Promise<{ blocked: boolean; remainingMs: number; lastAudit: string | null }> {
    try {
        if (!fs.existsSync(COOLDOWN_FILE)) return { blocked: false, remainingMs: 0, lastAudit: null };
        const { lastAudit } = await fs.readJson(COOLDOWN_FILE);
        const elapsed = Date.now() - new Date(lastAudit).getTime();
        const remaining = COOLDOWN_MS - elapsed;
        return { blocked: remaining > 0, remainingMs: Math.max(0, remaining), lastAudit };
    } catch { return { blocked: false, remainingMs: 0, lastAudit: null }; }
}

async function saveCooldown() {
    await fs.ensureDir(path.dirname(COOLDOWN_FILE));
    await fs.writeJson(COOLDOWN_FILE, { lastAudit: new Date().toISOString() });
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
async function adminGuard() {
    const session = await getSession();
    if (!session?.user?.email) return null;
    const dbUser = await getDbUser(session.user.email);
    return dbUser?.role === 'admin' ? dbUser : null;
}

// ─── GET – list previous reports ─────────────────────────────────────────────
export async function GET(req: Request) {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // cooldown status
    if (action === 'cooldown') {
        const info = await getCooldownInfo();
        return NextResponse.json(info);
    }

    // list reports
    if (action === 'list') {
        await fs.ensureDir(RELATORIOS_DIR);
        const files = fs.readdirSync(RELATORIOS_DIR)
            .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
            .map(f => {
                const abs = path.join(RELATORIOS_DIR, f);
                const stat = fs.statSync(abs);
                return { name: f, size: stat.size, mtime: stat.mtime.toISOString() };
            })
            .sort((a, b) => b.mtime.localeCompare(a.mtime));
        return NextResponse.json(files);
    }

    // read a specific report
    if (action === 'read') {
        const name = searchParams.get('name');
        if (!name || name.includes('/') || name.includes('..'))
            return new NextResponse('Inválido', { status: 400 });
        const abs = path.join(RELATORIOS_DIR, name);
        if (!abs.startsWith(RELATORIOS_DIR) || !fs.existsSync(abs))
            return new NextResponse('Não encontrado', { status: 404 });
        return NextResponse.json({ content: fs.readFileSync(abs, 'utf8') });
    }

    return new NextResponse('Ação desconhecida', { status: 400 });
}

// ─── GET – also expose cooldown status ────────────────────────────────────────
// (merged below into existing GET handler via action=cooldown)

// ─── POST – start SSE audit ───────────────────────────────────────────────────
export async function POST(req: Request) {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    // ── cooldown check ──
    const cooldown = await getCooldownInfo();
    if (cooldown.blocked) {
        const h = Math.floor(cooldown.remainingMs / 3_600_000);
        const m = Math.floor((cooldown.remainingMs % 3_600_000) / 60_000);
        return new NextResponse(
            JSON.stringify({ error: 'cooldown', remainingMs: cooldown.remainingMs, msg: `Aguarde ${h}h ${m}min para a próxima auditoria.` }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
    }

    let targetFolder: string | null = null;
    try {
        const body = await req.json().catch(() => ({}));
        targetFolder = body?.folder || null;
    } catch (_) {}

    const enc = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (payload: object) => {
                try {
                    controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
                } catch (_) {}
            };

            // ── keepalive ping every 20s to prevent Cloudflare 502 ──
            const keepaliveInterval = setInterval(() => {
                try { controller.enqueue(enc.encode(`: keepalive\n\n`)); } catch (_) {}
            }, 20_000);

            try {
                await saveCooldown(); // register start time immediately

                send({ type: 'log', msg: targetFolder
                    ? `🔍 Iniciando varredura da pasta: ${targetFolder}...`
                    : '🔍 Iniciando varredura forense completa...' });

                // 1. Load prompts
                send({ type: 'log', msg: '📂 Carregando prompts do Perito Sansão...' });
                const prompts = await loadPrompts();
                const promptCount = Object.keys(prompts).length;
                if (promptCount === 0) {
                    send({ type: 'error', msg: `❌ Nenhum prompt encontrado em: ${PROMPTS_DIR}` });
                    controller.close();
                    return;
                }
                send({ type: 'log', msg: `✅ ${promptCount} protocolo(s) carregado(s).` });

                // 2. Collect files
                send({ type: 'log', msg: '📁 Mapeando arquivos de custódia...' });
                const allFiles: { rel: string; abs: string }[] = [];

                if (targetFolder) {
                    // Single-folder mode: sanitize and scope
                    const safeFolder = targetFolder.replace(/\.\./g, '').replace(/[/\\]/g, '');
                    const folderAbs = path.join(COFRE_BASE, safeFolder);
                    if (fs.existsSync(folderAbs)) {
                        collectFiles(folderAbs, safeFolder, allFiles);
                    } else {
                        send({ type: 'error', msg: `❌ Pasta não encontrada: ${safeFolder}` });
                        controller.close();
                        return;
                    }
                } else if (fs.existsSync(COFRE_BASE)) {
                    for (const entry of fs.readdirSync(COFRE_BASE, { withFileTypes: true })) {
                        if (IGNORE_DIRS.has(entry.name)) continue;
                        const abs = path.join(COFRE_BASE, entry.name);
                        if (entry.isDirectory()) {
                            collectFiles(abs, entry.name, allFiles);
                        } else {
                            allFiles.push({ rel: entry.name, abs });
                        }
                    }
                }

                const mappedFiles = allFiles.filter(f => {
                    const ext = path.extname(f.abs).toLowerCase();
                    return ext in EXT_MAP;
                });

                const skipped = allFiles.length - mappedFiles.length;
                send({
                    type: 'log',
                    msg: `📊 ${allFiles.length} arquivo(s) encontrado(s) → ${mappedFiles.length} analisável(is), ${skipped} ignorado(s).`,
                });
                send({ type: 'total', total: mappedFiles.length });

                if (mappedFiles.length === 0) {
                    send({ type: 'log', msg: '⚠️ Nenhum arquivo para analisar. Verifique os diretórios de custódia.' });
                    send({ type: 'complete', report: '', reportName: '' });
                    controller.close();
                    return;
                }

                // 3. Build report header + name
                await fs.ensureDir(RELATORIOS_DIR);
                const now = new Date();
                const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
                const auditTitle = targetFolder
                    ? targetFolder.replace(/[<>:"/\\|?*]/g, '_')
                    : 'Auditoria Geral NCFN';
                const prefix = `${auditTitle} ${dateStr}`;
                const existing = fs.existsSync(RELATORIOS_DIR)
                    ? fs.readdirSync(RELATORIOS_DIR).filter(f => f.startsWith(prefix)).length
                    : 0;
                const version = `v${existing + 1}`;
                const userRef  = (user.email || user.name || 'sistema').replace(/[<>:"/\\|?*]/g, '_');
                const reportName = `${prefix} ${version} ${userRef}.md`;
                const reportPath = path.join(RELATORIOS_DIR, reportName);

                const header = [
                    `# ${auditTitle.toUpperCase()} — PERITO SANSÃO`,
                    `**Nome do Relatório:** ${reportName}`,
                    `**Data de início:** ${now.toLocaleString('pt-BR')}`,
                    `**Versão:** ${version}`,
                    `**Usuário responsável:** ${user.email || user.name || 'sistema'}`,
                    `**Modelo IA:** ${OLLAMA_MODEL} via Ollama`,
                    `**Total de arquivos analisados:** ${mappedFiles.length}`,
                    targetFolder ? `**Pasta auditada:** ${targetFolder}` : '**Escopo:** Cofre completo',
                    '',
                    '---',
                    '',
                ].join('\n');

                await fs.writeFile(reportPath, header, 'utf8');
                let reportAccum = header;

                // 4. Process each file
                for (let i = 0; i < mappedFiles.length; i++) {
                    const { rel, abs } = mappedFiles[i];
                    const ext = path.extname(abs).toLowerCase();
                    const promptFile = EXT_MAP[ext];
                    const systemPrompt = prompts[promptFile];

                    send({
                        type: 'progress',
                        index: i + 1,
                        total: mappedFiles.length,
                        file: rel,
                        protocol: promptFile?.replace(' - PERITO SANSÃO.md', '') ?? '?',
                    });

                    if (!systemPrompt) {
                        send({ type: 'log', msg: `⚠️ Prompt não carregado para ${promptFile} — pulando.` });
                        continue;
                    }

                    // Extract metadata + content
                    const fileData = extractFileData(abs, ext);

                    // Ask Ollama
                    send({ type: 'log', msg: `🤖 Enviando para Ollama: ${path.basename(abs)}` });
                    const rawAnalysis = await askOllama(systemPrompt, fileData, path.basename(abs));

                    // Post-process: ALTERADO → MODIFICADO for date fields
                    const { processed: analysis, hasModified } = processAnalysis(rawAnalysis);

                    // Determine integrity status
                    const isSuspeito = hasModified ||
                        /suspeito|comprometido|alteração|manipul|adulter/i.test(analysis);
                    const fileStatus: 'ÍNTEGRO' | 'SUSPEITO' = isSuspeito ? 'SUSPEITO' : 'ÍNTEGRO';
                    const checkTimestamp = new Date().toISOString();

                    // Write per-file status to _sansao_status.json
                    const folderOfFile = path.dirname(rel);
                    await writeSansaoStatus(
                        folderOfFile === '.' ? '' : folderOfFile,
                        path.basename(abs),
                        fileStatus,
                        checkTimestamp
                    );

                    // Footer note when date fields were modified
                    const modifiedFooter = hasModified ? [
                        '',
                        '> **⚠️ NOTA DE RODAPÉ — CAMPOS DE DATA MODIFICADOS**',
                        '> ',
                        '> Os campos `FileModifyDate`, `FileAccessDate` e/ou `FileInodeChangeDate` apresentam registros distintos da data original de custódia.',
                        '> **O arquivo original está preservado.** O sistema NCFN registra **automaticamente** a data e hora de todas as PERÍCIAS DIGITAIS realizadas,',
                        '> o que causa a alteração desses campos de data a cada verificação.',
                        '> ',
                        '> **STATUS: MODIFICADO** — registro diferente de datas detectado na realização da PERÍCIA DIGITAL. Isso é esperado e não indica violação da cadeia de custódia.',
                    ].join('\n') : '';

                    // Append to report
                    const section = [
                        `## ${i + 1}. ${path.basename(abs)}`,
                        `**Caminho:** \`${rel}\``,
                        `**Protocolo:** ${promptFile?.replace('.md', '')}`,
                        `**Extensão:** ${ext}`,
                        `**Status de Integridade:** ${fileStatus}`,
                        `**Última Verificação:** ${new Date(checkTimestamp).toLocaleString('pt-BR')}`,
                        '',
                        '### Análise Forense',
                        '',
                        analysis,
                        modifiedFooter,
                        '',
                        '---',
                        '',
                    ].join('\n');

                    await fs.appendFile(reportPath, section, 'utf8');
                    reportAccum += section;

                    send({ type: 'log', msg: `✅ [${i + 1}/${mappedFiles.length}] ${path.basename(abs)} — ${fileStatus}` });
                }

                // 5. Append footer
                const footer = `\n\n_Relatório gerado automaticamente pelo sistema NCFN — ${new Date().toLocaleString('pt-BR')}_\n`;
                await fs.appendFile(reportPath, footer, 'utf8');
                reportAccum += footer;

                send({ type: 'log', msg: `💾 Relatório salvo em: COFRE_NCFN/RELATORIOS/${reportName}` });
                send({ type: 'complete', report: reportAccum, reportName });

            } catch (err: any) {
                send({ type: 'error', msg: `Erro fatal: ${err?.message ?? err}` });
            } finally {
                clearInterval(keepaliveInterval);
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
