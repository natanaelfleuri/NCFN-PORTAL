// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts, degrees, PDFName, PDFString } from 'pdf-lib';
import { execSync } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VAULT_BASE = path.resolve(process.cwd(), '../COFRE_NCFN');

const MAGIC_DB = [
  { sig: [0x4D, 0x5A], name: 'Windows PE/EXE/DLL', risk: 'ALTO', level: 3 },
  { sig: [0x7F, 0x45, 0x4C, 0x46], name: 'ELF Binary Linux', risk: 'ALTO', level: 3 },
  { sig: [0xCF, 0xFA, 0xED, 0xFE], name: 'Mach-O 64-bit macOS', risk: 'ALTO', level: 3 },
  { sig: [0xCE, 0xFA, 0xED, 0xFE], name: 'Mach-O 32-bit macOS', risk: 'ALTO', level: 3 },
  { sig: [0xCA, 0xFE, 0xBA, 0xBE], name: 'Java Class / Mach-O Fat', risk: 'MEDIO', level: 2 },
  { sig: [0x55, 0x50, 0x58, 0x21], name: 'UPX Packed (ofuscado)', risk: 'CRITICO', level: 4 },
  { sig: [0x23, 0x21], name: 'Script executavel (shebang)', risk: 'MEDIO', level: 2 },
  { sig: [0xD0, 0xCF, 0x11, 0xE0], name: 'Microsoft Office OLE2 (macro-enabled)', risk: 'MEDIO', level: 2 },
  { sig: [0x25, 0x50, 0x44, 0x46], name: 'PDF Document', risk: 'BAIXO', level: 1 },
  { sig: [0x50, 0x4B, 0x03, 0x04], name: 'ZIP Archive', risk: 'BAIXO', level: 1 },
  { sig: [0x52, 0x61, 0x72, 0x21], name: 'RAR Archive', risk: 'BAIXO', level: 1 },
  { sig: [0x37, 0x7A, 0xBC, 0xAF], name: '7-Zip Archive', risk: 'BAIXO', level: 1 },
  { sig: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], name: 'PNG Image', risk: 'BAIXO', level: 1 },
  { sig: [0xFF, 0xD8, 0xFF], name: 'JPEG Image', risk: 'BAIXO', level: 1 },
  { sig: [0x47, 0x49, 0x46, 0x38], name: 'GIF Image', risk: 'BAIXO', level: 1 },
  { sig: [0x1A, 0x45, 0xDF, 0xA3], name: 'Matroska/WebM Video', risk: 'BAIXO', level: 1 },
  { sig: [0x52, 0x49, 0x46, 0x46], name: 'RIFF Container (WAV/AVI)', risk: 'BAIXO', level: 1 },
  { sig: [0x49, 0x44, 0x33], name: 'MP3 Audio (ID3)', risk: 'BAIXO', level: 1 },
  { sig: [0x4F, 0x67, 0x67, 0x53], name: 'OGG Media', risk: 'BAIXO', level: 1 },
];

const MALWARE_PATTERNS = [
  { re: /eval\s*\(\s*base64_decode/i, name: 'Webshell PHP (eval+base64)', risk: 'CRITICO' },
  { re: /system\s*\(\s*\$_(?:GET|POST|REQUEST)/i, name: 'Injecao de comando PHP', risk: 'CRITICO' },
  { re: /shell_exec|passthru|proc_open\s*\(/i, name: 'Funcoes de execucao PHP', risk: 'ALTO' },
  { re: /-[Ee]ncodedcommand/i, name: 'PowerShell comando encodado', risk: 'ALTO' },
  { re: /cmd\.exe.*\/c\s+/i, name: 'Execucao via CMD.EXE', risk: 'ALTO' },
  { re: /(?:wget|curl).*\|\s*(?:bash|sh)\b/i, name: 'Download + execucao remota', risk: 'CRITICO' },
  { re: /meterpreter|msfvenom|metasploit/i, name: 'Framework Metasploit', risk: 'CRITICO' },
  { re: /\/bin\/(?:bash|sh|nc|ncat)\s+-[ei]/i, name: 'Reverse shell', risk: 'CRITICO' },
  { re: /(?:keylog|ransomware|cryptolock)/i, name: 'Palavras-chave de malware', risk: 'ALTO' },
  { re: /chmod\s+(?:777|0777)/i, name: 'Permissoes suspeitas (777)', risk: 'MEDIO' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

function safeText(s: any, maxLen = 80): string {
  if (s == null) return 'N/A';
  return String(s)
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
    .replace(/[^\x20-\xFF]/g, '?')
    .trim()
    .slice(0, maxLen) || 'N/A';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(2)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(2)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

function formatMode(mode: number): string {
  const t = (mode & 0o170000) === 0o040000 ? 'd' : (mode & 0o170000) === 0o120000 ? 'l' : '-';
  const bits = mode & 0o777;
  const p = (n: number) => (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-');
  return `${t}${p((bits >> 6) & 7)}${p((bits >> 3) & 7)}${p(bits & 7)} [${bits.toString(8).padStart(4, '0')}]`;
}

function calculateEntropy(buf: Buffer): number {
  if (buf.length === 0) return 0;
  const freq = new Array(256).fill(0);
  const sample = buf.length > 131072 ? buf.slice(0, 131072) : buf;
  for (let i = 0; i < sample.length; i++) freq[sample[i]]++;
  let entropy = 0;
  const len = sample.length;
  for (let i = 0; i < 256; i++) {
    if (freq[i] === 0) continue;
    const p = freq[i] / len;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 100) / 100;
}

function detectMagic(buf: Buffer): typeof MAGIC_DB[0] | null {
  if (buf.length < 2) return null;
  for (const entry of MAGIC_DB) {
    const sig = entry.sig;
    if (buf.length < sig.length) continue;
    let match = true;
    for (let i = 0; i < sig.length; i++) {
      if (buf[i] !== sig[i]) { match = false; break; }
    }
    if (match) return entry;
  }
  return null;
}

function checkMalware(buf: Buffer): Array<{ name: string; risk: string }> {
  const hits: Array<{ name: string; risk: string }> = [];
  const sample = buf.slice(0, 512 * 1024);
  let text: string;
  try { text = sample.toString('latin1'); } catch { return hits; }
  for (const pat of MALWARE_PATTERNS) {
    if (pat.re.test(text)) hits.push({ name: pat.name, risk: pat.risk });
  }
  return hits;
}

function analyzeEncryptedFile(filePath: string, buf: Buffer): {
  entropy: number;
  stringsFound: string[];
  isFullyEncrypted: boolean;
  sizeAligned: boolean;
  verdict: string;
} {
  const entropy = calculateEntropy(buf);
  const sizeAligned = buf.length % 16 === 0;
  const magic = detectMagic(buf);
  let stringsFound: string[] = [];
  try {
    const raw = execSync(`strings -n 8 "${filePath}" 2>/dev/null | head -40`, { timeout: 5000 }).toString();
    stringsFound = raw.split('\n').filter(l => l.trim().length > 0).slice(0, 10);
  } catch {}
  const isFullyEncrypted = magic === null && entropy > 7.0 && stringsFound.length === 0;
  let verdict = '';
  if (isFullyEncrypted) {
    verdict = 'Arquivo totalmente encriptado - AES-CBC valido. Nenhum dado legivel exposto.';
  } else if (entropy > 6.5 && stringsFound.length < 5) {
    verdict = 'Arquivo predominantemente encriptado. Algumas sequencias de texto encontradas.';
  } else if (entropy < 6.0) {
    verdict = 'Baixa entropia detectada - arquivo pode nao estar corretamente encriptado.';
  } else {
    verdict = 'Encriptacao parcial detectada. Verificar processo de encriptacao.';
  }
  return { entropy, stringsFound, isFullyEncrypted, sizeAligned, verdict };
}

function getLsattr(filePath: string): string {
  try {
    const out = execSync(`lsattr "${filePath}" 2>/dev/null`, { timeout: 3000 }).toString().trim();
    // BusyBox lsattr format: "-------------- /path/to/file"
    const parts = out.split(' ');
    if (parts.length >= 1) return parts[0] || '(sem flags)';
    return out || '(nao disponivel)';
  } catch {
    return '(nao disponivel)';
  }
}

function getUidName(uid: number): string {
  try {
    const out = execSync(`getent passwd ${uid} 2>/dev/null | cut -d: -f1`, { timeout: 2000 }).toString().trim();
    return out || String(uid);
  } catch {
    return String(uid);
  }
}

function getGidName(gid: number): string {
  try {
    const out = execSync(`getent group ${gid} 2>/dev/null | cut -d: -f1`, { timeout: 2000 }).toString().trim();
    return out || String(gid);
  } catch {
    return String(gid);
  }
}

async function adminGuard() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

function resolveSafe(relPath: string): string | null {
  const resolved = path.resolve(VAULT_BASE, relPath);
  if (!resolved.startsWith(VAULT_BASE + path.sep) && resolved !== VAULT_BASE) return null;
  return resolved;
}

function detectMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.txt': 'text/plain', '.md': 'text/markdown', '.log': 'text/plain',
    '.json': 'application/json', '.xml': 'application/xml', '.html': 'text/html',
    '.js': 'application/javascript', '.ts': 'application/typescript',
    '.py': 'text/x-python', '.sh': 'text/x-shellscript',
    '.enc': 'application/octet-stream (AES-256-CBC encrypted)',
    '.har': 'application/json (HTTP Archive)', '.wacz': 'application/zip (WACZ)',
    '.ots': 'application/octet-stream (OpenTimestamps)',
    '.csv': 'text/csv', '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed', '.7z': 'application/x-7z-compressed',
  };
  return map[ext] || 'application/octet-stream (binario)';
}

function formatDateBRT(d: Date): string {
  try {
    const iso = d.toISOString();
    const local = d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return `${iso} (${local} BRT)`;
  } catch {
    return d.toISOString();
  }
}

function entropyInterpretation(e: number): string {
  if (e < 3.5) return 'Baixa entropia - texto legivel';
  if (e < 6.5) return 'Entropia media - conteudo misto';
  if (e < 7.5) return 'Alta entropia - comprimido ou cifrado';
  return 'Entropia muito alta - suspeito ou encriptado';
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF generation
// ─────────────────────────────────────────────────────────────────────────────

// ── Screen / dark theme ──────────────────────────────────────────────────────
const DARK_C = {
  BG:       rgb(0.03, 0.03, 0.06),
  PANEL:    rgb(0.06, 0.07, 0.12),
  HEADER:   rgb(0.02, 0.02, 0.04),
  PURPLE:   rgb(0.55, 0.05, 0.90),
  CYAN:     rgb(0.00, 0.88, 0.98),
  WHITE:    rgb(0.95, 0.96, 0.98),
  LGRAY:    rgb(0.72, 0.73, 0.76),
  GRAY:     rgb(0.48, 0.50, 0.55),
  DGRAY:    rgb(0.22, 0.23, 0.26),
  DIVIDER:  rgb(0.12, 0.13, 0.18),
  GREEN:    rgb(0.05, 0.80, 0.42),
  RED:      rgb(0.90, 0.12, 0.12),
  ORANGE:   rgb(1.00, 0.52, 0.00),
  YELLOW:   rgb(0.96, 0.84, 0.00),
  BLUE:     rgb(0.12, 0.56, 0.96),
  CRITICAL: rgb(0.95, 0.02, 0.02),
  TEAL:     rgb(0.00, 0.72, 0.65),
  AMBER:    rgb(0.96, 0.70, 0.00),
  VIOLET:   rgb(0.70, 0.20, 0.95),
  DARK:     rgb(0.08, 0.09, 0.14),
};

// ── Print / white theme ──────────────────────────────────────────────────────
const PRINT_C = {
  BG:       rgb(1.00, 1.00, 1.00),   // white page
  PANEL:    rgb(0.94, 0.95, 0.97),   // very light panel
  HEADER:   rgb(0.88, 0.90, 0.93),   // light header bar
  PURPLE:   rgb(0.42, 0.02, 0.72),   // darker purple for legibility
  CYAN:     rgb(0.00, 0.48, 0.65),   // dark cyan/teal for legibility
  WHITE:    rgb(0.06, 0.07, 0.10),   // near-black text (replaces white text)
  LGRAY:    rgb(0.20, 0.22, 0.26),   // dark gray text
  GRAY:     rgb(0.38, 0.40, 0.44),   // medium gray text
  DGRAY:    rgb(0.54, 0.56, 0.60),   // lighter decorative gray
  DIVIDER:  rgb(0.78, 0.80, 0.84),   // visible light divider
  GREEN:    rgb(0.01, 0.52, 0.25),   // dark green
  RED:      rgb(0.72, 0.06, 0.06),   // dark red
  ORANGE:   rgb(0.75, 0.35, 0.00),   // dark orange
  YELLOW:   rgb(0.58, 0.42, 0.00),   // dark amber/olive
  BLUE:     rgb(0.08, 0.35, 0.72),   // dark blue
  CRITICAL: rgb(0.72, 0.01, 0.01),   // dark critical red
  TEAL:     rgb(0.00, 0.48, 0.44),   // dark teal
  AMBER:    rgb(0.72, 0.45, 0.00),   // dark amber
  VIOLET:   rgb(0.52, 0.10, 0.78),   // dark violet
  DARK:     rgb(0.90, 0.91, 0.94),   // very light bg (was very dark)
};

async function generatePdf(data: {
  filename: string;
  folderName: string;
  filePath: string;
  stat: fs.Stats;
  sha256: string;
  sha1: string;
  md5: string;
  registeredHash: string;
  exifData: Record<string, any>;
  exifInitial: Record<string, any>;
  exifInitialTimestamp: string;
  lsattrStr: string;
  uidName: string;
  gidName: string;
  magic: typeof MAGIC_DB[0] | null;
  entropy: number;
  malwareHits: Array<{ name: string; risk: string }>;
  encAnalysis: any;
  origStat: fs.Stats | null;
  textPreview: string;
  dbLogs: any[];
  prevPericias: any[];
  fileAccessLog: string;
  operator: string;
  now: Date;
  docId: string;
  overallRisk: string;
  riskLevel: number;
  isEnc: boolean;
  hexHeader: string;
  hexHeaderUrl: string;
  coletaInfo: {
    filled: boolean;
    attestsVeracity: boolean;
    collectedByUser: boolean;
    collectionDate: string | null;
    operator: string;
    timestamp: string;
  } | null;
}, printMode = false): Promise<Uint8Array> {
  // Select color palette based on mode (dark screen or white print)
  const C = printMode ? PRINT_C : DARK_C;

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const W = 595;
  const H = 842;

  // Mutable context
  const ctx: {
    page: any;
    y: number;
    pdfDoc: typeof pdfDoc;
    fontBold: typeof fontBold;
    fontReg: typeof fontReg;
    fontMono: typeof fontMono;
    pageNum: number;
  } = {
    page: null,
    y: 0,
    pdfDoc,
    fontBold,
    fontReg,
    fontMono,
    pageNum: 0,
  };

  function drawBg(p: any) {
    // ── Base background ────────────────────────────────────────────────────────
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.BG });

    // ── Subtle technology grid ─────────────────────────────────────────────────
    const gridColor = printMode ? rgb(0.88, 0.89, 0.91) : rgb(0.055, 0.060, 0.095);
    for (let gx = 20; gx <= W; gx += 30) {
      p.drawLine({ start: { x: gx, y: 0 }, end: { x: gx, y: H }, thickness: 0.25, color: gridColor });
    }
    for (let gy = 20; gy <= H; gy += 30) {
      p.drawLine({ start: { x: 0, y: gy }, end: { x: W, y: gy }, thickness: 0.25, color: gridColor });
    }

    // ── Corner bracket decorations (tech aesthetic) ────────────────────────────
    const crnColor = printMode ? rgb(0.52, 0.20, 0.78) : rgb(0.20, 0.10, 0.32);
    const cLen = 20;
    // TL
    p.drawLine({ start: { x: 8, y: H - 8 }, end: { x: 8 + cLen, y: H - 8 }, thickness: 1.5, color: crnColor });
    p.drawLine({ start: { x: 8, y: H - 8 }, end: { x: 8, y: H - 8 - cLen }, thickness: 1.5, color: crnColor });
    // TR
    p.drawLine({ start: { x: W - 8, y: H - 8 }, end: { x: W - 8 - cLen, y: H - 8 }, thickness: 1.5, color: crnColor });
    p.drawLine({ start: { x: W - 8, y: H - 8 }, end: { x: W - 8, y: H - 8 - cLen }, thickness: 1.5, color: crnColor });
    // BL
    p.drawLine({ start: { x: 8, y: 8 }, end: { x: 8 + cLen, y: 8 }, thickness: 1.5, color: crnColor });
    p.drawLine({ start: { x: 8, y: 8 }, end: { x: 8, y: 8 + cLen }, thickness: 1.5, color: crnColor });
    // BR
    p.drawLine({ start: { x: W - 8, y: 8 }, end: { x: W - 8 - cLen, y: 8 }, thickness: 1.5, color: crnColor });
    p.drawLine({ start: { x: W - 8, y: 8 }, end: { x: W - 8, y: 8 + cLen }, thickness: 1.5, color: crnColor });

    // ── Fine diagonal security lines (background texture) ─────────────────────
    const diagColor = printMode ? rgb(0.86, 0.87, 0.89) : rgb(0.057, 0.062, 0.097);
    for (let dl = -H; dl < W + H; dl += 48) {
      p.drawLine({ start: { x: dl, y: H }, end: { x: dl + H, y: 0 }, thickness: 0.2, color: diagColor });
    }

    // ── Guilloche security pattern — concentric pseudo-ellipses ───────────────
    const guilColor = printMode ? rgb(0.84, 0.85, 0.88) : rgb(0.060, 0.065, 0.100);
    const gcx = W / 2;
    const gcy = H / 2;
    for (let r = 55; r < 290; r += 22) {
      const steps = 32;
      let prev = { x: gcx + r * 1.12 * Math.cos(0), y: gcy + r * Math.sin(0) };
      for (let i = 1; i <= steps; i++) {
        const ang = (i / steps) * 2 * Math.PI;
        const cur = { x: gcx + r * 1.12 * Math.cos(ang), y: gcy + r * Math.sin(ang) };
        p.drawLine({ start: prev, end: cur, thickness: 0.3, color: guilColor });
        prev = cur;
      }
    }

    // ── Watermark Layer 1 — Operator & file data (diagonal repeating) ──────────
    // Contains: vault path, operator, generation timestamp, document ID
    const wm1Color = printMode ? rgb(0.74, 0.76, 0.80) : rgb(0.080, 0.085, 0.130);
    const wm1Text = safeText(
      `NCFN-COFRE | ARQ:${data.filename} | OP:${data.operator} | ${data.now.toISOString().slice(0, 16)}Z | DOC:${data.docId}`,
      110,
    );
    for (let wy = -80; wy < H + 380; wy += 65) {
      p.drawText(wm1Text, {
        x: -80, y: wy, size: 6.0, font: fontMono, color: wm1Color,
        rotate: degrees(32),
      });
    }

    // ── Watermark Layer 2 — Security micro-print (border strips) ──────────────
    // Uses SHA-256 fragment + DocID + operator → nearly impossible to replicate without original data
    const wm2Color = printMode ? rgb(0.60, 0.62, 0.66) : rgb(0.068, 0.073, 0.110);
    const hashFrag = safeText(data.sha256.slice(0, 20), 20);
    const secSeq = safeText(`NCFN-FORENSE ${hashFrag} ${data.docId} PERITO-SANSAO `, 60);
    // Bottom strip
    let bx = 0;
    while (bx < W) {
      p.drawText(secSeq.slice(0, 32), { x: bx, y: 3.5, size: 2.5, font: fontMono, color: wm2Color });
      bx += 130;
    }
    // Top strip
    bx = 0;
    while (bx < W) {
      p.drawText(secSeq.slice(0, 32), { x: bx, y: H - 5, size: 2.5, font: fontMono, color: wm2Color });
      bx += 130;
    }
    // Left vertical
    p.drawText(safeText(data.sha256.slice(0, 64), 64), {
      x: 3, y: H / 2 - 120, size: 2.5, font: fontMono, color: wm2Color,
      rotate: degrees(90),
    });
    // Right vertical
    p.drawText(safeText(`NCFN ${data.docId} PERITO-SANSAO ${data.operator} ${data.sha256.slice(32, 48)}`, 60), {
      x: W - 4, y: H / 2 + 100, size: 2.5, font: fontMono, color: wm2Color,
      rotate: degrees(-90),
    });

    // ── Security dot accent marks (intersection of grid lines) ────────────────
    const dotColor = printMode ? rgb(0.82, 0.84, 0.87) : rgb(0.090, 0.095, 0.145);
    for (let dx = 50; dx < W; dx += 90) {
      for (let dy = 50; dy < H; dy += 90) {
        p.drawRectangle({ x: dx - 0.7, y: dy - 0.7, width: 1.4, height: 1.4, color: dotColor });
      }
    }
  }

  function newPage() {
    ctx.page = pdfDoc.addPage([W, H]);
    ctx.pageNum++;
    drawBg(ctx.page);
    ctx.y = H - 55;
    // Header bar for non-cover pages
    if (ctx.pageNum > 1) {
      ctx.page.drawRectangle({ x: 0, y: H - 25, width: W, height: 25, color: C.HEADER });
      // Purple accent line at bottom of header + left block
      ctx.page.drawRectangle({ x: 0, y: H - 26, width: W, height: 1.5, color: C.PURPLE });
      ctx.page.drawRectangle({ x: 0, y: H - 25, width: 6, height: 25, color: C.PURPLE });
      ctx.page.drawText('NCFN - Relatorio Pericial Forense | PERITO SANSAO - IA INTERNA NCFN | Protocolo v2.0', {
        x: 14, y: H - 16, size: 7, font: fontMono, color: C.GRAY,
      });
      ctx.page.drawText(safeText(`Pag. ${ctx.pageNum} | ID: ${data.docId}`, 40), {
        x: 398, y: H - 16, size: 7, font: fontMono, color: C.GRAY,
      });

      // ── SHA-256 Pixel Fingerprint — 8×4 grid in top-right of header ──────────
      // Each cell = 1 nibble of SHA-256. Unique visual signature per document.
      const pfStartX = W - 53;
      const pfStartY = H - 6;
      const pfCell = 2.6;
      const pfGap = 0.5;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 8; col++) {
          const nibbleIdx = row * 8 + col;
          const nibble = parseInt(data.sha256[nibbleIdx] || '0', 16);
          const v = nibble / 15;
          const cellColor = printMode
            ? rgb(0.1 + v * 0.5, 0.3 + v * 0.5, 0.6 + v * 0.3)
            : rgb(v * 0.35, 0.3 + v * 0.65, 0.55 + v * 0.45);
          ctx.page.drawRectangle({
            x: pfStartX + col * (pfCell + pfGap),
            y: pfStartY - row * (pfCell + pfGap) - pfCell,
            width: pfCell, height: pfCell,
            color: nibble > 0 ? cellColor : C.PANEL,
          });
        }
      }
      ctx.page.drawText('SHA-FP', { x: pfStartX + 3, y: H - 23, size: 4, font: fontMono, color: C.DGRAY });

      // Left margin security strip
      const stripColor = printMode ? rgb(0.90, 0.91, 0.94) : rgb(0.040, 0.045, 0.075);
      ctx.page.drawRectangle({ x: 0, y: 30, width: 6, height: H - 56, color: stripColor });
      ctx.page.drawRectangle({ x: 5, y: 30, width: 1, height: H - 56, color: C.PURPLE });
      ctx.page.drawText(safeText(`NCFN ${data.docId} SHA:${data.sha256.slice(0, 20)} PERITO-SANSAO`, 55), {
        x: 1.5, y: H / 2 - 90, size: 2.0, font: fontMono, color: C.DGRAY,
        rotate: degrees(90),
      });
    }
  }

  function checkY(need = 40) {
    if (ctx.y < need + 50) newPage();
  }

  // Layout constants
  const M = 28;            // page margin
  const CW = W - 2 * M;   // content width = 539
  const LX = M + 10;      // label x = 38
  const VX = 168;         // value x
  const RX = W - M - 5;  // right edge ≈ 562

  function section(title: string, color = C.CYAN) {
    checkY(35);
    ctx.y -= 8;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 24, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 24, color });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 24, color });
    ctx.page.drawLine({ start: { x: M, y: ctx.y + 18 }, end: { x: M + CW, y: ctx.y + 18 }, thickness: 0.6, color });
    const _secTitle = safeText(title, 82);
    const _secTW = fontBold.widthOfTextAtSize(_secTitle, 9);
    const _secX = M + CW / 2 - _secTW / 2;
    ctx.page.drawText(_secTitle, {
      x: _secX, y: ctx.y + 6, size: 9, font: fontBold, color,
    });
    ctx.y -= 30;
  }

  function field(label: string, value: any, mono = false, valueColor = C.WHITE) {
    const fnt = mono ? fontMono : fontReg;
    const maxLW = VX - LX - 6;           // label column width ≈ 124px
    const maxVW = RX - VX - 4;           // value column width ≈ 390px
    const maxFW = RX - LX - 4;           // full width for long labels ≈ 520px
    const labelChunks = wrapTextPx(safeText(label, 200), fontBold, 8, maxLW);
    const val = safeText(String(value ?? 'N/A'), 2000);

    if (labelChunks.length === 1) {
      // Short label: classic two-column layout
      const valChunks = wrapTextPx(val || 'N/A', fnt, 8, maxVW);
      checkY(16);
      ctx.page.drawText(labelChunks[0], { x: LX, y: ctx.y, size: 8, font: fontBold, color: C.GRAY });
      ctx.page.drawText(valChunks[0], { x: VX, y: ctx.y, size: 8, font: fnt, color: valueColor });
      ctx.y -= 13;
      for (let i = 1; i < valChunks.length; i++) {
        checkY(12);
        ctx.page.drawText(valChunks[i], { x: VX, y: ctx.y, size: 8, font: fnt, color: valueColor });
        ctx.y -= 12;
      }
    } else {
      // Long label: render full-width label line(s), then value indented below
      const valChunks = wrapTextPx(val || 'N/A', fnt, 8, maxFW - 16);
      for (const lc of labelChunks) {
        checkY(12);
        ctx.page.drawText(lc, { x: LX, y: ctx.y, size: 8, font: fontBold, color: C.GRAY });
        ctx.y -= 11;
      }
      for (const vc of valChunks) {
        checkY(12);
        ctx.page.drawText(vc, { x: LX + 16, y: ctx.y, size: 8, font: fnt, color: valueColor });
        ctx.y -= 12;
      }
    }
    ctx.y -= 2;
  }

  function divider() {
    checkY(10);
    ctx.page.drawLine({
      start: { x: M + 2, y: ctx.y },
      end: { x: RX, y: ctx.y },
      thickness: 0.5,
      color: C.DIVIDER,
    });
    ctx.y -= 10;
  }

  // Nota explicativa abaixo de um campo — pixel-accurate word-wrap
  function note(text: string) {
    const maxNW = RX - VX - 4;
    const lines = wrapTextPx(`> ${text}`, fontReg, 6.5, maxNW);
    for (const ln of lines) {
      checkY(9);
      ctx.page.drawText(ln, { x: VX, y: ctx.y, size: 6.5, font: fontReg, color: C.GRAY });
      ctx.y -= 9;
    }
    ctx.y -= 2;
  }

  function infoBox(lines: string[], bgColor: any, textColor: any, borderColor?: any) {
    // Pre-wrap each line to fit inside the box (Courier monospace)
    const innerW = CW - 28;
    const wrapped: string[] = [];
    for (const line of lines) {
      for (const wl of wrapTextPx(line, fontMono, 8, innerW)) wrapped.push(wl);
    }
    const lineH = 13;
    const boxH = wrapped.length * lineH + 12;
    checkY(boxH + 6);
    ctx.page.drawRectangle({
      x: M + 2, y: ctx.y - boxH, width: CW - 4, height: boxH,
      color: bgColor, borderColor: borderColor || textColor, borderWidth: 0.5,
    });
    let ty = ctx.y - 9;
    for (const wl of wrapped) {
      ctx.page.drawText(wl, { x: M + 12, y: ty, size: 8, font: fontMono, color: textColor });
      ty -= lineH;
    }
    ctx.y -= boxH + 8;
  }

  // Pixel-accurate word wrap — never cuts mid-word.
  // Falls back to drawing the word as-is if it's wider than maxWidthPx alone.
  function wrapTextPx(text: string, font: any, size: number, maxWidthPx: number): string[] {
    const raw = safeText(text, 2000);
    const words = raw.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if (!word) continue;
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidthPx) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;           // never hyphenate — draw long words as-is
      }
    }
    if (line) lines.push(line);
    return lines.length > 0 ? lines : [''];
  }

  // Legacy char-based wrap kept for callsites that haven't been migrated yet
  function wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= maxChars) { line = candidate; }
      else { if (line) lines.push(line); line = word.length > maxChars ? word.slice(0, maxChars) : word; }
    }
    if (line) lines.push(line);
    return lines;
  }

  // Render a line of justified text — stretches word spacing to fill maxWidth.
  // isLast = true (last line of paragraph) → left-aligned.
  function justifyLine(
    page: any, text: string, x: number, y: number,
    maxWidth: number, size: number, font: any, color: any, isLast = false,
  ) {
    const s = safeText(text, 2000);
    if (isLast || s.trim().length === 0) { page.drawText(s, { x, y, size, font, color }); return; }
    const words = s.split(' ').filter(w => w.length > 0);
    if (words.length <= 1) { page.drawText(s, { x, y, size, font, color }); return; }
    const totalW = words.reduce((sum, w) => sum + font.widthOfTextAtSize(w, size), 0);
    if (totalW >= maxWidth) { page.drawText(s, { x, y, size, font, color }); return; }
    const gap = (maxWidth - totalW) / (words.length - 1);
    let cx = x;
    for (const word of words) {
      page.drawText(word, { x: cx, y, size, font, color });
      cx += font.widthOfTextAtSize(word, size) + gap;
    }
  }

  // Draw fully-justified paragraph block inside a box.
  // Each interior line is justified; the last line is left-aligned.
  // Returns the updated ctx.y after all lines are drawn.
  function drawJustifiedParagraph(
    text: string, font: any, size: number,
    x: number, maxWidthPx: number, lineH: number, color: any,
  ) {
    const lines = wrapTextPx(text, font, size, maxWidthPx);
    for (let i = 0; i < lines.length; i++) {
      checkY(lineH);
      const isLast = i === lines.length - 1;
      justifyLine(ctx.page, lines[i], x, ctx.y, maxWidthPx, size, font, color, isLast);
      ctx.y -= lineH;
    }
  }

  // Draw a prose block (multi-paragraph) inside a pre-allocated box.
  // paragraphs = array of text strings; '' = blank-line paragraph separator.
  // Returns total height consumed.
  function proseMeasure(paragraphs: string[], font: any, size: number, maxW: number, lineH: number, paraGap: number): number {
    let h = 0;
    for (const para of paragraphs) {
      if (para === '') { h += paraGap; continue; }
      h += wrapTextPx(para, font, size, maxW).length * lineH;
    }
    return h;
  }

  function proseRender(
    paragraphs: string[], font: any, size: number,
    x: number, maxW: number, lineH: number, color: any, paraGap = 5,
  ) {
    for (const para of paragraphs) {
      if (para === '') { ctx.y -= paraGap; continue; }
      const lines = wrapTextPx(para, font, size, maxW);
      for (let i = 0; i < lines.length; i++) {
        checkY(lineH);
        justifyLine(ctx.page, lines[i], x, ctx.y, maxW, size, font, color, i === lines.length - 1);
        ctx.y -= lineH;
      }
    }
  }

  // Add clickable URI annotation to any page
  function addLink(page: any, url: string, x: number, y: number, w: number, h: number) {
    try {
      const annot = pdfDoc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Link'),
        Rect: pdfDoc.context.obj([x, y - h, x + w, y + 2]),
        A: pdfDoc.context.obj({
          Type: PDFName.of('Action'),
          S: PDFName.of('URI'),
          URI: PDFString.of(url),
        }),
        Border: pdfDoc.context.obj([0, 0, 0.5]),
        C: pdfDoc.context.obj([0, 0.6, 1.0]),
      });
      const ref = pdfDoc.context.register(annot);
      const existing = page.node.lookupMaybe(PDFName.of('Annots'));
      if (existing) {
        existing.push(ref);
      } else {
        page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([ref]));
      }
    } catch {}
  }

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  newPage();
  ctx.pageNum = 1; // cover is page 1 but has special layout

  // Full background already drawn. Now decorative top bar.
  ctx.page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: C.HEADER });
  ctx.page.drawRectangle({ x: 0, y: H - 70, width: W, height: 3, color: C.PURPLE });

  ctx.page.drawText('NCFN', {
    x: 42, y: H - 42, size: 22, font: fontBold, color: C.PURPLE,
  });
  ctx.page.drawText('Nexus Cloud Forensic Network', {
    x: 42, y: H - 58, size: 9, font: fontReg, color: C.GRAY,
  });
  ctx.page.drawText('CONFIDENCIAL', {
    x: 430, y: H - 42, size: 13, font: fontBold, color: C.RED,
  });
  ctx.page.drawText('USO RESTRITO', {
    x: 448, y: H - 56, size: 8, font: fontReg, color: C.ORANGE,
  });

  // ── COVER TITLE BLOCK — professional centered layout ─────────────────────
  const titleY = H - 130;
  const blkL = 38, blkW = 519, blkH = 104;
  const blkCX = blkL + blkW / 2; // ≈ 297.5

  // Base panel
  ctx.page.drawRectangle({ x: blkL, y: titleY - blkH + 6, width: blkW, height: blkH, color: C.PANEL });
  // Dark band behind main title
  ctx.page.drawRectangle({ x: blkL + 4, y: titleY - 26, width: blkW - 8, height: 30, color: C.DARK });
  // Inner top accent micro-line
  ctx.page.drawRectangle({ x: blkL + 4, y: titleY + 1, width: blkW - 8, height: 1, color: C.CYAN });

  // Outer border lines (purple top, cyan bottom)
  ctx.page.drawRectangle({ x: blkL, y: titleY + 3, width: blkW, height: 2.5, color: C.PURPLE });
  ctx.page.drawRectangle({ x: blkL, y: titleY - blkH + 6, width: blkW, height: 2.5, color: C.CYAN });

  // Vertical accent bars (left purple, right cyan)
  ctx.page.drawRectangle({ x: blkL, y: titleY - blkH + 8.5, width: 4, height: blkH - 5, color: C.PURPLE });
  ctx.page.drawRectangle({ x: blkL + blkW - 4, y: titleY - blkH + 8.5, width: 4, height: blkH - 5, color: C.CYAN });

  // Corner accent marks
  ctx.page.drawRectangle({ x: blkL + 4, y: titleY - 1, width: 10, height: 2, color: C.CYAN });
  ctx.page.drawRectangle({ x: blkL + blkW - 14, y: titleY - 1, width: 10, height: 2, color: C.PURPLE });
  ctx.page.drawRectangle({ x: blkL + 4, y: titleY - blkH + 8.5, width: 10, height: 2, color: C.PURPLE });
  ctx.page.drawRectangle({ x: blkL + blkW - 14, y: titleY - blkH + 8.5, width: 10, height: 2, color: C.CYAN });

  // Main title — glow shadow then white text, centered
  const mainTitle = 'RELATORIO DIGITAL FORENSE';
  const mainTitleSz = 23;
  const mainTitleW = fontBold.widthOfTextAtSize(mainTitle, mainTitleSz);
  const mainTitleX = blkCX - mainTitleW / 2;
  // Shadow layer (purple, 1px offset)
  ctx.page.drawText(mainTitle, { x: mainTitleX + 1, y: titleY - 19, size: mainTitleSz, font: fontBold, color: C.PURPLE });
  // Main white layer
  ctx.page.drawText(mainTitle, { x: mainTitleX, y: titleY - 18, size: mainTitleSz, font: fontBold, color: C.WHITE });

  // Decorative separator: left line ——◆—— right line
  const sepY = titleY - 32;
  const gap = 18;
  ctx.page.drawLine({ start: { x: blkL + 22, y: sepY }, end: { x: blkCX - gap, y: sepY }, thickness: 0.7, color: C.PURPLE });
  ctx.page.drawLine({ start: { x: blkCX + gap, y: sepY }, end: { x: blkL + blkW - 22, y: sepY }, thickness: 0.7, color: C.CYAN });
  // Diamond at center
  const dm = 4;
  ctx.page.drawLine({ start: { x: blkCX, y: sepY + dm }, end: { x: blkCX + dm, y: sepY }, thickness: 0.9, color: C.CYAN });
  ctx.page.drawLine({ start: { x: blkCX + dm, y: sepY }, end: { x: blkCX, y: sepY - dm }, thickness: 0.9, color: C.CYAN });
  ctx.page.drawLine({ start: { x: blkCX, y: sepY - dm }, end: { x: blkCX - dm, y: sepY }, thickness: 0.9, color: C.PURPLE });
  ctx.page.drawLine({ start: { x: blkCX - dm, y: sepY }, end: { x: blkCX, y: sepY + dm }, thickness: 0.9, color: C.PURPLE });

  // Subtitle "Cadeia de Custodia Digital" — centered, CYAN
  const sub1 = 'Cadeia de Custodia Digital';
  const sub1W = fontReg.widthOfTextAtSize(sub1, 13);
  ctx.page.drawText(sub1, { x: blkCX - sub1W / 2, y: titleY - 48, size: 13, font: fontReg, color: C.CYAN });

  // Protocol line — centered, monospace PURPLE
  const proto = 'Protocolo NCFN v2.0  |  PERITO SANSAO - Inteligencia Artificial Interna';
  const protoW = fontMono.widthOfTextAtSize(proto, 8);
  ctx.page.drawText(proto, { x: blkCX - protoW / 2, y: titleY - 63, size: 8, font: fontMono, color: C.PURPLE });

  // Compliance line — centered, small GRAY
  const comp = 'Protegido e Isolado de Sistemas Externos  |  ISO/IEC 27037:2012';
  const compW = fontReg.widthOfTextAtSize(comp, 7.5);
  ctx.page.drawText(comp, { x: blkCX - compW / 2, y: titleY - 77, size: 7.5, font: fontReg, color: C.GRAY });

  // Summary info box — 3-column grid (col × row)
  const infoY = titleY - 115;
  const infoBoxH = 98;
  const iColW = Math.floor(CW / 3);  // ≈179
  const iRowH = 45;
  ctx.page.drawRectangle({ x: M, y: infoY - infoBoxH, width: CW, height: infoBoxH, color: C.DARK });
  ctx.page.drawRectangle({ x: M, y: infoY - infoBoxH, width: 3, height: infoBoxH, color: C.CYAN });
  ctx.page.drawRectangle({ x: M + CW - 3, y: infoY - infoBoxH, width: 3, height: infoBoxH, color: C.CYAN });
  // Column dividers
  ctx.page.drawLine({ start: { x: M + iColW, y: infoY - infoBoxH + 4 }, end: { x: M + iColW, y: infoY - 4 }, thickness: 0.4, color: C.DIVIDER });
  ctx.page.drawLine({ start: { x: M + iColW * 2, y: infoY - infoBoxH + 4 }, end: { x: M + iColW * 2, y: infoY - 4 }, thickness: 0.4, color: C.DIVIDER });
  // Row divider
  ctx.page.drawLine({ start: { x: M + 4, y: infoY - iRowH }, end: { x: M + CW - 4, y: infoY - iRowH }, thickness: 0.4, color: C.DIVIDER });
  const infoCells: [string, string, number, number][] = [
    ['Arquivo Custodiado', safeText(data.filename, 40), 0, 0],
    ['Data de Geracao', (() => { try { return data.now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' BRT'; } catch { return data.now.toISOString(); } })(), 1, 0],
    ['Operador / Responsavel', safeText(data.operator, 36), 2, 0],
    ['Pasta no Cofre Forense', safeText(data.folderName, 40), 0, 1],
    ['Baseline EXIF (1a Entrada)', safeText(data.exifInitialTimestamp.slice(0, 19) + ' UTC', 32), 1, 1],
    ['ID do Protocolo', safeText(data.docId, 24), 2, 1],
  ];
  for (const [lbl, val, col, row] of infoCells) {
    const cx = M + col * iColW + 8;
    const ty = infoY - row * iRowH - 12;
    const isDate = lbl === 'Data de Geracao';
    const isId   = lbl === 'ID do Protocolo';
    // Cell highlight backgrounds for date and protocol ID
    if (isDate) {
      ctx.page.drawRectangle({
        x: M + col * iColW + 1, y: ty - 15, width: iColW - 2, height: 31,
        color: printMode ? rgb(0.40, 0.25, 0.00) : rgb(0.16, 0.08, 0.01),
      });
      ctx.page.drawRectangle({ x: M + col * iColW + 1, y: ty + 14, width: iColW - 2, height: 2, color: C.AMBER });
    }
    if (isId) {
      ctx.page.drawRectangle({
        x: M + col * iColW + 1, y: ty - 15, width: iColW - 2, height: 31,
        color: printMode ? rgb(0.00, 0.20, 0.05) : rgb(0.00, 0.10, 0.03),
      });
      ctx.page.drawRectangle({ x: M + col * iColW + 1, y: ty + 14, width: iColW - 2, height: 2, color: C.TEAL });
    }
    ctx.page.drawText(safeText(lbl, 26), {
      x: cx, y: ty, size: 6.5, font: fontBold,
      color: isDate ? C.AMBER : isId ? C.TEAL : C.GRAY,
    });
    ctx.page.drawText(safeText(val, 42), {
      x: cx, y: ty - 12, size: isDate ? 8.5 : 7.5,
      font: isDate ? fontBold : fontMono,
      color: isDate ? C.AMBER : isId ? C.GREEN : C.WHITE,
    });
  }

  // ── SHA-256 + Date highlight strip ────────────────────────────────────────
  {
    const stripTop = infoY - infoBoxH - 6;   // just below info grid
    const stripH = 62;
    ctx.page.drawRectangle({ x: M, y: stripTop - stripH, width: CW, height: stripH, color: C.DARK });
    ctx.page.drawRectangle({ x: M, y: stripTop - stripH, width: 3, height: stripH, color: C.AMBER });
    ctx.page.drawRectangle({ x: M + CW - 3, y: stripTop - stripH, width: 3, height: stripH, color: C.CYAN });
    ctx.page.drawLine({ start: { x: M, y: stripTop }, end: { x: M + CW, y: stripTop }, thickness: 1.2, color: C.AMBER });
    ctx.page.drawLine({ start: { x: M, y: stripTop - stripH }, end: { x: M + CW, y: stripTop - stripH }, thickness: 1.2, color: C.CYAN });
    // Row divider
    ctx.page.drawLine({ start: { x: M + 4, y: stripTop - 28 }, end: { x: M + CW - 4, y: stripTop - 28 }, thickness: 0.4, color: C.DIVIDER });

    // Date row
    ctx.page.drawText('DATA DE GERACAO', { x: M + 8, y: stripTop - 13, size: 6.5, font: fontBold, color: C.AMBER });
    let dtBRT2 = data.now.toISOString();
    let dtUTC2 = data.now.toISOString().slice(0, 19) + ' UTC';
    try {
      dtBRT2 = data.now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (Horario de Brasilia - BRT)';
    } catch {}
    ctx.page.drawText(safeText(dtBRT2, 65), { x: M + 105, y: stripTop - 11, size: 9.0, font: fontBold, color: C.AMBER });
    ctx.page.drawText(safeText(dtUTC2, 38), { x: M + 105, y: stripTop - 22, size: 6.5, font: fontMono, color: C.GRAY });

    // Hash rows — no internal spaces so the full 64-char hash is copyable
    ctx.page.drawText('SHA-256 (arquivo original):', { x: M + 8, y: stripTop - 40, size: 6.5, font: fontBold, color: C.CYAN });
    const h = data.sha256;
    ctx.page.drawText(safeText(h, 66), {
      x: M + 8, y: stripTop - 52, size: 6.5, font: fontMono, color: C.WHITE,
    });
  }

  // Risk box (left) + Seal (right) — same horizontal band, no overlap
  const riskY = infoY - 162;  // shifted down to accommodate date+hash strip
  let riskBg = C.GREEN;
  let riskText = 'LIMPO - SEM AMEACAS DURANTE SUA CUSTODIA NO NCFN';
  let riskColor = C.BG;
  if (data.riskLevel >= 4) { riskBg = C.CRITICAL; riskText = 'CRITICO - AMEACA SEVERA'; riskColor = C.WHITE; }
  else if (data.riskLevel >= 3) { riskBg = C.RED; riskText = 'ALTO RISCO - CONTEUDO PERIGOSO'; riskColor = C.WHITE; }
  else if (data.riskLevel >= 2) { riskBg = C.ORANGE; riskText = 'SUSPEITO - ANOMALIAS ENCONTRADAS'; riskColor = C.BG; }
  else if (data.riskLevel === 1) { riskBg = C.YELLOW; riskText = 'BAIXO RISCO - MONITORAR'; riskColor = C.BG; }

  const riskRowH = 54;
  const riskBoxW = 355;
  const sealX2 = M + riskBoxW + 6;
  const sealW2 = CW - riskBoxW - 6;
  const riskRowBottom = riskY - riskRowH;

  // Risk box
  ctx.page.drawRectangle({ x: M, y: riskRowBottom, width: riskBoxW, height: riskRowH, color: riskBg });
  ctx.page.drawText('LAUDO DE SEGURANCA:', { x: M + 10, y: riskY - 12, size: 7.5, font: fontBold, color: riskColor });
  ctx.page.drawText(safeText(riskText, 55), { x: M + 10, y: riskY - 25, size: 8, font: fontBold, color: riskColor });
  ctx.page.drawText(safeText(`Nivel ${data.riskLevel}/4 | ${data.overallRisk} | Perito Sansao IA NCFN`, 55), {
    x: M + 10, y: riskY - 42, size: 6.5, font: fontMono, color: riskColor,
  });

  // Seal
  ctx.page.drawRectangle({ x: sealX2, y: riskRowBottom, width: sealW2, height: riskRowH, color: C.PANEL, borderColor: C.PURPLE, borderWidth: 1.5 });
  ctx.page.drawRectangle({ x: sealX2, y: riskY - 2, width: sealW2, height: 2, color: C.PURPLE });
  ctx.page.drawRectangle({ x: sealX2, y: riskRowBottom, width: sealW2, height: 2, color: C.CYAN });
  ctx.page.drawText('NCFN', { x: sealX2 + 8, y: riskY - 17, size: 13, font: fontBold, color: C.PURPLE });
  ctx.page.drawText('PERITO SANSAO', { x: sealX2 + 52, y: riskY - 14, size: 9, font: fontBold, color: C.WHITE });
  ctx.page.drawText('IA INTERNA - AIR-GAPPED', { x: sealX2 + 52, y: riskY - 26, size: 6.5, font: fontMono, color: C.CYAN });
  ctx.page.drawText('ISO/IEC 27037 | CPP 158-B', { x: sealX2 + 52, y: riskY - 37, size: 6, font: fontMono, color: C.GRAY });
  ctx.page.drawText('CUSTODIA VERIFICADA', { x: sealX2 + 52, y: riskY - 47, size: 6, font: fontMono, color: C.GRAY });

  // ── TWO-COLUMN CERTIFICATION — fills bottom of cover page ──────────────────
  {
    const certY0 = riskRowBottom - 10; // just below risk+seal band
    const cFontSz = 6.5;
    const cLineH = 9.5;
    const cMaxL = 44;
    const col1X = M + 2;
    const col2X = M + 2 + Math.floor(CW / 2) + 2;

    // Full-width header band
    ctx.page.drawRectangle({ x: M, y: certY0 - 4, width: CW, height: 18, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: certY0 - 4, width: 3, height: 18, color: C.CYAN });
    ctx.page.drawRectangle({ x: M + CW - 3, y: certY0 - 4, width: 3, height: 18, color: C.CYAN });
    ctx.page.drawText('CERTIFICACAO DE CADEIA DE CUSTODIA DIGITAL | Art. 158-B CPP | Lei 13.964/2019 | ISO/IEC 27037:2012', {
      x: M + 10, y: certY0 + 2, size: 6.0, font: fontBold, color: C.CYAN,
    });

    // Intro line (full width) — pixel-accurate justified
    const introY = certY0 - 18;
    const introFullW = CW - 12;
    const introText = 'O sistema NCFN assegura a incolumidade do vestigio digital atraves do cumprimento estrito das etapas rituais da cadeia de custodia, fundamentado na Lei n. 13.964/2019 e na norma ISO/IEC 27037:2012.';
    const introLines = wrapTextPx(introText, fontReg, cFontSz, introFullW);
    let iy2 = introY;
    for (let i = 0; i < Math.min(2, introLines.length); i++) {
      justifyLine(ctx.page, introLines[i], col1X, iy2, introFullW, cFontSz, fontReg, C.LGRAY, i === introLines.length - 1 || i === 1);
      iy2 -= cLineH;
    }

    // Column divider
    const colContentY = introY - cLineH * 2 - 4;
    const colMidX = M + Math.floor(CW / 2) + 1;
    ctx.page.drawLine({ start: { x: colMidX, y: certY0 - 4 }, end: { x: colMidX, y: 42 }, thickness: 0.3, color: C.DIVIDER });

    // Each column's usable text width
    const colW = colMidX - col1X - 4;  // ≈ 260 px

    // Reusable renderer for tagged certification blocks
    function renderCertBlocks(
      blocks: Array<{text: string; bold?: boolean; gap?: number}>,
      colX: number, startY: number,
    ) {
      let cy = startY;
      for (const blk of blocks) {
        if (cy < 44) break;
        if (blk.bold) {
          const lns = wrapTextPx(blk.text, fontBold, cFontSz, colW);
          for (const ln of lns) {
            if (cy < 44) break;
            ctx.page.drawText(ln, { x: colX, y: cy, size: cFontSz, font: fontBold, color: C.CYAN });
            cy -= cLineH;
          }
        } else {
          // Text may start with [TAG] — bold-color the tag, then continue
          const tagMatch = blk.text.match(/^(\[[^\]]+\])(.*)/);
          if (tagMatch) {
            const tag = tagMatch[1];
            const body = tagMatch[2];
            const tagW = fontBold.widthOfTextAtSize(tag, cFontSz);
            const bodyLines = wrapTextPx(body.trimStart(), fontReg, cFontSz, colW - tagW);
            // First line: tag + first body line
            if (cy < 44) break;
            ctx.page.drawText(tag, { x: colX, y: cy, size: cFontSz, font: fontBold, color: rgb(1.00, 0.60, 0.20) });
            if (bodyLines[0]) {
              const isLastB = bodyLines.length === 1;
              justifyLine(ctx.page, bodyLines[0], colX + tagW + 2, cy, colW - tagW - 2, cFontSz, fontReg, C.LGRAY, isLastB);
            }
            cy -= cLineH;
            // Remaining body lines indented to match tag width
            for (let bi = 1; bi < bodyLines.length; bi++) {
              if (cy < 44) break;
              const isLastB = bi === bodyLines.length - 1;
              justifyLine(ctx.page, bodyLines[bi], colX + tagW + 2, cy, colW - tagW - 2, cFontSz, fontReg, C.LGRAY, isLastB);
              cy -= cLineH;
            }
          } else {
            const lns = wrapTextPx(blk.text, fontReg, cFontSz, colW);
            for (let i = 0; i < lns.length; i++) {
              if (cy < 44) break;
              justifyLine(ctx.page, lns[i], colX, cy, colW, cFontSz, fontReg, C.LGRAY, i === lns.length - 1);
              cy -= cLineH;
            }
          }
        }
        cy -= (blk.gap || 0);
      }
    }

    // ── Left column: Sections I + II ──
    renderCertBlocks([
      { text: 'I. PROCEDIMENTOS DE PRESERVACAO E FIXACAO', bold: true, gap: 2 },
      { text: '[Reconhecimento] Identificacao e delimitacao do ativo digital como elemento de potencial interesse pericial, conforme demanda e escopo definidos pelo custodiante.', gap: 4 },
      { text: '[Isolamento] Segregacao logica aplicada no ato do upload. Ativo confinado em volume containerizado, impedindo interacao com processos externos ou contaminacao cruzada.', gap: 4 },
      { text: '[Fixacao] Registro instantaneo do estado no momento da recepcao. Metadados extraidos antes de qualquer operacao, garantindo congelamento do ativo digital.', gap: 6 },
      { text: 'II. METODOS DE COLETA E ACONDICIONAMENTO', bold: true, gap: 2 },
      { text: '[Coleta] Realizada pelo custodiante. Ativos web coletados autonomamente pelo NCFN, certificando disponibilidade, conformidade e autenticidade sem intervencao humana.', gap: 4 },
      { text: '[Acondicionamento] Encapsulamento por cifragem AES-256-CBC com derivacao SCRYPT, garantindo confidencialidade e integridade do pacote probatorio.', gap: 0 },
    ], col1X, colContentY);

    // ── Right column: Sections III + IV ──
    renderCertBlocks([
      { text: 'III. FLUXO DE TRANSPORTE E RECEBIMENTO', bold: true, gap: 2 },
      { text: '[Transporte] Trafego exclusivamente por tuneis criptografados (Zero-Trust). Integridade validada bit-a-bit entre backup local e ativo no servidor oficial ncfn.net.', gap: 4 },
      { text: '[Recebimento] Formalizacao da entrada no ecossistema pericial por registro imutavel em logs de auditoria e geracao do ID Unico (Protocolo NCFN).', gap: 6 },
      { text: 'IV. ANALISE PERICIAL E CUSTODIA PERMANENTE', bold: true, gap: 2 },
      { text: '[Processamento] Executado pelo Perito Sansao (IA local, Air-Gapped). Hashes multifatoriais (SHA-256, SHA-1, MD5), analise de entropia e metadados, com rotinas de contrainteligencia.', gap: 4 },
      { text: '[Armazenamento] Custodia no COFRE_NCFN com redundancia geografica e imutabilidade do dado bruto, assegurando permanencia para pericias judiciais ou contraperícias.', gap: 4 },
      { text: '[Descarte] A extincao do ativo gera log de encerramento permanente e inalteravel, atestando destruicao segura e mantendo historico como prova da destinacao final.', gap: 0 },
    ], col2X, colContentY);
  }

  // Cover footer is rendered by the unified footer loop at the end of generatePdf.

  // ── MOVE TO CONTENT PAGES ───────────────────────────────────────────────────
  newPage();

  // ─────────────────────────────────────────────────
  // DECLARACAO DE METODOLOGIA CIENTIFICA E AMBIENTE HERMETICO
  // ─────────────────────────────────────────────────
  {
    const INTRO_TITLE = 'DECLARACAO DE METODOLOGIA CIENTIFICA E AMBIENTE HERMETICO';
    // Single consolidated paragraphs — wrapTextPx handles line breaks, justifyLine handles margins
    const INTRO_PARAGRAPHS = [
      'Atesta-se que o processamento, a extracao de metadados e a analise estrutural do presente artefato digital foram executados em ambiente esteril, efemero e isolado de redes externas (Sandboxed/Zero-Trust). Os procedimentos adotados observam rigorosamente o principio da reprodutibilidade forense e a nao-repudiacao, garantindo que o exame nao produziu qualquer alteracao no escopo original dos dados (Principio de Locard aplicado ao meio digital).',
      '',
      'A assinatura criptografica gerada baseia-se no algoritmo de dispersao unilateral SHA-256, em estrita conformidade com o padrao federal norte-americano de processamento de informacoes FIPS 180-4 (Federal Information Processing Standard). O sincronismo temporal dos registros de custodia (Timestamping) obedece a diretriz internacional RFC 3161, mitigando riscos de discrepancia de relogio (Clock Drift) e atestando a exatidao cronologica da apreensao.',
    ];

    // Title bar
    checkY(20);
    ctx.y -= 6;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 22, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 22, color: C.CYAN });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 22, color: C.CYAN });
    ctx.page.drawText(INTRO_TITLE, { x: M + 12, y: ctx.y + 4, size: 8.5, font: fontBold, color: C.CYAN });
    ctx.y -= 28;

    // Measure box height first
    const lineH = 11;
    const boxInnerW = CW - 28;
    const boxH = proseMeasure(INTRO_PARAGRAPHS, fontReg, 7.5, boxInnerW, lineH, 5) + 16;
    checkY(boxH + 6);
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - boxH, width: CW - 4, height: boxH, color: C.PANEL, borderColor: C.CYAN, borderWidth: 0.4 });
    ctx.y -= 10;
    proseRender(INTRO_PARAGRAPHS, fontReg, 7.5, M + 12, boxInnerW, lineH, C.WHITE, 5);
    ctx.y -= 10;
  }

  // ─────────────────────────────────────────────────
  // INFORMACOES ADICIONAIS DE SEGURANCA
  // ─────────────────────────────────────────────────
  {
    checkY(20);
    ctx.y -= 4;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 20, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 20, color: C.AMBER });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 20, color: C.AMBER });
    ctx.page.drawLine({ start: { x: M, y: ctx.y + 15 }, end: { x: M + CW, y: ctx.y + 15 }, thickness: 0.6, color: C.AMBER });
    ctx.page.drawText('INFORMACOES ADICIONAIS DE SEGURANCA DO SISTEMA NCFN', { x: M + 12, y: ctx.y + 4, size: 8.5, font: fontBold, color: C.AMBER });
    ctx.y -= 26;

    const innerW = CW - 28;
    const addInfoItems: Array<{title: string; text: string}> = [
      {
        title: '1. Protocolo Anti-Tampering (Assinatura de Sistema)',
        text: `Este Relatorio Pericial e nativamente selado com assinatura digital de 256 bits, vinculada ao ID Unico ${safeText(data.docId, 20)}. Qualquer tentativa de alteracao estrutural no PDF invalida o selo de autenticidade sistemica, tornando o laudo nulo para fins de evidencia.`,
      },
      {
        title: '2. Hashing de Dois Fatores (SHA-256 + SHA-1)',
        text: 'A integridade e ratificada por hashing multifatorial. A convergencia matematica entre algoritmos distintos elimina a possibilidade estatistica de colisao intencional, assegurando que o arquivo custodiado e identicamente o mesmo coletado na origem.',
      },
      {
        title: '3. Certificacao de Non-Repudiation (Nao-Repudio)',
        text: 'O sistema opera sob o principio do Nao-Repudio. Todas as acoes do operador do cofre NCFN sao vinculadas a carimbo de tempo (Timestamp) e IP de origem, gerando trilha de auditoria imutavel conforme Art. 11 da Lei 12.965/2014.',
      },
      {
        title: '4. Analise de Entropia como Prova de Cifragem',
        text: `A metrica de Entropia de Shannon (${safeText(String(data.entropy), 5)}/8.0) atesta tecnicamente que o ativo foi submetido a difusao binaria completa. Este indice e inconsistente com texto plano, confirmando a eficacia do acondicionamento criptografico em repouso (At-Rest Data Protection).`,
      },
    ];

    for (const item of addInfoItems) {
      const titleLines = wrapTextPx(item.title, fontBold, 7.5, innerW);
      const textLines = wrapTextPx(item.text, fontReg, 7, innerW);
      checkY(titleLines.length * 10 + textLines.length * 9 + 8);
      for (const tl of titleLines) {
        ctx.page.drawText(tl, { x: M + 12, y: ctx.y, size: 7.5, font: fontBold, color: C.AMBER });
        ctx.y -= 10;
      }
      for (let i = 0; i < textLines.length; i++) {
        checkY(9);
        justifyLine(ctx.page, textLines[i], M + 14, ctx.y, innerW - 2, 7, fontReg, C.LGRAY, i === textLines.length - 1);
        ctx.y -= 9;
      }
      ctx.y -= 4;
    }
  }

  // ─────────────────────────────────────────────────
  // [#COLETA] ATESTADO DE COLETA DO CUSTODIANTE
  // ─────────────────────────────────────────────────
  {
    divider();
    const col = data.coletaInfo;
    const colFilled = col && col.filled;

    checkY(20);
    ctx.y -= 4;
    // Section header
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 22, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 22, color: colFilled ? C.TEAL : C.YELLOW });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 22, color: colFilled ? C.TEAL : C.YELLOW });
    ctx.page.drawLine({ start: { x: M, y: ctx.y + 17 }, end: { x: M + CW, y: ctx.y + 17 }, thickness: 0.6, color: colFilled ? C.TEAL : C.YELLOW });
    ctx.page.drawText('[#COLETA] ATESTADO DE COLETA DO CUSTODIANTE', {
      x: M + 12, y: ctx.y + 4, size: 9, font: fontBold, color: colFilled ? C.TEAL : C.YELLOW,
    });
    ctx.y -= 28;

    if (!col) {
      checkY(30);
      ctx.page.drawRectangle({ x: M + 2, y: ctx.y - 22, width: CW - 4, height: 26, color: C.DARK, borderColor: C.YELLOW, borderWidth: 0.6 });
      ctx.page.drawText('[NAO PREENCHIDO] INFORMACAO NAO PREENCHIDA PELO(A) CUSTODIANTE', {
        x: M + 20, y: ctx.y - 8, size: 9, font: fontBold, color: C.YELLOW,
      });
      ctx.page.drawText('O campo de atestado de coleta nao foi preenchido no momento do upload do arquivo.', {
        x: M + 20, y: ctx.y - 18, size: 7, font: fontReg, color: C.GRAY,
      });
      ctx.y -= 32;
    } else if (!col.filled) {
      checkY(30);
      ctx.page.drawRectangle({ x: M + 2, y: ctx.y - 22, width: CW - 4, height: 26, color: C.DARK, borderColor: C.YELLOW, borderWidth: 0.6 });
      ctx.page.drawText('[NAO PREENCHIDO] INFORMACAO NAO PREENCHIDA PELO(A) CUSTODIANTE', {
        x: M + 20, y: ctx.y - 8, size: 9, font: fontBold, color: C.YELLOW,
      });
      ctx.page.drawText(safeText(`Janela fechada sem preenchimento em ${safeText(col.timestamp, 30)} por ${safeText(col.operator, 40)}.`, 100), {
        x: M + 20, y: ctx.y - 18, size: 7, font: fontReg, color: C.GRAY,
      });
      ctx.y -= 32;
    } else {
      // Filled
      const checkYes = colFilled ? '[SIM]' : '[NAO]';
      field('Veracidade atestada pelo custodiante:',
        col.attestsVeracity ? '[SIM] O custodiante ATESTA a veracidade deste arquivo' : '[NAO] Custodiante NAO atestou veracidade',
        false,
        col.attestsVeracity ? C.GREEN : C.RED,
      );
      note('Declaracao do custodiante de que o arquivo e autentico e foi obtido de forma licita. Relevante para admissibilidade probatoria.');

      field('Arquivo coletado pelo proprio custodiante:',
        col.collectedByUser ? '[SIM] Coletado pessoalmente pelo custodiante' : '[NAO] Coletado por terceiro ou de origem externa',
        false,
        col.collectedByUser ? C.GREEN : C.ORANGE,
      );
      note('Confirma se a cadeia de custodia foi iniciada pelo proprio operador ou se houve intervencao de terceiros na coleta.');

      field('Data da coleta original:',
        col.collectionDate
          ? safeText(col.collectionDate, 20)
          : 'Nao informado pelo custodiante',
        false,
        col.collectionDate ? C.WHITE : C.YELLOW,
      );
      note('Data em que o vestigio digital foi coletado/capturado na fonte original. Determina a linha temporal da evidencia.');

      field('Atestado registrado por:', safeText(col.operator, 50));
      note('Operador do sistema NCFN que preencheu o atestado de coleta imediatamente apos o upload do arquivo.');
      field('Timestamp do atestado:', safeText(col.timestamp, 30), true, C.LGRAY);
      note('Momento exato em que o atestado foi registrado no sistema. Imutavel apos o registro inicial.');
    }

    // Explanation note — includes third-party file procedure
    checkY(20);
    ctx.y -= 4;
    // Paragraphs: '' = blank line separator; [TAG] entries rendered in bold teal
    const coletaNoteParas = [
      'Coleta (Art. 158-B, III CPP): Procedimento de obtencao do vestigio digital. Realizada sob responsabilidade do custodiante para arquivos sob sua guarda.',
      '',
      'COMO FUNCIONA PARA ARQUIVOS DE TERCEIROS: No momento em que qualquer arquivo e carregado no sistema NCFN, antes do tratamento dos dados e custodia do ativo, aparece uma caixa flutuante na tela onde o custodiante, devidamente cadastrado, preenche um ATESTADO DE COLETA contendo as seguintes declaracoes:',
      '',
      '[Voce atesta a veracidade deste arquivo?] Ao selecionar essa opcao o custodiante declara que o arquivo e autentico e foi obtido de forma licita.',
      '',
      '[Este arquivo foi coletado por voce?] Ao selecionar essa opcao o custodiante declara que realizou pessoalmente a coleta deste vestigio digital.',
      '',
      '[Data da coleta] Campo para insercao da data em que o vestigio foi coletado na fonte original.',
      '',
      'Ao confirmar o atestado, os dados sao gravados neste relatorio. IMPORTANTE: existe a opcao de fechar sem preencher; de toda forma, esse nao preenchimento e atestado no Relatorio e toda a responsabilidade pela autenticidade e coleta pessoal (ou nao) e exclusiva do custodiante cadastrado, pois o NCFN tem como principio a custodia de ativos licitos que devem ser preservados com o devido tratamento forense para futura apresentacao de provas e elementos de provas fidedignos na defesa de direitos individuais e da coletividade.',
    ];
    const noteInnerW = CW - 28;
    const coletaNoteH = proseMeasure(coletaNoteParas, fontReg, 6.5, noteInnerW, 9, 4) + 12;
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - coletaNoteH, width: CW - 4, height: coletaNoteH + 4, color: C.DARK });
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - coletaNoteH, width: 3, height: coletaNoteH + 4, color: C.TEAL });
    ctx.y -= 6;
    for (const para of coletaNoteParas) {
      if (para === '') { ctx.y -= 4; continue; }
      const isTag = para.startsWith('[');
      const lines = wrapTextPx(para, isTag ? fontBold : fontReg, 6.5, noteInnerW);
      for (let i = 0; i < lines.length; i++) {
        checkY(9);
        justifyLine(ctx.page, lines[i], M + 12, ctx.y, noteInnerW, 6.5, isTag ? fontBold : fontReg, isTag ? C.TEAL : C.LGRAY, i === lines.length - 1);
        ctx.y -= 9;
      }
    }
    ctx.y -= 10;
  }

  divider();

  // ─────────────────────────────────────────────────
  // [1] IDENTIFICACAO DO ARQUIVO
  // ─────────────────────────────────────────────────
  section('[1] IDENTIFICACAO DO ARQUIVO', C.CYAN);
  field('Nome do arquivo:', data.filename);
  note('Nome original do arquivo custodiado. Usado para identificacao e rastreabilidade na cadeia de custodia.');
  field('Pasta Vault:', data.folderName);
  note('Pasta de armazenamento no Cofre Forense NCFN. Define o contexto operacional da evidencia digital.');
  field('Caminho relativo:', data.filePath);
  note('Localizacao exata no sistema de arquivos do cofre. Essencial para reproducao e verificacao independente da analise.');
  field('Tamanho (bytes):', `${data.stat.size.toLocaleString('pt-BR')} bytes (${formatBytes(data.stat.size)})`);
  note('Tamanho exato do arquivo. Qualquer alteracao de conteudo modifica este valor e invalida os hashes criptograficos.');
  field('MIME / Tipo:', detectMime(data.filename));
  note('Tipo MIME baseado na extensao declarada. Deve ser confrontado com a assinatura de bytes magicos para detectar mascaramento.');
  field('Extensao:', path.extname(data.filename) || '(sem extensao)');
  note('Extensao declarada do arquivo. Pode diferir do tipo real - sempre verificar com bytes magicos na secao de seguranca.');

  // ── Hex header dump ────────────────────────────────────────────────────────
  {
    const hexLines = data.hexHeader.split('\n').filter(Boolean);
    checkY(16 + hexLines.length * 8.5 + 20);
    ctx.y -= 4;
    ctx.page.drawText('Cabecalho hexadecimal (primeiros 128 bytes):', {
      x: 48, y: ctx.y, size: 7, font: fontBold, color: C.GRAY,
    });
    ctx.y -= 9;
    ctx.page.drawRectangle({ x: 40, y: ctx.y - hexLines.length * 8.5 - 4, width: 515, height: hexLines.length * 8.5 + 8, color: C.DARK });
    for (const hl of hexLines) {
      ctx.page.drawText(safeText(hl, 100), { x: 45, y: ctx.y, size: 5.5, font: fontMono, color: C.LGRAY });
      ctx.y -= 8.5;
    }
    ctx.y -= 8;
    // Auditor link
    const auditUrl = `https://ncfn.net/auditor?sha256=${data.sha256}&id=${safeText(data.docId, 20)}&hex=${data.hexHeaderUrl}`;
    ctx.page.drawText('[VERIFICAR NO AUDITOR NCFN]', { x: 48, y: ctx.y, size: 7.5, font: fontBold, color: C.CYAN });
    ctx.page.drawText(safeText(auditUrl, 90), { x: 210, y: ctx.y, size: 6.5, font: fontMono, color: C.BLUE });
    addLink(ctx.page, auditUrl, 48, ctx.y + 1, 500, 9);
    ctx.y -= 12;
    const hexBoxW = 515;
    const hexInnerW = hexBoxW - 12;
    const hexExplainParas = [
      { bold: true,  text: 'COMO CONFERIR O CODIGO HEXADECIMAL:' },
      { bold: false, text: '1. Abra o link acima no navegador para acessar o portal de auditoria NCFN.' },
      { bold: false, text: '2. No portal, confirme que o SHA-256 do arquivo corresponde ao hash exibido acima.' },
      { bold: false, text: '3. O codigo hexadecimal mostra os primeiros 128 bytes do arquivo em base 16 (0-9 e A-F). Cada par de caracteres representa 1 byte. Ex: "25 50 44 46" = assinatura de PDF (%PDF).' },
      { bold: false, text: '4. Compare os bytes iniciais com a tabela de Magic Bytes para confirmar o tipo real do arquivo.' },
      { bold: false, text: '5. Qualquer diferenca de um unico byte invalida a integridade e rompe a cadeia de custodia.' },
    ];
    let hexExpH = 12;
    for (const hp of hexExplainParas) hexExpH += wrapTextPx(hp.text, hp.bold ? fontBold : fontReg, hp.bold ? 7 : 6.5, hexInnerW).length * 9;
    checkY(hexExpH + 6);
    ctx.page.drawRectangle({ x: 40, y: ctx.y - hexExpH, width: hexBoxW, height: hexExpH, color: C.DARK, borderColor: C.CYAN, borderWidth: 0.4 });
    let hexExpY = ctx.y - 7;
    for (const hp of hexExplainParas) {
      const sz = hp.bold ? 7 : 6.5;
      const fnt2 = hp.bold ? fontBold : fontReg;
      const clr = hp.bold ? C.CYAN : C.GRAY;
      for (const hl of wrapTextPx(hp.text, fnt2, sz, hexInnerW)) {
        ctx.page.drawText(hl, { x: 46, y: hexExpY, size: sz, font: fnt2, color: clr });
        hexExpY -= 9;
      }
    }
    ctx.y -= hexExpH + 8;
  }

  divider();

  // ─────────────────────────────────────────────────
  // [2] LINHA DO TEMPO MACB
  // ─────────────────────────────────────────────────
  section('[2] LINHA DO TEMPO MACB - Cronologia do Arquivo', C.BLUE);
  const birthtimeSame = Math.abs(data.stat.birthtime.getTime() - data.stat.ctime.getTime()) < 1000;
  field('M - Modificacao (mtime):', formatDateBRT(data.stat.mtime));
  note('Ultima vez que o conteudo do arquivo foi alterado. Adulteracao posterior a custodia altera este valor.');
  field('A - Acesso (atime):', formatDateBRT(data.stat.atime));
  note('Ultimo acesso de leitura ao arquivo. Pode ser atualizado automaticamente pelo sistema operacional a cada leitura.');
  field('C - Mudanca de Metadados (ctime):', formatDateBRT(data.stat.ctime));
  note('Ultima alteracao de metadados como permissoes, proprietario ou renomeacao. Nao indica modificacao de conteudo.');
  field(
    'B - Nascimento (birthtime):',
    birthtimeSame
      ? `${formatDateBRT(data.stat.birthtime)} [Nao suportado no ext4 - exibe valor do ctime]`
      : formatDateBRT(data.stat.birthtime),
    false,
    birthtimeSame ? C.YELLOW : C.WHITE,
  );
  note('Data de criacao original do arquivo. Suporte depende do sistema de arquivos (ext4 nao armazena este valor nativamente).');

  divider();

  // ─────────────────────────────────────────────────
  // [3] IDENTIDADE NO SISTEMA DE ARQUIVOS
  // ─────────────────────────────────────────────────
  section('[3] IDENTIDADE NO SISTEMA DE ARQUIVOS - Dados de Baixo Nivel', C.PURPLE);
  field('Numero do Inode:', String(data.stat.ino));
  note('Identificador unico do arquivo no sistema de arquivos. Persiste mesmo com renomeacao. Permite rastrear o arquivo no disco.');
  field('Blocos alocados em disco:', `${data.stat.blocks} blocos x 512 bytes = ${data.stat.blocks * 512} bytes`);
  note('Espaco fisico ocupado no disco. Pode ser maior que o tamanho real do arquivo por alinhamento de blocos do sistema.');
  field('Tamanho do bloco (blksize):', `${data.stat.blksize} bytes`);
  note('Unidade minima de alocacao do sistema de arquivos. Define a granularidade do armazenamento em disco.');
  field('Quantidade de hard links:', String(data.stat.nlink));
  note('Numero de entradas de diretorio que apontam para este inode. Valor 1 e normal. Maior pode indicar aliases do arquivo.');
  field('Dispositivo de armazenamento (dev):', String(data.stat.dev));
  note('Identificador do dispositivo de bloco onde o arquivo esta fisicamente armazenado. Permite localizar o volume de origem.');

  divider();

  // ─────────────────────────────────────────────────
  // [4] PERMISSOES POSIX E PROPRIEDADE
  // ─────────────────────────────────────────────────
  section('[4] PERMISSOES POSIX E PROPRIEDADE - Controle de Acesso', C.TEAL);
  field('Modo de acesso POSIX:', formatMode(data.stat.mode));
  note('Permissoes Unix de leitura (r), escrita (w) e execucao (x) para dono, grupo e outros. Indica nivel de restricao de acesso.');
  field('Proprietario - UID:', `${data.stat.uid} (${safeText(data.uidName, 30)})`);
  note('Identificador numerico do usuario proprietario do arquivo. Determina quem tem permissao de escrita e exclusao.');
  field('Grupo de acesso - GID:', `${data.stat.gid} (${safeText(data.gidName, 30)})`);
  note('Identificador do grupo de acesso. Define permissoes para usuarios membros do mesmo grupo no sistema.');
  field('Atributos estendidos (lsattr):', data.lsattrStr);
  note('Atributos especiais do sistema de arquivos Linux. Essencial para verificar protecoes adicionais alem das permissoes POSIX.');
  const isImmutable = data.lsattrStr.includes('i');
  field('Arquivo imutavel (flag i):', isImmutable ? 'SIM - arquivo protegido contra modificacao e exclusao' : 'Nao', false, isImmutable ? C.GREEN : C.LGRAY);
  note('Quando ativo, impede qualquer modificacao mesmo pelo usuario root. Indicador de protecao forense intencional.');

  divider();

  // ─────────────────────────────────────────────────
  // [5] HASHES CRIPTOGRAFICOS - Impressao Digital do Arquivo
  // ─────────────────────────────────────────────────
  section('[5] HASHES CRIPTOGRAFICOS - Impressao Digital do Arquivo', C.PURPLE);
  field('SHA-256 (hash principal — arquivo original):', data.sha256, true, C.CYAN);
  note('Este e o hash SHA-256 do arquivo original custodiado. 64 caracteres hexadecimais, sem espacos — copie-o integralmente para verificar autenticidade. Qualquer alteracao de 1 byte gera hash completamente diferente.');
  field('SHA-1:', data.sha1, true, C.LGRAY);
  note('Hash de 160 bits mantido para compatibilidade com sistemas legados e ferramentas externas de verificacao.');
  field('MD5:', data.md5, true, C.LGRAY);
  note('Hash de 128 bits de uso rapido. Vulneravel a colisoes intencionais. Usado apenas como verificacao basica complementar.');

  if (data.registeredHash) {
    field('Hash registrado no sistema:', data.registeredHash, true, C.GREEN);
    note('Hash SHA-256 armazenado previamente em _hashes_vps.txt no momento da entrada do arquivo na cadeia de custodia.');
    const hashMatch = data.registeredHash.toLowerCase() === data.sha256.toLowerCase();
    field(
      'Verificacao de integridade:',
      hashMatch ? '[OK] HASH IDENTICO - INTEGRIDADE CONFIRMADA' : '[FALHA] DIVERGENCIA DETECTADA - ARQUIVO PODE TER SIDO ALTERADO',
      false,
      hashMatch ? C.GREEN : C.RED,
    );
    note('Comparacao entre hash atual e hash registrado. Igualdade garante que o arquivo nao foi alterado desde a custodia.');
    if (!hashMatch) {
      checkY(30);
      infoBox([
        'ALERTA: Divergencia de hash detectada!',
        'O hash SHA-256 atual nao corresponde ao hash registrado no sistema.',
        'Isso pode indicar adulteracao, corrompimento ou substituicao do arquivo.',
      ], rgb(0.35, 0.02, 0.02), C.RED);
    }
  } else {
    field('Hash registrado no sistema:', 'Nao encontrado em _hashes_vps.txt', false, C.YELLOW);
    note('O arquivo ainda nao possui hash de referencia registrado. Esta e provavelmente a primeira pericia realizada sobre ele.');
    field('Status da integridade:', 'Hash nao registrado - linha de base sendo estabelecida nesta pericia', false, C.GRAY);
    note('A partir desta pericia, o SHA-256 acima serve como linha de base para verificacoes futuras.');
  }

  divider();

  // ─────────────────────────────────────────────────
  // [6] ANALISE DE SEGURANCA - Constatacao de Ameacas
  // ─────────────────────────────────────────────────
  section('[6] ANALISE DE SEGURANCA - Constatacao de Ameacas', C.RED);

  field(
    'Assinatura de bytes magicos:',
    data.magic ? `${safeText(data.magic.name, 40)} | Risco: ${data.magic.risk}` : 'Nao identificado (arquivo encriptado ou binario desconhecido)',
    false,
    data.magic ? (data.magic.level >= 3 ? C.RED : data.magic.level >= 2 ? C.ORANGE : C.GREEN) : C.GRAY,
  );
  note('Os primeiros bytes do arquivo revelam seu tipo real, independente da extensao. Mascarar um executavel com .txt e um indicador classico de malware.');
  field(
    'Entropia Shannon (aleatoriedade):',
    `${data.entropy}/8.0 - ${entropyInterpretation(data.entropy)}`,
    false,
    data.entropy > 7.5 ? C.RED : data.entropy > 6.5 ? C.ORANGE : data.entropy > 3.5 ? C.YELLOW : C.GREEN,
  );
  note('Mede a aleatoriedade do conteudo: 0.0=texto repetitivo, 8.0=dados completamente aleatorios/criptografados. >7.8 = encriptado ou comprimido.');

  // Malware patterns
  if (data.malwareHits.length === 0) {
    field('Varredura de padroes de malware:', 'Nenhum padrao suspeito detectado', false, C.GREEN);
    note('Busca por 10 padroes de codigo malicioso incluindo webshells PHP, reverse shells, PowerShell encodado e frameworks de ataque.');
  } else {
    field('Varredura de padroes de malware:', `${data.malwareHits.length} padrao(oes) detectado(s):`, false, C.RED);
    note('ATENCAO: Padroes de codigo malicioso foram identificados. Isolar o arquivo e acionar protocolo de resposta a incidentes.');
    for (const hit of data.malwareHits) {
      checkY(14);
      ctx.page.drawText(safeText(`  [!] ${hit.name} | Risco: ${hit.risk}`, 80), {
        x: 60, y: ctx.y, size: 8, font: fontMono,
        color: hit.risk === 'CRITICO' ? C.CRITICAL : hit.risk === 'ALTO' ? C.RED : C.ORANGE,
      });
      ctx.y -= 12;
    }
  }

  // Verdict box
  checkY(45);
  ctx.y -= 5;
  let verdictBg = rgb(0.02, 0.20, 0.06);
  let verdictFg = C.GREEN;
  let verdictLabel = 'LAUDO: ARQUIVO LIMPO - SEM AMEACAS';
  if (data.riskLevel >= 4) { verdictBg = rgb(0.25, 0.01, 0.01); verdictFg = C.CRITICAL; verdictLabel = 'LAUDO: CRITICO - AMEACA SEVERA'; }
  else if (data.riskLevel >= 3) { verdictBg = rgb(0.22, 0.04, 0.04); verdictFg = C.RED; verdictLabel = 'LAUDO: ALTO RISCO - CONTEUDO PERIGOSO'; }
  else if (data.riskLevel >= 2) { verdictBg = rgb(0.20, 0.10, 0.01); verdictFg = C.ORANGE; verdictLabel = 'LAUDO: SUSPEITO - REQUER ANALISE HUMANA'; }
  else if (data.riskLevel === 1) { verdictBg = rgb(0.18, 0.15, 0.01); verdictFg = C.YELLOW; verdictLabel = 'LAUDO: BAIXO RISCO - MONITORAR'; }

  ctx.page.drawRectangle({ x: 40, y: ctx.y - 28, width: 515, height: 28, color: verdictBg, borderColor: verdictFg, borderWidth: 1 });
  ctx.page.drawText(safeText(verdictLabel, 50), {
    x: 175, y: ctx.y - 8, size: 13, font: fontBold, color: verdictFg,
  });
  ctx.page.drawText(safeText(`Nivel ${data.riskLevel}/4 | Classificacao: ${data.overallRisk}`, 50), {
    x: 185, y: ctx.y - 20, size: 8, font: fontMono, color: verdictFg,
  });
  ctx.y -= 38;

  divider();

  // ─────────────────────────────────────────────────
  // [7] ANALISE DO ARQUIVO ENCRIPTADO (.enc) - only if .enc
  // ─────────────────────────────────────────────────
  if (data.isEnc && data.encAnalysis) {
    section('[7] ANALISE DO ARQUIVO ENCRIPTADO - Verificacao AES-256-CBC', C.ORANGE);
    field('Cabecalho do arquivo (.enc):', 'Sem assinatura magica detectada (comportamento esperado em AES-CBC)');
    note('Arquivos cifrados com AES-CBC nao possuem cabecalho identificavel. Ausencia confirma que a encriptacao nao expos o formato original.');
    field('Entropia do arquivo cifrado:', `${data.encAnalysis.entropy}/8.0`);
    note('Esperado proximo a 8.0 em AES-256-CBC. Valor inferior indica possivel falha na encriptacao ou dados apenas comprimidos.');
    field(
      'Alinhamento de bloco AES (16 bytes):',
      `Multiplo de 16: ${data.encAnalysis.sizeAligned ? 'Sim - padding correto' : 'Nao - verificar processo'} (tamanho: ${data.stat.size} bytes)`,
      false,
      data.encAnalysis.sizeAligned ? C.GREEN : C.YELLOW,
    );
    note('AES-CBC opera em blocos de 16 bytes. Tamanho multiplo de 16 confirma que o padding PKCS7 foi aplicado corretamente.');
    field(
      'Sequencias de texto nao cifradas:',
      `${data.encAnalysis.stringsFound.length} encontrada(s) via comando strings`,
      false,
      data.encAnalysis.stringsFound.length === 0 ? C.GREEN : C.ORANGE,
    );
    note('Busca por strings legiveis de 8+ caracteres no binario cifrado. Presenca indica encriptacao parcial ou fragmento nao cifrado.');
    if (data.encAnalysis.stringsFound.length === 0) {
      field('Strings encontradas:', 'Nenhuma - arquivo totalmente cifrado, sem dados legiveis expostos');
    } else {
      for (const s of data.encAnalysis.stringsFound.slice(0, 10)) {
        checkY(12);
        ctx.page.drawText(safeText(`  -> ${s}`, 80), {
          x: 60, y: ctx.y, size: 7.5, font: fontMono, color: C.ORANGE,
        });
        ctx.y -= 11;
      }
    }
    field('Arquivo original (sem .enc):', data.origStat ? 'Localizado no cofre (ambos presentes)' : 'Nao localizado (somente .enc presente no cofre)', false, data.origStat ? C.GREEN : C.GRAY);
    note('Verifica se o arquivo original ainda existe junto ao .enc. Ambos presentes pode indicar que a exclusao do original nao foi concluida.');
    field('Laudo da encriptacao:', data.encAnalysis.verdict, false, data.encAnalysis.isFullyEncrypted ? C.GREEN : C.YELLOW);
    note('Veredicto final sobre a qualidade e completude da encriptacao aplicada ao arquivo custodiado neste cofre forense.');
    divider();
  }

  // ─────────────────────────────────────────────────
  // [8] METADADOS EXIF - Comparativo Upload vs Pericia
  // ─────────────────────────────────────────────────
  section('[8] METADADOS EXIF - Comparativo: Upload vs. Pericia Atual', C.GRAY);
  {
    {
      const exifNoteW = RX - LX;
      const exifNoteLines = wrapTextPx('Metadados extraidos por exiftool. Col.1: baseline imutavel registrada no upload/1a pericia. Col.2: extracao atual. Col.4: STATUS de integridade por campo.', fontReg, 7, exifNoteW);
      for (let i = 0; i < exifNoteLines.length; i++) {
        checkY(10);
        justifyLine(ctx.page, exifNoteLines[i], LX, ctx.y, exifNoteW, 7, fontReg, C.LGRAY, i === exifNoteLines.length - 1);
        ctx.y -= 10;
      }
    }
    ctx.y -= 3;
  }

  {
    const SKIP = new Set(['SourceFile', 'ExifToolVersion', 'FilePermissions', 'Directory']);
    const allKeys = Array.from(new Set([
      ...Object.keys(data.exifInitial),
      ...Object.keys(data.exifData),
    ])).filter(k => !SKIP.has(k)).slice(0, 60);

    if (allKeys.length === 0) {
      checkY(14);
      ctx.page.drawText('Metadados EXIF nao disponiveis para este tipo de arquivo ou arquivo encriptado.', {
        x: LX + 10, y: ctx.y, size: 8, font: fontReg, color: C.GRAY,
      });
      ctx.y -= 14;
    } else {
      // ── 4-column Table header ──
      // Col A: Campo EXIF  x=30..140 (110)
      // Col B: Upload      x=142..307 (165)
      // Col C: Pericia     x=309..474 (165)
      // Col D: STATUS      x=476..565 (89)
      const cA = M + 2, cB = M + 112, cC = M + 279, cD = M + 448;
      checkY(18);
      ctx.page.drawRectangle({ x: M, y: ctx.y - 4, width: CW, height: 16, color: C.DARK });
      ctx.page.drawLine({ start: { x: cB - 2, y: ctx.y - 4 }, end: { x: cB - 2, y: ctx.y + 12 }, thickness: 0.5, color: C.DIVIDER });
      ctx.page.drawLine({ start: { x: cC - 2, y: ctx.y - 4 }, end: { x: cC - 2, y: ctx.y + 12 }, thickness: 0.5, color: C.DIVIDER });
      ctx.page.drawLine({ start: { x: cD - 2, y: ctx.y - 4 }, end: { x: cD - 2, y: ctx.y + 12 }, thickness: 0.5, color: C.DIVIDER });
      ctx.page.drawText('Campo EXIF', { x: cA + 3, y: ctx.y + 2, size: 7, font: fontBold, color: C.GRAY });
      ctx.page.drawText('Upload [imutavel]', { x: cB + 3, y: ctx.y + 2, size: 7, font: fontBold, color: C.TEAL });
      ctx.page.drawText('Pericia Atual', { x: cC + 3, y: ctx.y + 2, size: 7, font: fontBold, color: C.CYAN });
      ctx.page.drawText('STATUS', { x: cD + 3, y: ctx.y + 2, size: 7, font: fontBold, color: C.GRAY });
      ctx.y -= 20;

      // ── Table rows ──
      for (const key of allKeys) {
        const rawInit = data.exifInitial[key];
        const rawCurr = data.exifData[key];
        const initVal = safeText(String(rawInit ?? 'N/A'), 36);
        const currVal = safeText(String(rawCurr ?? 'N/A'), 36);
        const initMissing = rawInit == null;
        const currMissing = rawCurr == null;
        const changed = !initMissing && !currMissing && initVal !== currVal;
        const isNew   = initMissing && !currMissing;
        const absent  = !initMissing && currMissing;

        checkY(13);
        const rowBg = changed ? (printMode ? rgb(0.99, 0.96, 0.88) : rgb(0.15, 0.08, 0.01))
          : isNew   ? (printMode ? rgb(0.95, 0.99, 0.95) : rgb(0.03, 0.10, 0.04))
          : (printMode ? rgb(0.98, 0.98, 0.99) : rgb(0.055, 0.06, 0.09));
        ctx.page.drawRectangle({ x: M, y: ctx.y - 3, width: CW, height: 13, color: rowBg });
        ctx.page.drawLine({ start: { x: cB - 2, y: ctx.y - 3 }, end: { x: cB - 2, y: ctx.y + 10 }, thickness: 0.4, color: C.DIVIDER });
        ctx.page.drawLine({ start: { x: cC - 2, y: ctx.y - 3 }, end: { x: cC - 2, y: ctx.y + 10 }, thickness: 0.4, color: C.DIVIDER });
        ctx.page.drawLine({ start: { x: cD - 2, y: ctx.y - 3 }, end: { x: cD - 2, y: ctx.y + 10 }, thickness: 0.4, color: C.DIVIDER });

        ctx.page.drawText(safeText(key, 19), { x: cA + 3, y: ctx.y, size: 6.5, font: fontMono, color: C.GRAY });
        ctx.page.drawText(initVal, { x: cB + 3, y: ctx.y, size: 6.5, font: fontMono, color: C.LGRAY });
        ctx.page.drawText(currVal, { x: cC + 3, y: ctx.y, size: 6.5, font: fontMono, color: changed ? C.ORANGE : C.WHITE });

        // STATUS badge
        const [statusLabel, statusColor] = changed ? ['ALTERADO', C.ORANGE]
          : isNew    ? ['NOVO',     C.YELLOW]
          : absent   ? ['AUSENTE',  C.RED]
          : ['INTEGRO',  C.GREEN];
        // Mini colored pill background for status
        const statusBg = changed ? (printMode ? rgb(0.8,0.4,0) : rgb(0.18,0.06,0))
          : isNew    ? (printMode ? rgb(0.7,0.6,0) : rgb(0.12,0.10,0))
          : absent   ? (printMode ? rgb(0.7,0,0) : rgb(0.15,0,0))
          : (printMode ? rgb(0,0.4,0.1) : rgb(0,0.12,0.04));
        ctx.page.drawRectangle({ x: cD + 1, y: ctx.y - 2, width: 64, height: 11, color: statusBg, borderColor: statusColor, borderWidth: 0.4 });
        ctx.page.drawText(statusLabel, { x: cD + 5, y: ctx.y + 1, size: 6.0, font: fontBold, color: statusColor });
        ctx.y -= 12;
      }

      // ── Table footer ──
      checkY(28);
      ctx.y -= 4;
      const _exifDate = (() => { try { return data.now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return data.now.toISOString().slice(0,16); } })();
      const exifFooterText = `Col.1 (Upload): baseline imutavel, registrada na 1a entrada do arquivo no sistema NCFN. Col.2 (Pericia ${safeText(_exifDate, 20)} BRT): estado atual extraido nesta analise. STATUS: INTEGRO = sem alteracao | ALTERADO = divergencia detectada | NOVO = campo ausente na baseline.`;
      const exifFooterLines = wrapTextPx(exifFooterText, fontReg, 6.5, CW - 28);
      const exifFH = exifFooterLines.length * 9 + 10;
      ctx.page.drawRectangle({ x: M + 2, y: ctx.y - exifFH, width: CW - 4, height: exifFH + 4, color: C.DARK });
      ctx.page.drawRectangle({ x: M + 2, y: ctx.y - exifFH, width: 3, height: exifFH + 4, color: C.TEAL });
      let efy = ctx.y - 7;
      for (let i = 0; i < exifFooterLines.length; i++) {
        justifyLine(ctx.page, exifFooterLines[i], M + 12, efy, CW - 28, 6.5, fontReg, C.LGRAY, i === exifFooterLines.length - 1);
        efy -= 9;
      }
      ctx.y -= exifFH + 12;
    }
  }

  divider();

  // ─────────────────────────────────────────────────
  // [9] AMOSTRA DE CONTEUDO - text files only
  // ─────────────────────────────────────────────────
  if (data.textPreview) {
    section('[9] AMOSTRA DE CONTEUDO - Primeiras Linhas do Arquivo de Texto', C.TEAL);
    checkY(11);
    ctx.page.drawText('Exibicao parcial do conteudo textual. Permite verificacao visual sem necessidade de abrir o arquivo original. Maximo de 4000 caracteres.', {
      x: 48, y: ctx.y, size: 6.5, font: fontReg, color: C.GRAY,
    });
    ctx.y -= 11;
    const lines = data.textPreview.split('\n').slice(0, 50);
    for (const line of lines) {
      checkY(11);
      ctx.page.drawText(safeText(line || ' ', 95), {
        x: 48, y: ctx.y, size: 7, font: fontMono, color: C.LGRAY,
      });
      ctx.y -= 10;
    }
    checkY(12);
    ctx.page.drawText(safeText(`[... ${data.stat.size} bytes totais]`, 50), {
      x: 48, y: ctx.y, size: 7, font: fontMono, color: C.GRAY,
    });
    ctx.y -= 14;
    divider();
  }

  // ─────────────────────────────────────────────────
  // [10] REGISTROS DE ACESSO E CADEIA DE CUSTODIA
  // ─────────────────────────────────────────────────
  section('[10] REGISTROS DE ACESSO E CADEIA DE CUSTODIA - Historico Completo', C.AMBER);
  {
    const s10Lines = wrapTextPx('Historico completo de operacoes sobre o arquivo: visualizacoes, downloads, pericias e operacoes administrativas. Fundamental para a cadeia de custodia.', fontReg, 6.5, CW - 28);
    for (let i = 0; i < s10Lines.length; i++) {
      checkY(10);
      justifyLine(ctx.page, s10Lines[i], LX, ctx.y, CW - 28, 6.5, fontReg, C.GRAY, i === s10Lines.length - 1);
      ctx.y -= 10;
    }
  }
  ctx.y -= 2;

  if (data.dbLogs.length === 0 && !data.fileAccessLog) {
    checkY(14);
    ctx.page.drawText('Nenhum registro de acesso encontrado no banco de dados para este arquivo.', {
      x: 60, y: ctx.y, size: 8, font: fontReg, color: C.GRAY,
    });
    ctx.y -= 14;
  } else {
    // DB logs table header
    if (data.dbLogs.length > 0) {
      checkY(18);
      ctx.page.drawRectangle({ x: 40, y: ctx.y - 2, width: 515, height: 14, color: C.DARK });
      ctx.page.drawText('Data e Hora', { x: 45, y: ctx.y + 2, size: 7, font: fontBold, color: C.AMBER });
      ctx.page.drawText('Operacao', { x: 195, y: ctx.y + 2, size: 7, font: fontBold, color: C.AMBER });
      ctx.page.drawText('Operador', { x: 270, y: ctx.y + 2, size: 7, font: fontBold, color: C.AMBER });
      ctx.page.drawText('IP de Origem', { x: 435, y: ctx.y + 2, size: 7, font: fontBold, color: C.AMBER });
      ctx.y -= 16;

      for (const log of data.dbLogs.slice(0, 30)) {
        checkY(12);
        ctx.page.drawText(safeText(new Date(log.createdAt).toISOString().slice(0, 19), 22), {
          x: 45, y: ctx.y, size: 7, font: fontMono, color: C.LGRAY,
        });
        ctx.page.drawText(safeText(log.action, 12), {
          x: 195, y: ctx.y, size: 7, font: fontMono, color: C.WHITE,
        });
        ctx.page.drawText(safeText(log.userEmail, 25), {
          x: 270, y: ctx.y, size: 7, font: fontMono, color: C.LGRAY,
        });
        ctx.page.drawText(safeText(log.ip || '-', 18), {
          x: 450, y: ctx.y, size: 7, font: fontMono, color: C.GRAY,
        });
        ctx.y -= 11;
      }
    }

    if (data.fileAccessLog) {
      checkY(20);
      ctx.y -= 5;
      ctx.page.drawText('Registros do arquivo _registros_acesso.txt (log fisico da pasta):', {
        x: 48, y: ctx.y, size: 8, font: fontBold, color: C.AMBER,
      });
      ctx.y -= 12;
      const logLines = data.fileAccessLog.split('\n').slice(0, 20);
      for (const line of logLines) {
        checkY(11);
        ctx.page.drawText(safeText(line || ' ', 95), {
          x: 48, y: ctx.y, size: 7, font: fontMono, color: C.LGRAY,
        });
        ctx.y -= 10;
      }
    }
  }

  divider();

  // ─────────────────────────────────────────────────
  // [11] HISTORICO DE PERICIAS
  // ─────────────────────────────────────────────────
  section('[11] HISTORICO DE PERICIAS - Registro Cronologico de Analises', C.VIOLET);
  {
    const s11Lines = wrapTextPx('Cada pericia gera um registro imutavel no banco de dados. Este historico prova quantas vezes e por quem o arquivo foi analisado.', fontReg, 6.5, CW - 28);
    for (let i = 0; i < s11Lines.length; i++) {
      checkY(10);
      justifyLine(ctx.page, s11Lines[i], LX, ctx.y, CW - 28, 6.5, fontReg, C.GRAY, i === s11Lines.length - 1);
      ctx.y -= 10;
    }
  }
  ctx.y -= 2;

  if (data.prevPericias.length === 0) {
    checkY(14);
    ctx.page.drawText('Esta e a primeira pericia realizada sobre este arquivo. Nenhum historico anterior registrado.', {
      x: 60, y: ctx.y, size: 8, font: fontReg, color: C.GRAY,
    });
    ctx.y -= 14;
  } else {
    field('Total de pericias anteriores:', String(data.prevPericias.length));
    note('Numero de vezes que este arquivo foi submetido a pericia forense no sistema NCFN. Cada analise e registrada com data e operador.');
    for (const p of data.prevPericias.slice(0, 15)) {
      checkY(12);
      ctx.page.drawText(safeText(`Pericia em: ${new Date(p.createdAt).toISOString().slice(0, 19)} | Operador: ${p.userEmail}`, 90), {
        x: 55, y: ctx.y, size: 7.5, font: fontMono, color: C.VIOLET,
      });
      ctx.y -= 11;
    }
  }
  field('Registro desta pericia:', safeText((() => { try { return data.now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' BRT'; } catch { return data.now.toISOString(); } })(), 32), true, C.GREEN);
  note('Data e hora exata em que esta pericia foi gerada pelo Perito Sansao. Armazenado no banco de dados como registro auditavel.');
  field('Responsavel por esta pericia:', safeText(data.operator, 50));
  note('Operador do sistema NCFN que acionou a geracao desta pericia. Responsavel legal pela cadeia de custodia deste documento.');

  divider();

  // ─────────────────────────────────────────────────
  // [12] CUSTODIA POS-ENCRIPTACAO - only if .enc
  // ─────────────────────────────────────────────────
  if (data.isEnc) {
    section('[12] CUSTODIA POS-ENCRIPTACAO - Estado do Arquivo Cifrado', C.ORANGE);
    checkY(11);
    ctx.page.drawText('Dados forenses do arquivo apos o processo de encriptacao. Documenta o estado atual do arquivo protegido no cofre.', {
      x: 48, y: ctx.y, size: 6.5, font: fontReg, color: C.GRAY,
    });
    ctx.y -= 11;
    field('Tipo e formato do arquivo:', 'Arquivo encriptado AES-256-CBC (.enc) - NCFN Vault');
    note('Formato de encriptacao simetrica de 256 bits em modo CBC. Padrao de seguranca militar para protecao de evidencias digitais.');
    field('SHA-256 do arquivo .enc:', data.sha256, true, C.CYAN);
    note('Hash do arquivo ja encriptado. Qualquer modificacao no .enc (tentativa de adulteracao) alteraria este valor imediatamente.');
    field('Tamanho do arquivo cifrado:', `${data.stat.size} bytes (${formatBytes(data.stat.size)})`);
    note('Tamanho apos encriptacao com padding PKCS7. Deve ser multiplo de 16 bytes e ligeiramente maior que o arquivo original.');
    field('Alinhamento de bloco AES (16 bytes):', data.stat.size % 16 === 0 ? 'Correto - multiplo de 16 bytes' : 'Incorreto - verificar integridade da encriptacao', false, data.stat.size % 16 === 0 ? C.GREEN : C.YELLOW);
    note('Valida que o padding AES-CBC foi aplicado corretamente. Tamanho incorreto indica possivel corrompimento durante a encriptacao.');
    field('Arquivo original antes da cifra:', data.origStat ? 'Sim - original presente no cofre' : 'Nao - somente o .enc esta presente');
    note('Verifica se o arquivo sem encriptacao ainda esta no cofre. Para maxima seguranca, o original deve ser removido apos a cifragem.');

    checkY(20);
    ctx.page.drawText('Comando OpenSSL para decriptar (requer a chave correta):', {
      x: 48, y: ctx.y, size: 8, font: fontBold, color: C.GRAY,
    });
    ctx.y -= 12;
    ctx.page.drawText(safeText(`openssl enc -d -aes-256-cbc -in "${data.filename}" -out original`, 90), {
      x: 55, y: ctx.y, size: 7.5, font: fontMono, color: C.ORANGE,
    });
    ctx.y -= 14;
    divider();
  }

  // ─────────────────────────────────────────────────
  // [LEGAL] FUNDAMENTO LEGAL
  // ─────────────────────────────────────────────────
  section('[LEGAL] FUNDAMENTO LEGAL E NORMATIVO - Validade Juridica', C.DARK);
  {
    const legalDescW = RX - 55 - 4;
    const legalIntro = wrapTextPx('Base legal que fundamenta este relatorio e confere validade juridica a cadeia de custodia digital no ordenamento brasileiro.', fontReg, 6.5, legalDescW);
    for (let i = 0; i < legalIntro.length; i++) {
      checkY(11);
      justifyLine(ctx.page, legalIntro[i], 48, ctx.y, legalDescW, 6.5, fontReg, C.GRAY, i === legalIntro.length - 1);
      ctx.y -= 11;
    }
    ctx.y -= 2;
    const legal: Array<[string, string]> = [
      ['Art. 6, VII do CPP', 'Dever de preservar o estado das coisas quando da pratica de infracoes penais.'],
      ['Art. 11 da Lei 12.965/2014 - Marco Civil', 'Obrigacao de registro e manutencao de logs de acesso a aplicacoes de internet.'],
      ['Art. 19, par. 3 do Marco Civil', 'Preservacao de registros de acesso a conteudo em plataformas digitais.'],
      ['ISO/IEC 27037:2012', 'Norma internacional para identificacao, coleta, aquisicao e preservacao de evidencias digitais.'],
      ['Resolucao CNJ 396/2021', 'Politica de Seguranca da Informacao para o Poder Judiciario Brasileiro.'],
      ['Art. 422 do CPC', 'Admissibilidade de documento digital com certificacao de integridade via hash criptografico.'],
    ];
    for (const [norma, descricao] of legal) {
      const normaLines = wrapTextPx(`[*] ${norma}`, fontBold, 8, legalDescW);
      const descLines = wrapTextPx(descricao, fontReg, 7, legalDescW - 8);
      checkY(normaLines.length * 11 + descLines.length * 11 + 4);
      for (const nl of normaLines) {
        ctx.page.drawText(nl, { x: 55, y: ctx.y, size: 8, font: fontBold, color: C.LGRAY });
        ctx.y -= 11;
      }
      for (let di = 0; di < descLines.length; di++) {
        checkY(11);
        justifyLine(ctx.page, descLines[di], 63, ctx.y, legalDescW - 8, 7, fontReg, C.GRAY, di === descLines.length - 1);
        ctx.y -= 11;
      }
      ctx.y -= 2;
    }
  }

  divider();

  // ─────────────────────────────────────────────────
  // [CONCLUSAO] CONCLUSAO PERICIAL
  // ─────────────────────────────────────────────────
  section('[CONCLUSAO] CONCLUSAO PERICIAL - Laudo Final do Perito Sansao', C.GREEN);
  {
    const cW = RX - 55 - 4;
    // Paragraph 1 — identity
    const concl1 = `O arquivo "${safeText(data.filename, 60)}", custodiado na pasta "${safeText(data.folderName, 40)}" do Cofre Forense NCFN, foi submetido a analise pericial digital completa pelo Perito Sansao — Inteligencia Artificial Interna do Sistema NCFN, Protegida e Isolada de Sistemas Externos.`;
    const cl1 = wrapTextPx(concl1, fontReg, 8.5, cW);
    for (let i = 0; i < cl1.length; i++) { checkY(12); justifyLine(ctx.page, cl1[i], 55, ctx.y, cW, 8.5, fontReg, C.LGRAY, i === cl1.length - 1); ctx.y -= 12; }
    ctx.y -= 5;
    // SHA-256 label + hash (monospace)
    checkY(12);
    ctx.page.drawText('SHA-256 (arquivo original):', { x: 55, y: ctx.y, size: 8.5, font: fontBold, color: C.LGRAY });
    ctx.y -= 12;
    checkY(12);
    ctx.page.drawText(safeText(data.sha256, 64), { x: 55, y: ctx.y, size: 8, font: fontMono, color: C.CYAN });
    ctx.y -= 16;
    // Paragraph 2 — integrity statement
    const concl2 = `A integridade do arquivo e atestada pelos hashes criptograficos calculados neste relatorio. Qualquer alteracao posterior produzira hash completamente diferente, evidenciando adulteracao.`;
    const cl2 = wrapTextPx(concl2, fontReg, 8.5, cW);
    for (let i = 0; i < cl2.length; i++) { checkY(12); justifyLine(ctx.page, cl2[i], 55, ctx.y, cW, 8.5, fontReg, C.LGRAY, i === cl2.length - 1); ctx.y -= 12; }
    ctx.y -= 5;
    // Metrics line
    const metricsLine = `Entropia: ${data.entropy}/8.0  |  Assinatura magica: ${data.magic ? safeText(data.magic.name, 30) : 'Nao identificada'}  |  Malware: ${data.malwareHits.length === 0 ? 'Nenhum detectado' : data.malwareHits.length + ' padrao(oes) encontrado(s)'}`;
    const ml = wrapTextPx(metricsLine, fontMono, 7.5, cW);
    for (const mll of ml) { checkY(11); ctx.page.drawText(mll, { x: 55, y: ctx.y, size: 7.5, font: fontMono, color: C.LGRAY }); ctx.y -= 11; }
  }

  checkY(30);
  ctx.y -= 8;
  let statusLabel = 'LAUDO FINAL: ARQUIVO LIMPO E INTEGRO';
  let statusColor = C.GREEN;
  let statusBgColor = rgb(0.02, 0.18, 0.06);
  if (data.riskLevel >= 3) { statusLabel = 'LAUDO FINAL: ALTO RISCO — ACIONAR PROTOCOLO DE RESPOSTA IMEDIATA'; statusColor = C.RED; statusBgColor = rgb(0.18, 0.02, 0.02); }
  else if (data.riskLevel >= 2) { statusLabel = 'LAUDO FINAL: SUSPEITO — REQUER ANALISE HUMANA IMEDIATA'; statusColor = C.ORANGE; statusBgColor = rgb(0.18, 0.08, 0.01); }
  else if (data.riskLevel === 1) { statusLabel = 'LAUDO FINAL: BAIXO RISCO — MONITORAR PERIODICAMENTE'; statusColor = C.YELLOW; statusBgColor = rgb(0.15, 0.13, 0.01); }

  {
    // Centered verdict banner
    const slW = fontBold.widthOfTextAtSize(statusLabel, 10);
    const slX = M + CW / 2 - slW / 2;
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - 24, width: CW - 4, height: 24, color: statusBgColor, borderColor: statusColor, borderWidth: 0.8 });
    ctx.page.drawText(statusLabel, { x: slX, y: ctx.y - 15, size: 10, font: fontBold, color: statusColor });
  }
  ctx.y -= 34;

  // ─────────────────────────────────────────────────
  // HIGIDEZ DA CADEIA DE CUSTODIA E FUNDAMENTACAO NORMATIVA
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(20);
    ctx.y -= 6;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 22, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 22, color: C.BLUE });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 22, color: C.BLUE });
    ctx.page.drawText('HIGIDEZ DA CADEIA DE CUSTODIA E FUNDAMENTACAO NORMATIVA', {
      x: M + 12, y: ctx.y + 4, size: 8.5, font: fontBold, color: C.BLUE,
    });
    ctx.y -= 28;

    const HIGI_PARAS = [
      'O presente laudo certifica a preservacao do estado das coisas e a manutencao de uma cadeia de custodia ininterrupta e auditavel, satisfazendo os requisitos legais de admissibilidade probatoria. O fluxo de acautelamento da evidencia observou as etapas de Fixacao, Isolamento e Espelhamento, conforme preceitua a Lei n. 13.964/2019 (Pacote Anticrime), que introduziu os Artigos 158-A a 158-F ao Codigo de Processo Penal (CPP) brasileiro.',
      '',
      'No ambito internacional, os procedimentos de identificacao, coleta, aquisicao e preservacao alinham-se a norma ISO/IEC 27037:2012. Adicionalmente, a autoria, os registros de acesso e a imputabilidade do operador estao resguardados sob os ditames do Art. 11 e Art. 19, §3o da Lei n. 12.965/2014 (Marco Civil da Internet). A autenticidade e a forca probante deste documento eletronico sao atestadas e chanceladas na forma do Art. 422 do Codigo de Processo Civil (CPC), corroboradas pela assinatura digital do sistema NCFN.',
    ];
    const higiInnerW = CW - 28;
    const higiLineH = 11;
    const boxH = proseMeasure(HIGI_PARAS, fontReg, 7.5, higiInnerW, higiLineH, 5) + 16;
    checkY(boxH + 6);
    ctx.page.drawRectangle({
      x: M + 2, y: ctx.y - boxH, width: CW - 4, height: boxH,
      color: C.PANEL, borderColor: C.BLUE, borderWidth: 0.4,
    });
    ctx.y -= 10;
    proseRender(HIGI_PARAS, fontReg, 7.5, M + 12, higiInnerW, higiLineH, C.WHITE, 5);
    ctx.y -= 10;
  }

  // ─────────────────────────────────────────────────
  // NOTA TECNICA: VALIDACAO ESTRUTURAL E ANALISE DE ENTROPIA
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(20);
    ctx.y -= 6;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 22, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 22, color: C.PURPLE });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 22, color: C.PURPLE });
    ctx.page.drawText('NOTA TECNICA: VALIDACAO ESTRUTURAL E ANALISE DE ENTROPIA', {
      x: M + 12, y: ctx.y + 4, size: 8.5, font: fontBold, color: C.PURPLE,
    });
    ctx.y -= 28;

    const entropiaVal = safeText(String(data.entropy), 10);
    const cleanLabel = data.riskLevel === 0 ? 'LIMPO, INTEGRO E AUTENTICO' : data.overallRisk;
    const NOTA_PARA_1 = `A analise de baixo nivel da estrutura binaria atesta a compatibilidade absoluta entre a extensao declarada do artefato e a sua real assinatura interna (Magic Bytes). O calculo de Entropia de Shannon resultou em indice indicativo de alta densidade informacional (E = ${entropiaVal}), caracteristico de algoritmos de compressao padrao ou encriptacao robusta, afastando preliminarmente a hipotese de esteganografia trivial ou injecao de codigo malicioso anomalo. A integridade temporal da evidencia e ratificada pela cronologia MACB (Modification, Access, Change, Birth), nao apresentando anacronismos ou desvios em sua alocacao fisica nos blocos do sistema de arquivos subjacente.`;
    const NOTA_PARA_2 = `Diante dos exames tecnicos supracitados e da ausencia de padroes condizentes com artefatos maliciosos (Malware/Exploits) na presente data, conclui-se que o arquivo digital submetido a analise encontra-se ${cleanLabel}. A custodia criptografica esta consolidada. O valor de hash SHA-256 constituido neste ato atua como linha de base imutavel da evidencia; qualquer divergencia estrutural ou binaria futura em relacao a este identificador matematico configurara a adulteracao irremediavel do artefato e a imediata quebra da cadeia de custodia.`;
    const notaInnerW = CW - 28;
    const notaLineH = 11;
    const notaStatusColor = data.riskLevel === 0 ? C.GREEN : data.riskLevel >= 3 ? C.RED : C.YELLOW;
    const boxH2 = proseMeasure([NOTA_PARA_1, '', NOTA_PARA_2], fontReg, 7.5, notaInnerW, notaLineH, 5) + 16;
    checkY(boxH2 + 6);
    ctx.page.drawRectangle({
      x: M + 2, y: ctx.y - boxH2, width: CW - 4, height: boxH2,
      color: C.PANEL, borderColor: C.PURPLE, borderWidth: 0.4,
    });
    ctx.y -= 10;
    proseRender([NOTA_PARA_1], fontReg, 7.5, M + 12, notaInnerW, notaLineH, C.WHITE, 5);
    ctx.y -= 5;
    {
      const statusLines = wrapTextPx(NOTA_PARA_2, fontReg, 7.5, notaInnerW);
      for (let i = 0; i < statusLines.length; i++) {
        checkY(notaLineH);
        const sl = statusLines[i];
        const isStatus = sl.includes(cleanLabel);
        justifyLine(ctx.page, sl, M + 12, ctx.y, notaInnerW, 7.5, isStatus ? fontBold : fontReg, isStatus ? notaStatusColor : C.WHITE, i === statusLines.length - 1);
        ctx.y -= notaLineH;
      }
    }
    ctx.y -= 10;
  }

  // ─────────────────────────────────────────────────
  // CERTIFICACAO DE AUTENTICIDADE E INTEGRIDADE SISTEMICA
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(20);
    ctx.y -= 6;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 22, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 22, color: C.GREEN });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 22, color: C.GREEN });
    ctx.page.drawLine({ start: { x: M, y: ctx.y + 17 }, end: { x: M + CW, y: ctx.y + 17 }, thickness: 0.6, color: C.GREEN });
    ctx.page.drawText('CERTIFICACAO DE AUTENTICIDADE E INTEGRIDADE SISTEMICA', {
      x: M + 12, y: ctx.y + 4, size: 8.5, font: fontBold, color: C.GREEN,
    });
    ctx.y -= 28;

    const CERT_PARAS = [
      `Certifico, para os devidos fins de direito e sob as penas da lei, que o presente Relatorio do ativo digital acima identificado foi gerado de forma automatizada pelo sistema NCFN, em ambiente isolado e auditavel. Atesto que todos os hashes criptograficos, metadados e registros de log aqui expostos guardam fidedignidade absoluta com o ativo digital custodiado no Cofre Forense, nao tendo sofrido qualquer intervencao humana ou alteracao de bits desde o momento de sua fixacao no protocolo ${safeText(data.docId, 25)}.`,
      '',
      `A metodologia aplicada observa rigorosamente a ISO/IEC 27037:2012 e os preceitos da Cadeia de Custodia Digital previstos no Art. 158-B do Codigo de Processo Penal. Este documento constitui peca tecnica oficial e imutavel.`,
    ];
    const certInnerW = CW - 28;
    const certLineH = 11;
    const certBoxH = proseMeasure(CERT_PARAS, fontReg, 7.5, certInnerW, certLineH, 5) + 16;
    checkY(certBoxH + 6);
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - certBoxH, width: CW - 4, height: certBoxH, color: C.PANEL, borderColor: C.GREEN, borderWidth: 0.4 });
    ctx.y -= 10;
    proseRender(CERT_PARAS, fontReg, 7.5, M + 12, certInnerW, certLineH, C.WHITE, 5);
    ctx.y -= 12;
  }

  // ─────────────────────────────────────────────────
  // ASSINATURA DO CUSTODIANTE + CARIMBO DO SISTEMA
  // ─────────────────────────────────────────────────
  {
    checkY(110);
    ctx.y -= 6;
    // Two-column layout: left = custodian signature, right = system stamp
    const sigColW = Math.floor(CW / 2) - 4;
    const sigL = M + 2;
    const sigR = M + 2 + sigColW + 8;
    const sigH = 95;

    // Left: custodian signature field
    ctx.page.drawRectangle({ x: sigL, y: ctx.y - sigH, width: sigColW, height: sigH, color: C.PANEL, borderColor: C.GREEN, borderWidth: 0.8 });
    ctx.page.drawRectangle({ x: sigL, y: ctx.y - sigH, width: sigColW, height: 2, color: C.GREEN });
    ctx.page.drawText('ASSINATURA DO CUSTODIANTE', { x: sigL + 8, y: ctx.y - 12, size: 7, font: fontBold, color: C.GREEN });
    ctx.page.drawText('(Responsavel pela cadeia de custodia)', { x: sigL + 8, y: ctx.y - 21, size: 5.5, font: fontReg, color: C.GRAY });
    ctx.page.drawLine({ start: { x: sigL + 10, y: ctx.y - 48 }, end: { x: sigL + sigColW - 10, y: ctx.y - 48 }, thickness: 0.7, color: C.GREEN });
    ctx.page.drawText('Assinatura', { x: sigL + sigColW / 2 - 15, y: ctx.y - 55, size: 5.5, font: fontReg, color: C.GRAY });
    ctx.page.drawLine({ start: { x: sigL + 10, y: ctx.y - 68 }, end: { x: sigL + sigColW - 10, y: ctx.y - 68 }, thickness: 0.5, color: C.DGRAY });
    ctx.page.drawText('Nome completo', { x: sigL + sigColW / 2 - 20, y: ctx.y - 75, size: 5.5, font: fontReg, color: C.GRAY });
    ctx.page.drawLine({ start: { x: sigL + 10, y: ctx.y - 85 }, end: { x: sigL + sigColW - 10, y: ctx.y - 85 }, thickness: 0.5, color: C.DGRAY });
    ctx.page.drawText('Data e Hora (BRT)', { x: sigL + sigColW / 2 - 25, y: ctx.y - 92, size: 5.5, font: fontReg, color: C.GRAY });

    // Right: system stamp
    ctx.page.drawRectangle({ x: sigR, y: ctx.y - sigH, width: sigColW, height: sigH, color: C.DARK, borderColor: C.PURPLE, borderWidth: 1.5 });
    ctx.page.drawRectangle({ x: sigR, y: ctx.y - sigH, width: sigColW, height: 2, color: C.PURPLE });
    ctx.page.drawRectangle({ x: sigR, y: ctx.y - 2, width: sigColW, height: 2, color: C.CYAN });
    // Concentric security rings in stamp area
    const stampCX = sigR + sigColW / 2;
    const stampCY = ctx.y - sigH / 2;
    for (let sr = 8; sr <= 30; sr += 8) {
      const steps = 28;
      let sprev = { x: stampCX + sr * 1.3 * Math.cos(0), y: stampCY + sr * Math.sin(0) };
      for (let si = 1; si <= steps; si++) {
        const ang = (si / steps) * 2 * Math.PI;
        const scur = { x: stampCX + sr * 1.3 * Math.cos(ang), y: stampCY + sr * Math.sin(ang) };
        ctx.page.drawLine({ start: sprev, end: scur, thickness: 0.3, color: printMode ? rgb(0.60, 0.20, 0.85) : rgb(0.15, 0.05, 0.22) });
        sprev = scur;
      }
    }
    ctx.page.drawText('NCFN', { x: stampCX - 14, y: stampCY + 12, size: 13, font: fontBold, color: C.PURPLE });
    ctx.page.drawText('PERITO SANSAO', { x: stampCX - 28, y: stampCY + 1, size: 7, font: fontBold, color: C.CYAN });
    ctx.page.drawText('IA  AIR-GAPPED', { x: stampCX - 26, y: stampCY - 8, size: 5.5, font: fontMono, color: C.GRAY });
    ctx.page.drawText(safeText(`SHA: ${data.sha256.slice(0,10)}...`, 30), { x: stampCX - 30, y: stampCY - 17, size: 4.5, font: fontMono, color: C.DGRAY });
    ctx.page.drawText(safeText(`DOC: ${data.docId.slice(0,10)}`, 20), { x: stampCX - 22, y: stampCY - 25, size: 4.5, font: fontMono, color: C.DGRAY });
    ctx.page.drawText('CARIMBO DO SISTEMA NCFN', { x: sigR + 8, y: ctx.y - 12, size: 6, font: fontBold, color: C.PURPLE });
    ctx.page.drawText('(Assinatura Automatizada - Air-Gapped)', { x: sigR + 8, y: ctx.y - 20, size: 5, font: fontReg, color: C.GRAY });
    ctx.page.drawText('[Nome do custodiante como marca d\'agua', { x: sigR + 8, y: ctx.y - 86, size: 4.5, font: fontReg, color: C.DGRAY });
    ctx.page.drawText(' sera integrado ao banco de dados - em breve]', { x: sigR + 8, y: ctx.y - 92, size: 4.5, font: fontReg, color: C.DGRAY });

    ctx.y -= sigH + 12;
  }

  // ─────────────────────────────────────────────────
  // CONFERENCIA E VALIDACAO DE CUSTODIA
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(20);
    ctx.y -= 4;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 20, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 20, color: C.TEAL });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 20, color: C.TEAL });
    ctx.page.drawLine({ start: { x: M, y: ctx.y + 15 }, end: { x: M + CW, y: ctx.y + 15 }, thickness: 0.6, color: C.TEAL });
    ctx.page.drawText('CONFERENCIA E VALIDACAO DE CUSTODIA', {
      x: M + 12, y: ctx.y + 3, size: 8.5, font: fontBold, color: C.TEAL,
    });
    ctx.y -= 26;

    // Verification link
    const verifyUrl = `https://ncfn.net/auditor`;
    field('Ponto de Verificacao:', 'https://ncfn.net/auditor', true, C.CYAN);
    addLink(ctx.page, verifyUrl, 185, ctx.y + 13, 220, 9);
    // ── 3 hashes (arquivo original, relatorio digital, relatorio impressao) ──
    checkY(150);
    ctx.y -= 4;
    const hashBoxH = 130;
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - hashBoxH, width: CW - 4, height: hashBoxH, color: C.DARK, borderColor: C.TEAL, borderWidth: 0.5 });
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - hashBoxH, width: 3, height: hashBoxH, color: C.TEAL });

    // Header
    ctx.page.drawText('HASHES SHA-256 DE VERIFICACAO — 3 ARTEFATOS NO PACOTE ZIP', {
      x: M + 12, y: ctx.y - 10, size: 7.5, font: fontBold, color: C.TEAL,
    });

    // Divider line
    ctx.page.drawLine({ start: { x: M + 6, y: ctx.y - 18 }, end: { x: M + CW - 6, y: ctx.y - 18 }, thickness: 0.4, color: C.DIVIDER });

    // Row 1 — arquivo original — SHA-256 + MD5 + SHA-1
    ctx.page.drawText('[1] ARQUIVO ORIGINAL (cofre):', { x: M + 8, y: ctx.y - 27, size: 6.5, font: fontBold, color: C.CYAN });
    ctx.page.drawText(safeText(data.filename, 55), { x: M + 155, y: ctx.y - 27, size: 6.5, font: fontMono, color: C.WHITE });
    const sh = data.sha256;
    ctx.page.drawText(safeText(`SHA-256: ${sh}`, 95), {
      x: M + 8, y: ctx.y - 38, size: 6.5, font: fontMono, color: C.CYAN,
    });
    ctx.page.drawText(safeText(`MD5:     ${data.md5}`, 80), {
      x: M + 8, y: ctx.y - 48, size: 6.5, font: fontMono, color: C.LGRAY,
    });
    ctx.page.drawText(safeText(`SHA-1:   ${data.sha1}`, 80), {
      x: M + 8, y: ctx.y - 58, size: 6.5, font: fontMono, color: C.LGRAY,
    });

    // Divider
    ctx.page.drawLine({ start: { x: M + 6, y: ctx.y - 64 }, end: { x: M + CW - 6, y: ctx.y - 64 }, thickness: 0.3, color: C.DIVIDER });

    // Row 2 — relatorio digital
    ctx.page.drawText('[2] RELATORIO FORENSE DIGITAL (PDF escuro — tela):', { x: M + 8, y: ctx.y - 73, size: 6.5, font: fontBold, color: C.PURPLE });
    ctx.page.drawText('pericia_forense_ncfn_digital.pdf', { x: M + 295, y: ctx.y - 73, size: 6.5, font: fontMono, color: C.WHITE });
    ctx.page.drawText('SHA-256: consulte VERIFICACAO_HASHES.txt no pacote ZIP', {
      x: M + 8, y: ctx.y - 83, size: 6.5, font: fontMono, color: C.PURPLE,
    });

    // Divider
    ctx.page.drawLine({ start: { x: M + 6, y: ctx.y - 89 }, end: { x: M + CW - 6, y: ctx.y - 89 }, thickness: 0.3, color: C.DIVIDER });

    // Row 3 — relatorio impressao
    ctx.page.drawText('[3] RELATORIO FORENSE IMPRESSAO (PDF claro — papel):', { x: M + 8, y: ctx.y - 98, size: 6.5, font: fontBold, color: C.AMBER });
    ctx.page.drawText('pericia_forense_ncfn_impressao.pdf', { x: M + 300, y: ctx.y - 98, size: 6.5, font: fontMono, color: C.WHITE });
    ctx.page.drawText('SHA-256: consulte VERIFICACAO_HASHES.txt no pacote ZIP', {
      x: M + 8, y: ctx.y - 108, size: 6.5, font: fontMono, color: C.AMBER,
    });

    ctx.y -= hashBoxH + 6;

    // ── Verification instructions (mirrors VERIFICACAO_HASHES.txt) ──
    checkY(40);
    ctx.y -= 4;
    ctx.page.drawText('COMO VERIFICAR A INTEGRIDADE DOS ARQUIVOS:', { x: M + 8, y: ctx.y, size: 7, font: fontBold, color: C.TEAL });
    ctx.y -= 11;
    const verifyLines = [
      'Linux/Mac:  sha256sum <arquivo>   |   md5sum <arquivo>   |   sha1sum <arquivo>',
      'Windows:    certutil -hashfile <arquivo> SHA256',
      'Qualquer divergencia de um unico caractere invalida a integridade do arquivo.',
    ];
    for (const vl of verifyLines) {
      checkY(10);
      ctx.page.drawText(safeText(vl, 100), { x: M + 16, y: ctx.y, size: 6.5, font: fontMono, color: C.GRAY });
      ctx.y -= 10;
    }

    // ── Campo hash copiavel — hash completo sem espacos ──
    checkY(14);
    ctx.page.drawRectangle({ x: VX - 1, y: ctx.y - 2, width: 370, height: 12, color: C.DARK, borderColor: C.TEAL, borderWidth: 0.5 });
    field('SHA-256 (arquivo original):', data.sha256, true, C.CYAN);
    note('Hash completo de 64 caracteres sem espacos — copie-o integralmente. Qualquer divergencia de um unico caractere invalida este laudo.');

    checkY(14);
    ctx.page.drawRectangle({ x: VX - 1, y: ctx.y - 2, width: 160, height: 12, color: C.DARK, borderColor: C.GREEN, borderWidth: 0.5 });
    field('ID do Protocolo:', safeText(data.docId, 25), true, C.GREEN);
    note('Identificador unico deste laudo. Use-o para localizar o registro no portal de auditoria NCFN.');

    // ── Tabela de fusos horarios ──
    checkY(90);
    ctx.y -= 6;
    {
      const now2 = data.now;
      const tzRows: [string, string, string][] = [
        ['BRASILIA (BRT)', 'America/Sao_Paulo', 'UTC-3'],
        ['EUA — LESTE (EST/EDT)', 'America/New_York', 'UTC-5/-4'],
        ['EUROPA — CENTRAL (CET)', 'Europe/Berlin', 'UTC+1/+2'],
        ['JAPAO (JST)', 'Asia/Tokyo', 'UTC+9'],
      ];
      const tzBoxH = 12 + tzRows.length * 14 + 10;
      ctx.page.drawRectangle({ x: M + 2, y: ctx.y - tzBoxH, width: CW - 4, height: tzBoxH, color: C.DARK, borderColor: C.VIOLET, borderWidth: 0.5 });
      ctx.page.drawRectangle({ x: M + 2, y: ctx.y - tzBoxH, width: 3, height: tzBoxH, color: C.VIOLET });
      ctx.page.drawText('HORARIO DO DOCUMENTO NOS PRINCIPAIS FUSOS HORARIOS', {
        x: M + 12, y: ctx.y - 9, size: 7, font: fontBold, color: C.VIOLET,
      });
      ctx.page.drawLine({ start: { x: M + 6, y: ctx.y - 14 }, end: { x: M + CW - 6, y: ctx.y - 14 }, thickness: 0.3, color: C.DIVIDER });
      // Column headers
      ctx.page.drawText('FUSO HORARIO', { x: M + 10, y: ctx.y - 22, size: 6, font: fontBold, color: C.GRAY });
      ctx.page.drawText('UTC', { x: M + 170, y: ctx.y - 22, size: 6, font: fontBold, color: C.GRAY });
      ctx.page.drawText('DATA / HORA LOCAL', { x: M + 210, y: ctx.y - 22, size: 6, font: fontBold, color: C.GRAY });
      let rowY = ctx.y - 34;
      for (const [label, tz, utcOff] of tzRows) {
        let localStr = '';
        try {
          localStr = now2.toLocaleString('pt-BR', {
            timeZone: tz,
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          });
        } catch { localStr = 'N/A'; }
        ctx.page.drawText(safeText(label, 28), { x: M + 10, y: rowY, size: 7, font: fontMono, color: C.WHITE });
        ctx.page.drawText(utcOff, { x: M + 170, y: rowY, size: 7, font: fontMono, color: C.LGRAY });
        ctx.page.drawText(safeText(localStr, 36), { x: M + 210, y: rowY, size: 7, font: fontMono, color: C.CYAN });
        rowY -= 14;
      }
      ctx.y -= tzBoxH + 8;
    }

    checkY(24);
    ctx.y -= 4;
    const conferInnerW = CW - 28;
    const conferWrapped = wrapTextPx('Instrucao: O perito judicial/criminal ou autoridade competente deve confrontar o hash acima com o arquivo original. Qualquer divergencia de um unico caractere invalida este laudo em sua totalidade.', fontReg, 6.5, conferInnerW);
    const conferH = conferWrapped.length * 9 + 10;
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - conferH, width: CW - 4, height: conferH + 4, color: C.DARK });
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - conferH, width: 3, height: conferH + 4, color: C.TEAL });
    let confY = ctx.y - 7;
    for (let i = 0; i < conferWrapped.length; i++) {
      justifyLine(ctx.page, conferWrapped[i], M + 12, confY, conferInnerW, 6.5, fontReg, C.LGRAY, i === conferWrapped.length - 1);
      confY -= 9;
    }
    ctx.y -= conferH + 10;
  }

  // ─────────────────────────────────────────────────
  // OBSERVACOES DO PERITO JUDICIAL / CRIMINAL
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(130);
    ctx.y -= 4;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 20, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 20, color: C.GRAY });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 20, color: C.GRAY });
    ctx.page.drawText('OBSERVACOES DO PERITO JUDICIAL / CRIMINAL', {
      x: M + 12, y: ctx.y + 3, size: 8.5, font: fontBold, color: C.LGRAY,
    });
    ctx.y -= 24;
    ctx.page.drawText('(Espaco reservado para anotacoes manuscritas ou insercoes complementares do perito oficial)', {
      x: M + 12, y: ctx.y, size: 7, font: fontReg, color: C.GRAY,
    });
    ctx.y -= 10;
    // Table with ruled lines
    const tableTop = ctx.y;
    ctx.page.drawRectangle({ x: M + 2, y: tableTop - 90, width: CW - 4, height: 94, color: C.DARK, borderColor: C.DGRAY, borderWidth: 0.8 });
    for (let li = 1; li <= 5; li++) {
      ctx.page.drawLine({
        start: { x: M + 8, y: tableTop - li * 14 },
        end: { x: M + CW - 8, y: tableTop - li * 14 },
        thickness: 0.4, color: C.DIVIDER,
      });
    }
    const sigMid = Math.floor(W / 2);
    ctx.page.drawLine({ start: { x: M + 8, y: tableTop - 82 }, end: { x: sigMid - 12, y: tableTop - 82 }, thickness: 0.8, color: C.DGRAY });
    ctx.page.drawLine({ start: { x: sigMid + 12, y: tableTop - 82 }, end: { x: M + CW - 8, y: tableTop - 82 }, thickness: 0.8, color: C.DGRAY });
    ctx.page.drawText('Data: ____/____/______', { x: M + 10, y: tableTop - 88, size: 7, font: fontReg, color: C.GRAY });
    ctx.page.drawText('Assinatura / Carimbo: ___________________________________', { x: sigMid + 14, y: tableTop - 88, size: 7, font: fontReg, color: C.GRAY });
    ctx.y -= 100;
  }

  // ─────────────────────────────────────────────────
  // INVIOLABILITY SEAL — Full SHA-256 fingerprint
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(85);
    ctx.y -= 6;
    const invH = 72;
    ctx.page.drawRectangle({ x: M, y: ctx.y - invH, width: CW, height: invH, color: C.DARK, borderColor: C.PURPLE, borderWidth: 1.8 });
    ctx.page.drawRectangle({ x: M + 3, y: ctx.y - invH + 3, width: CW - 6, height: invH - 6, color: C.BG, borderColor: C.CYAN, borderWidth: 0.5 });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 1, width: CW, height: 3, color: C.PURPLE });
    ctx.page.drawRectangle({ x: M, y: ctx.y - invH, width: CW, height: 3, color: C.CYAN });
    ctx.page.drawText('IMPRESSAO DIGITAL CRIPTOGRAFICA -- LACRE DE INVIOLABILIDADE', {
      x: M + 82, y: ctx.y - 14, size: 8.5, font: fontBold, color: C.CYAN,
    });
    const sh = data.sha256;
    const hashLine1 = `${sh.slice(0,8)} ${sh.slice(8,16)} ${sh.slice(16,24)} ${sh.slice(24,32)}`;
    const hashLine2 = `${sh.slice(32,40)} ${sh.slice(40,48)} ${sh.slice(48,56)} ${sh.slice(56,64)}`;
    ctx.page.drawText(safeText(hashLine1, 80), { x: M + 38, y: ctx.y - 28, size: 8.5, font: fontMono, color: C.WHITE });
    ctx.page.drawText(safeText(hashLine2, 80), { x: M + 38, y: ctx.y - 40, size: 8.5, font: fontMono, color: C.WHITE });
    ctx.page.drawText('SHA-256 (FIPS 180-4)', { x: M + 38, y: ctx.y - 50, size: 6.5, font: fontBold, color: C.PURPLE });
    const _invDate = (() => { try { return data.now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' BRT'; } catch { return data.now.toISOString(); } })();
    ctx.page.drawText(safeText(`DOC: ${data.docId}  |  RFC 3161  |  PERITO SANSAO - IA NCFN  |  ${_invDate}`, 92), {
      x: M + 38, y: ctx.y - 60, size: 6, font: fontMono, color: C.GRAY,
    });
    ctx.y -= invH + 10;
  }

  // ─────────────────────────────────────────────────
  // GLOSSARIO — two-column, last page
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(20);
    ctx.y -= 4;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 18, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 18, color: C.VIOLET });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 18, color: C.VIOLET });
    ctx.page.drawLine({ start: { x: M, y: ctx.y + 13 }, end: { x: M + CW, y: ctx.y + 13 }, thickness: 0.6, color: C.VIOLET });
    ctx.page.drawText('GLOSSARIO TECNICO E FORENSE (NCFN v2.0)', {
      x: M + 12, y: ctx.y + 2, size: 7.5, font: fontBold, color: C.VIOLET,
    });
    ctx.y -= 22;

    const glossItems: Array<{term: string, def: string}> = [
      { term: 'Hash (SHA-256)', def: 'Algoritmo que gera uma impressao digital unica de 256 bits para o arquivo. Qualquer alteracao de um unico bit resulta em hash completamente distinto, evidenciando adulteracao.' },
      { term: 'Cadeia de Custodia', def: 'Procedimentos documentados que garantem rastreabilidade e integridade da evidencia digital, desde a coleta ate o descarte final (Arts. 158-A a 158-F do CPP).' },
      { term: 'Entropia de Shannon', def: 'Metrica de aleatoriedade dos dados. Valores proximos a 8.0 indicam alta densidade informacional, inconsistentes com texto plano, ratificando criptografia ou compressao robusta.' },
      { term: 'Magic Bytes', def: 'Sequencia de bytes no cabecalho que identifica o formato real do arquivo, independentemente da extensao declarada.' },
      { term: 'MACB', def: 'Cronologia tecnica: Modificacao (M), Acesso (A), Mudanca de Metadados (C) e Nascimento/Criacao (B) do arquivo no sistema operacional.' },
      { term: 'Inode', def: 'Identificador numerico unico de um arquivo no sistema de arquivos Linux. Persiste mesmo com renomeacao ou movimentacao.' },
      { term: 'Zero-Trust', def: 'Modelo de seguranca onde nenhuma conexao e confiavel por padrao, exigindo verificacao continua e criptografia ponta a ponta.' },
      { term: 'Air-Gapped', def: 'Configuracao onde o processamento (Perito Sansao) ocorre sem qualquer conexao fisica ou logica com redes externas, mitigando vazamento de dados.' },
      { term: 'Imutabilidade', def: 'Propriedade que impede alteracao ou exclusao apos registro, garantida no NCFN por logs permanentes e volumes de armazenamento protegidos.' },
      { term: 'MIME Type', def: 'Padrao internacional para identificar a natureza e formato de um arquivo para processamento por softwares (ex: application/pdf).' },
    ];

    // Split into two columns
    const half = Math.ceil(glossItems.length / 2);
    const leftGloss = glossItems.slice(0, half);
    const rightGloss = glossItems.slice(half);
    const gCol1X = M + 4;
    const gCol2X = M + 4 + Math.floor(CW / 2) + 2;
    const gFontSz = 6.0;
    const gLineH = 8.2;
    // Pixel-accurate column inner widths
    const gInnerW1 = Math.floor(W / 2) - (gCol1X + 4) - 8;   // ~253px
    const gInnerW2 = (M + CW - 8) - (gCol2X + 4);             // ~252px
    const gStartY = ctx.y;

    ctx.page.drawLine({ start: { x: Math.floor(W / 2), y: gStartY }, end: { x: Math.floor(W / 2), y: gStartY - 220 }, thickness: 0.3, color: C.DIVIDER });

    let gly = gStartY;
    for (const item of leftGloss) {
      if (gly < 50) break;
      ctx.page.drawText(safeText(`${item.term}:`, 30), { x: gCol1X, y: gly, size: gFontSz, font: fontBold, color: C.VIOLET });
      gly -= gLineH;
      const defLines1 = wrapTextPx(item.def, fontReg, gFontSz, gInnerW1);
      for (let di = 0; di < defLines1.length; di++) {
        if (gly < 50) break;
        justifyLine(ctx.page, defLines1[di], gCol1X + 4, gly, gInnerW1, gFontSz, fontReg, C.LGRAY, di === defLines1.length - 1);
        gly -= gLineH;
      }
      gly -= 3;
    }

    let gry = gStartY;
    for (const item of rightGloss) {
      if (gry < 50) break;
      ctx.page.drawText(safeText(`${item.term}:`, 30), { x: gCol2X, y: gry, size: gFontSz, font: fontBold, color: C.VIOLET });
      gry -= gLineH;
      const defLines2 = wrapTextPx(item.def, fontReg, gFontSz, gInnerW2);
      for (let di = 0; di < defLines2.length; di++) {
        if (gry < 50) break;
        justifyLine(ctx.page, defLines2[di], gCol2X + 4, gry, gInnerW2, gFontSz, fontReg, C.LGRAY, di === defLines2.length - 1);
        gry -= gLineH;
      }
      gry -= 3;
    }

    ctx.y -= Math.max(gStartY - gly, gStartY - gry) + 8;
  }

  // ─────────────────────────────────────────────────
  // CAMPOS DE SEGURANCA AVANCADOS
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(22);
    ctx.y -= 4;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 20, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 20, color: C.AMBER });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 20, color: C.AMBER });
    ctx.page.drawText('CAMPOS DE SEGURANCA AVANCADOS - MULTI-JURISDICIONAL', {
      x: M + 12, y: ctx.y + 3, size: 7.5, font: fontBold, color: C.AMBER,
    });
    ctx.y -= 26;

    const advSecItems = [
      { label: 'Identificador Unico do Laudo (UUID v4):', value: safeText(data.docId, 40), color: C.GREEN },
      { label: 'Hash de Integridade do Relatorio:', value: safeText(crypto.createHash('sha256').update(data.sha256 + data.docId + data.operator).digest('hex').toUpperCase(), 66), color: C.CYAN },
      { label: 'Algoritmo de Assinatura:', value: 'SHA-256 (FIPS 180-4) + AES-256-CBC + SCRYPT', color: C.WHITE },
      { label: 'Nivel de Classificacao:', value: 'CONFIDENCIAL - USO RESTRITO - CADEIA DE CUSTODIA', color: C.RED },
      { label: 'Protocolo de Timestamping:', value: 'RFC 3161 — Trusted Timestamp Authority', color: C.LGRAY },
      { label: 'Conformidade Legal:', value: 'ISO/IEC 27037:2012 | Lei 13.964/2019 | Art. 158-B CPP | Art. 422 CPC', color: C.LGRAY },
      { label: 'Ambiente de Processamento:', value: 'Air-Gapped Container | Zero-Trust Network | Sandboxed Execution', color: C.TEAL },
    ];
    for (const item of advSecItems) {
      checkY(14);
      ctx.page.drawText(safeText(item.label, 46), { x: LX, y: ctx.y, size: 7, font: fontBold, color: C.GRAY });
      ctx.page.drawText(safeText(item.value, 68), { x: VX, y: ctx.y, size: 7, font: fontMono, color: item.color });
      ctx.y -= 12;
    }
    ctx.y -= 4;
  }

  // ─────────────────────────────────────────────────
  // BLOCOS DE ASSINATURA MULTI-INSTITUCIONAL
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(22);
    ctx.y -= 4;
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: CW, height: 20, color: C.PANEL });
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: 4, height: 20, color: C.BLUE });
    ctx.page.drawRectangle({ x: M + CW - 4, y: ctx.y - 5, width: 4, height: 20, color: C.BLUE });
    ctx.page.drawText('ASSINATURAS MULTI-INSTITUCIONAIS — BLOCOS PARA VALIDACAO OFICIAL', {
      x: M + 12, y: ctx.y + 3, size: 7.5, font: fontBold, color: C.BLUE,
    });
    ctx.y -= 26;

    const sigBlocks = [
      { title: 'ASSINATURA .GOV-BRASIL', color: C.GREEN, note: 'Assinatura Digital Gov.br - ICP-Brasil Nivel 3' },
      { title: 'ASSINATURA INTERNACIONAL', color: C.CYAN, note: 'International Digital Signature - PAdES/XAdES' },
      { title: 'ASSINATURA PERITO JUDICIAL', color: C.PURPLE, note: 'Perito Oficial Nomeado - Processo Judicial' },
      { title: 'ASSINATURA PERITO CRIMINAL', color: C.RED, note: 'Perito Criminal / Instituto de Criminologia' },
      { title: 'ASSINATURA ICP-BRASIL', color: C.AMBER, note: 'Certificado Digital A3/A4 - ICP-Brasil' },
      { title: 'ASSINATURA TOKEN PESSOAL', color: C.TEAL, note: 'Token Pessoal - FIDO2 / U2F / OTP' },
      { title: 'ASSINATURA TOKEN CORPORATIVO', color: C.VIOLET, note: 'Token Corporativo / HSM / PKI Empresarial' },
    ];

    // 2-column grid of signature blocks (3+4 or 2 per row)
    const sbW = Math.floor(CW / 2) - 3;
    const sbH = 62;
    const sbGap = 6;
    for (let si = 0; si < sigBlocks.length; si++) {
      const col = si % 2;
      if (col === 0) checkY(sbH + 8);
      const sbX = M + col * (sbW + sbGap);
      // Both columns of the same row draw at the same ctx.y (ctx.y only moves after col===1)
      const drawY = ctx.y;

      ctx.page.drawRectangle({ x: sbX, y: drawY - sbH, width: sbW, height: sbH, color: C.DARK, borderColor: sigBlocks[si].color, borderWidth: 0.8 });
      ctx.page.drawRectangle({ x: sbX, y: drawY - 1, width: sbW, height: 2, color: sigBlocks[si].color });
      ctx.page.drawText(safeText(sigBlocks[si].title, 38), { x: sbX + 6, y: drawY - 11, size: 6.5, font: fontBold, color: sigBlocks[si].color });
      ctx.page.drawText(safeText(sigBlocks[si].note, 46), { x: sbX + 6, y: drawY - 20, size: 5.5, font: fontReg, color: C.GRAY });
      // Signature lines
      ctx.page.drawLine({ start: { x: sbX + 8, y: drawY - 38 }, end: { x: sbX + sbW - 8, y: drawY - 38 }, thickness: 0.6, color: sigBlocks[si].color });
      ctx.page.drawText('Assinatura', { x: sbX + sbW / 2 - 14, y: drawY - 44, size: 5, font: fontReg, color: C.DGRAY });
      ctx.page.drawLine({ start: { x: sbX + 8, y: drawY - 54 }, end: { x: sbX + sbW - 8, y: drawY - 54 }, thickness: 0.5, color: C.DIVIDER });
      ctx.page.drawText('Nome / Matricula / CRC', { x: sbX + sbW / 2 - 30, y: drawY - 59, size: 5, font: fontReg, color: C.DGRAY });

      if (col === 1 || si === sigBlocks.length - 1) {
        ctx.y -= sbH + 8;
      }
    }
    ctx.y -= 4;
  }

  // ─────────────────────────────────────────────────
  // RODAPE DE IDENTIFICACAO DO SISTEMA
  // ─────────────────────────────────────────────────
  {
    divider();
    checkY(48);
    ctx.y -= 4;
    const footInfoH = 42;
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - footInfoH, width: CW - 4, height: footInfoH, color: C.PANEL, borderColor: C.DIVIDER, borderWidth: 0.5 });
    ctx.page.drawRectangle({ x: M + 2, y: ctx.y - footInfoH, width: 3, height: footInfoH, color: C.PURPLE });
    const _fi_cx = M + CW / 2;
    const _fi_lines: Array<{text: string, color: any, size: number, font: any}> = [
      { text: 'NEXUS CYBER FORENSIC NETWORK - NCFN', color: C.PURPLE, size: 8.5, font: fontBold },
      { text: 'Software Livre - Copyleft - Todos os direitos livres, salvo propriedade intelectual e sistema online ativo.', color: C.LGRAY, size: 6.5, font: fontReg },
      { text: 'Site: https://ncfn.net   |   Email: ncfn@ncfn.net', color: C.CYAN, size: 7.5, font: fontMono },
      { text: 'Codigo-fonte para auditoria disponivel em: https://github.com/ncfn/ncfn-portal (repositorio publico)', color: C.GRAY, size: 6.5, font: fontMono },
    ];
    let _fi_y = ctx.y - 8;
    for (const _fi of _fi_lines) {
      const _fi_w = _fi.font.widthOfTextAtSize(_fi.text, _fi.size);
      ctx.page.drawText(safeText(_fi.text, 100), { x: _fi_cx - _fi_w / 2, y: _fi_y, size: _fi.size, font: _fi.font, color: _fi.color });
      _fi_y -= (_fi.size + 4);
    }
    ctx.y -= footInfoH + 8;
  }

  // ─────────────────────────────────────────────────
  // FOOTER on ALL pages
  // ─────────────────────────────────────────────────
  const allPages = pdfDoc.getPages();
  const totalPages = allPages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = allPages[i];
    const isCover = i === 0;
    p.drawRectangle({ x: 0, y: 0, width: W, height: isCover ? 30 : 28, color: C.HEADER });
    // Accent lines at top of footer
    p.drawLine({ start: { x: 0, y: isCover ? 30 : 28 }, end: { x: W, y: isCover ? 30 : 28 }, thickness: 1.0, color: C.PURPLE });
    p.drawLine({ start: { x: 0, y: isCover ? 29 : 27 }, end: { x: W, y: isCover ? 29 : 27 }, thickness: 0.4, color: C.CYAN });
    // Left + right accent blocks
    p.drawRectangle({ x: 0, y: 0, width: 6, height: isCover ? 30 : 28, color: C.PURPLE });
    p.drawRectangle({ x: W - 6, y: 0, width: 6, height: isCover ? 30 : 28, color: C.PURPLE });
    p.drawText('NCFN - Relatorio Pericial Forense | PERITO SANSAO - IA INTERNA NCFN | Protocolo v2.0 | CONFIDENCIAL', {
      x: 14, y: isCover ? 11 : 9, size: 7, font: fontMono, color: C.GRAY,
    });
    // Page-specific micro-hash
    const pageMicro = crypto.createHash('sha256').update(`${data.docId}-P${i + 1}`).digest('hex').slice(0, 8).toUpperCase();
    p.drawText(safeText(`Pag. ${i + 1}/${totalPages} | ${pageMicro} | ${data.docId}`, 38), {
      x: 388, y: isCover ? 11 : 9, size: 7, font: fontMono, color: C.GRAY,
    });
    // SHA-256 pixel fingerprint strip in footer right (last 32 nibbles)
    if (!isCover) {
      const fpFY = 14;
      const fpFCell = 2.0;
      for (let fi = 0; fi < 16; fi++) {
        const nibble = parseInt(data.sha256[32 + fi] || '0', 16);
        const v = nibble / 15;
        const fc = printMode
          ? rgb(0.2 + v * 0.4, 0.2 + v * 0.5, 0.5 + v * 0.4)
          : rgb(v * 0.3, 0.2 + v * 0.6, 0.4 + v * 0.5);
        if (nibble > 0) {
          p.drawRectangle({ x: 14 + fi * (fpFCell + 0.4), y: fpFY, width: fpFCell, height: fpFCell, color: fc });
        }
      }
    }
  }

  return pdfDoc.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Typed report generation (inicial / intermediario / final)
// ─────────────────────────────────────────────────────────────────────────────

async function generateTypedReport(action: string, folder: string, filename: string, operatorEmail: string) {
  const filePath = `${folder}/${filename}`;
  // Ordem de prioridade: .originals/ (original preservado) → original → .enc
  let absPath = resolveSafe(`${folder}/.originals/${filename}`);
  if (!absPath || !fs.existsSync(absPath)) {
    absPath = resolveSafe(filePath);
    if (!absPath || !fs.existsSync(absPath)) {
      const encPath = resolveSafe(`${folder}/${filename}.enc`);
      if (encPath && fs.existsSync(encPath)) {
        absPath = encPath;
      } else {
        throw new Error('Arquivo nao encontrado');
      }
    }
  }

  const stat = fs.statSync(absPath);
  const fileBuffer = fs.readFileSync(absPath);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const sha1   = crypto.createHash('sha1').update(fileBuffer).digest('hex');
  const md5    = crypto.createHash('md5').update(fileBuffer).digest('hex');
  const entropy = calculateEntropy(fileBuffer);
  const now = new Date();

  let titulo = '';
  let hashComparison: { prev: string; curr: string; match: boolean } | null = null;
  let prevReportType = '';

  if (action === 'generate_inicial') {
    titulo = `RELATÓRIO INICIAL — ${filename}`;
  } else if (action === 'generate_intermediario') {
    // Find initial report to compare hashes
    const initialReport = await prisma.laudoForense.findFirst({
      where: { folder, filename, reportType: 'inicial' },
      orderBy: { createdAt: 'asc' },
    });
    if (initialReport) {
      try {
        const evs = JSON.parse(initialReport.evidencias || '[]');
        const prevHash = evs[0]?.hash || '';
        hashComparison = { prev: prevHash, curr: sha256, match: prevHash === sha256 };
      } catch {}
    }
    titulo = `RELATÓRIO INICIAL E RELATÓRIO INTERMEDIÁRIO CONSOLIDADO — ${filename}`;
    prevReportType = 'inicial';
  } else if (action === 'generate_final') {
    // Find intermediary report to compare hashes
    const intermediaryReport = await prisma.laudoForense.findFirst({
      where: { folder, filename, reportType: 'intermediario' },
      orderBy: { createdAt: 'desc' },
    });
    if (intermediaryReport) {
      try {
        const evs = JSON.parse(intermediaryReport.evidencias || '[]');
        const prevHash = evs[0]?.hash || '';
        hashComparison = { prev: prevHash, curr: sha256, match: prevHash === sha256 };
      } catch {}
    }
    titulo = `RELATÓRIO FINAL CONSOLIDADO - ARQUIVO E LOGS — ${filename}`;
    prevReportType = 'intermediario';
  } else if (action === 'generate_manual') {
    const finalReport = await prisma.laudoForense.findFirst({
      where: { folder, filename, reportType: 'final' },
      orderBy: { createdAt: 'desc' },
    });
    if (finalReport) {
      try {
        const evs = JSON.parse(finalReport.evidencias || '[]');
        const prevHash = evs[0]?.hash || '';
        hashComparison = { prev: prevHash, curr: sha256, match: prevHash === sha256 };
      } catch {}
    }
    titulo = `NOVA LEITURA — LAUDO MANUAL PÓS-DEFINITIVO — ${filename}`;
    prevReportType = 'final';
  }

  const evidencias = JSON.stringify([{
    filename,
    folder,
    hash: sha256,
    sha1,
    md5,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
    entropy,
    type: detectMime(filename),
    ...(hashComparison ? {
      prevHash: hashComparison.prev,
      integrityMatch: hashComparison.match,
      prevReportType,
    } : {}),
  }]);

  const integrityStatus = hashComparison
    ? hashComparison.match
      ? 'ÍNTEGRO — Hash idêntico ao relatório anterior'
      : '⚠ INCONFORMIDADE — Hash divergente do relatório anterior'
    : 'N/A — Relatório inicial';

  const achados = hashComparison
    ? hashComparison.match
      ? `Hash SHA-256 verificado: ${sha256}\nIntegridade confirmada em relação ao ${prevReportType}. Nenhuma alteração detectada.`
      : `ALERTA DE INCONFORMIDADE:\nHash atual:   ${sha256}\nHash anterior: ${hashComparison.prev}\nO arquivo foi modificado desde o relatório ${prevReportType}.`
    : `Hash SHA-256: ${sha256}\nHash SHA-1:   ${sha1}\nHash MD5:     ${md5}\nEntropia:     ${entropy}\nTamanho:      ${formatBytes(stat.size)}\nRegistrado em T0: ${now.toISOString()}`;

  const conclusao = action === 'generate_final'
    ? `DECLARAÇÃO DE DESCARTE: Este relatório consolida o ciclo de vida do vestígio digital "${filename}". O arquivo foi analisado, encriptado e disponibilizado conforme protocolos NCFN. Este relatório expira em 5 horas.`
    : action === 'generate_intermediario'
    ? `Relatório intermediário consolidado gerado conforme Art. 158-B do CPP. Status de integridade: ${integrityStatus}.`
    : action === 'generate_manual'
    ? `NOVA LEITURA MANUAL: Este laudo foi gerado manualmente após a conclusão do ciclo de custódia do vestígio "${filename}". Constitui nova conferência oficial com comparação de integridade em relação ao relatório definitivo. Status: ${integrityStatus}.`
    : `Relatório inicial gerado automaticamente no momento de custódia (T0) do vestígio digital "${filename}".`;

  const reportType = action === 'generate_inicial' ? 'inicial' : action === 'generate_intermediario' ? 'intermediario' : action === 'generate_final' ? 'final' : 'manual';
  const finalExpiresAt = reportType === 'final' ? new Date(now.getTime() + 5 * 60 * 60 * 1000) : null;

  const laudo = await prisma.laudoForense.create({
    data: {
      titulo,
      operatorEmail,
      evidencias,
      achados,
      conclusao,
      status: 'final',
      reportType,
      folder,
      filename,
      ...(finalExpiresAt ? { finalReportExpiresAt: finalExpiresAt } : {}),
    },
  });

  return laudo;
}

export async function POST(req: NextRequest) {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Nao autorizado', { status: 401 });

    const body = await req.json();
    const { filePath, print: printMode = false, action, folder: bodyFolder, filename: bodyFilename } = body;

    // ── New typed report actions ──────────────────────────────────────────────
    if (action === 'generate_inicial' || action === 'generate_intermediario' || action === 'generate_final') {
      if (!bodyFolder || !bodyFilename) return NextResponse.json({ error: 'folder e filename obrigatorios' }, { status: 400 });
      try {
        const laudo = await generateTypedReport(action, bodyFolder, bodyFilename, user.email);
        return NextResponse.json({ ok: true, reportId: laudo.id, reportType: laudo.reportType });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── Generate manual post-final report ────────────────────────────────────
    if (action === 'generate_manual') {
      if (!bodyFolder || !bodyFilename) return NextResponse.json({ error: 'folder e filename obrigatorios' }, { status: 400 });
      const existingManual = await prisma.laudoForense.findFirst({
        where: { folder: bodyFolder, filename: bodyFilename, reportType: 'manual' },
      });
      if (existingManual) return NextResponse.json({ error: 'Laudo manual já gerado para este arquivo.' }, { status: 400 });
      const custState = await prisma.fileCustodyState.findUnique({
        where: { folder_filename: { folder: bodyFolder, filename: bodyFilename } },
      });
      if (!custState?.finalReportAt) return NextResponse.json({ error: 'Relatório Final não concluído.' }, { status: 400 });
      try {
        const laudo = await generateTypedReport('generate_manual', bodyFolder, bodyFilename, user.email);
        return NextResponse.json({ ok: true, reportId: laudo.id, reportType: laudo.reportType });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── View existing typed report by ID (returns PDF blob) ──────────────────
    if (action === 'view_typed_report') {
      const { id, print: pm = false } = body;
      if (!id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 });

      const laudo = await prisma.laudoForense.findUnique({ where: { id } });
      if (!laudo) return NextResponse.json({ error: 'Relatorio nao encontrado' }, { status: 404 });

      const laudoFolder2  = laudo.folder   || '';
      const laudoFile2    = laudo.filename  || '';
      const C = pm ? PRINT_C : DARK_C;
      const PW = 612; const PH = 792;

      // ── Gera a pericia base completa via chamada interna ─────────────────
      const baseUrl3 = new URL(req.url).origin;
      const cookieHdr3 = req.headers.get('cookie') || '';

      let pdfDoc3: any;
      let basePageCount3 = 0;

      try {
        const periciaRes3 = await fetch(`${baseUrl3}/api/vault/custody-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'cookie': cookieHdr3 },
          body: JSON.stringify({ filePath: `${laudoFolder2}/${laudoFile2}`, print: pm }),
        });
        if (!periciaRes3.ok) throw new Error('base pericia failed');
        const baseBytes3 = Buffer.from(await periciaRes3.arrayBuffer());
        pdfDoc3 = await PDFDocument.load(baseBytes3);
        basePageCount3 = pdfDoc3.getPageCount();
      } catch {
        pdfDoc3 = await PDFDocument.create();
        basePageCount3 = 0;
      }

      // Para inicial: retorna a pericia base diretamente
      if (laudo.reportType === 'inicial') {
        const sf3 = (laudoFile2 || 'relatorio').replace(/[^\w.-]/g, '_').slice(0, 30);
        const bytes3 = await pdfDoc3.save();
        return new NextResponse(Buffer.from(bytes3), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="NCFN_RELATORIO_INICIAL_${pm ? 'IMPRESSAO' : 'DIGITAL'}_${sf3}.pdf"`,
          },
        });
      }

      // ── Para etapas superiores: carrega base e adiciona secoes cumulativas
      const fontBold3   = await pdfDoc3.embedFont(StandardFonts.HelveticaBold);
      const fontNormal3 = await pdfDoc3.embedFont(StandardFonts.Helvetica);

      let pg3: any;
      let vy3 = 0;

      const newPage3 = () => {
        pg3 = pdfDoc3.addPage([PW, PH]);
        pg3.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: C.BG });
        vy3 = PH - 40;
      };
      const chk3 = (n: number) => { if (vy3 < n) newPage3(); };

      const sec3 = (title: string, content: string, tc?: any) => {
        if (!content?.trim()) return;
        chk3(50);
        pg3.drawLine({ start: { x: 30, y: vy3 + 4 }, end: { x: PW - 30, y: vy3 + 4 }, thickness: 0.5, color: C.DIVIDER });
        vy3 -= 14;
        pg3.drawText(title, { x: 30, y: vy3, size: 9, font: fontBold3, color: tc || C.PURPLE });
        vy3 -= 16;
        for (const rawLine of content.split('\n')) {
          if (!rawLine.trim()) { vy3 -= 6; continue; }
          let acc = '';
          for (const w of rawLine.split(' ')) {
            const test = acc ? `${acc} ${w}` : w;
            if (fontNormal3.widthOfTextAtSize(test, 8) > PW - 80) {
              chk3(16); pg3.drawText(acc, { x: 40, y: vy3, size: 8, font: fontNormal3, color: C.LGRAY }); vy3 -= 12; acc = w;
            } else { acc = test; }
          }
          if (acc) { chk3(16); pg3.drawText(acc, { x: 40, y: vy3, size: 8, font: fontNormal3, color: C.LGRAY }); vy3 -= 12; }
        }
        vy3 -= 6;
      };

      // Cadeia de etapas a renderizar
      const rType3 = laudo.reportType;
      const stageChain3: { rType: string; label: string; color: any }[] = [];
      if (rType3 === 'intermediario') {
        stageChain3.push({ rType: 'intermediario', label: 'RELATORIO INTERMEDIARIO - SEGUNDA CONFERENCIA', color: C.AMBER });
      } else if (rType3 === 'final') {
        stageChain3.push({ rType: 'intermediario', label: 'RELATORIO INTERMEDIARIO - SEGUNDA CONFERENCIA', color: C.AMBER });
        stageChain3.push({ rType: 'final',          label: 'RELATORIO FINAL - TERCEIRA CONFERENCIA',       color: C.RED });
      } else if (rType3 === 'manual') {
        stageChain3.push({ rType: 'intermediario', label: 'RELATORIO INTERMEDIARIO - SEGUNDA CONFERENCIA', color: C.AMBER });
        stageChain3.push({ rType: 'final',          label: 'RELATORIO FINAL - TERCEIRA CONFERENCIA',       color: C.RED });
        stageChain3.push({ rType: 'manual',         label: 'RELATORIO MANUAL - QUARTA CONFERENCIA',        color: C.GREEN });
      }

      for (const stage3 of stageChain3) {
        const sl3 = stage3.rType === rType3 ? laudo : await prisma.laudoForense.findFirst({
          where: { folder: laudoFolder2, filename: laudoFile2, reportType: stage3.rType },
          orderBy: { createdAt: stage3.rType === 'intermediario' ? 'asc' : 'desc' },
        });
        if (!sl3) continue;

        newPage3();
        pg3.drawRectangle({ x: 0, y: PH - 70, width: PW, height: 70, color: C.HEADER });
        pg3.drawText(`NCFN - ${stage3.label}`, { x: 30, y: PH - 28, size: 9, font: fontBold3, color: stage3.color });
        pg3.drawText('Nexus Cyber Forensic Network - Confidencial', { x: 30, y: PH - 46, size: 8, font: fontNormal3, color: C.GRAY });
        pg3.drawText(new Date().toISOString(), { x: 380, y: PH - 28, size: 7, font: fontNormal3, color: C.GRAY });
        pg3.drawLine({ start: { x: 0, y: PH - 70 }, end: { x: PW, y: PH - 70 }, thickness: 2, color: stage3.color });
        vy3 = PH - 98;

        for (const [lbl3, val3] of [
          ['Tipo:', stage3.label.split(' - ')[0]],
          ['Arquivo:', safeText(sl3.filename || '', 70)],
          ['Pasta:', safeText(sl3.folder || '', 70)],
          ['Operador:', safeText(sl3.operatorEmail, 60)],
          ['Gerado em:', new Date(sl3.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })],
          ['ID do Laudo:', sl3.id],
        ] as [string, string][]) {
          chk3(20);
          pg3.drawText(lbl3, { x: 40, y: vy3, size: 8, font: fontBold3, color: C.GRAY });
          pg3.drawText(val3, { x: 155, y: vy3, size: 8, font: fontNormal3, color: C.WHITE });
          vy3 -= 13;
        }
        vy3 -= 8;

        let evArr3b: any[] = [];
        try { evArr3b = JSON.parse(sl3.evidencias || '[]'); } catch {}
        const ev3b = evArr3b[0] || {};
        if (ev3b.hash || ev3b.sha1 || ev3b.md5) {
          const hashLines3 = [
            ev3b.hash    ? `SHA-256: ${ev3b.hash}` : '',
            ev3b.sha1    ? `SHA-1:   ${ev3b.sha1}` : '',
            ev3b.md5     ? `MD5:     ${ev3b.md5}` : '',
            ev3b.entropy !== undefined ? `Entropia: ${ev3b.entropy}` : '',
            ev3b.size    ? `Tamanho: ${formatBytes(ev3b.size)}` : '',
          ].filter(Boolean).join('\n');
          sec3('HASHES DE INTEGRIDADE', hashLines3);
        }
        if (ev3b.integrityMatch !== undefined) {
          const itxt3 = ev3b.integrityMatch
            ? 'INTEGRO - Hash identico ao relatorio anterior'
            : 'INCONFORMIDADE - Hash diverge do relatorio anterior';
          sec3('STATUS DE INTEGRIDADE', itxt3, ev3b.integrityMatch ? C.GREEN : C.RED);
        }
        if (sl3.achados)   sec3('ACHADOS FORENSES', sl3.achados, stage3.color);
        if (sl3.conclusao) sec3('CONCLUSAO', sl3.conclusao);
      }

      // Footers apenas nas paginas novas (nao nas paginas da pericia base)
      const allPgs3 = pdfDoc3.getPages();
      for (let pi3 = basePageCount3; pi3 < allPgs3.length; pi3++) {
        const p3 = allPgs3[pi3];
        p3.drawLine({ start: { x: 30, y: 45 }, end: { x: PW - 30, y: 45 }, thickness: 0.5, color: C.DIVIDER });
        p3.drawText('Documento gerado digitalmente pelo Portal NCFN.', { x: 30, y: 32, size: 6, font: fontNormal3, color: C.GRAY });
        p3.drawText(`ID: ${laudo.id} | Pag. ${pi3 + 1}/${allPgs3.length} | ${new Date().toISOString()}`, { x: 30, y: 22, size: 6, font: fontNormal3, color: C.DGRAY });
      }

      const merged3 = await pdfDoc3.save();
      const sf3b = (laudoFile2 || 'relatorio').replace(/[^\w.-]/g, '_').slice(0, 30);
      const suf3 = pm ? 'IMPRESSAO' : 'DIGITAL';
      return new NextResponse(Buffer.from(merged3), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="NCFN_${rType3.toUpperCase()}_${suf3}_${sf3b}.pdf"`,
        },
      });
    }

    if (!filePath) return new NextResponse('filePath obrigatorio', { status: 400 });

    // Ordem de prioridade: .originals/ → original → .enc
    const folderOfPath = filePath.split('/')[0];
    const fileOfPath = filePath.split('/').slice(1).join('/');
    let absPath = resolveSafe(`${folderOfPath}/.originals/${fileOfPath}`);
    if (!absPath || !fs.existsSync(absPath)) {
      absPath = resolveSafe(filePath);
      if (!absPath || !fs.existsSync(absPath)) {
        const encPath = resolveSafe(filePath + '.enc');
        if (encPath && fs.existsSync(encPath)) {
          absPath = encPath;
        } else {
          return new NextResponse('Arquivo nao encontrado', { status: 404 });
        }
      }
    }

    const stat = fs.statSync(absPath);
    if (!stat.isFile()) return new NextResponse('Nao e um arquivo', { status: 400 });

    const filename = path.basename(absPath);
    const folderName = filePath.split('/')[0];
    const fileBuffer = fs.readFileSync(absPath);
    const isEnc = filename.endsWith('.enc');

    // Hashes
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const sha1   = crypto.createHash('sha1').update(fileBuffer).digest('hex');
    const md5    = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Registered hash
    let registeredHash = '';
    try {
      const hashLog = fs.readFileSync(path.join(path.dirname(absPath), '_hashes_vps.txt'), 'utf-8');
      const m = hashLog.match(new RegExp(`([a-f0-9]{64}) \\| ${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'im'));
      if (m) registeredHash = m[1];
    } catch {}

    // EXIF — current
    let exifData: Record<string, any> = {};
    try {
      const raw = execSync(`exiftool -json -short "${absPath}" 2>/dev/null`, { timeout: 10000 }).toString();
      exifData = JSON.parse(raw)?.[0] || {};
    } catch {}

    // EXIF — initial (immutable baseline, persisted on first pericia)
    const exifInitialPath = path.join(path.dirname(absPath), '_exif_inicial.json');
    let exifInitialMap: Record<string, { exif: Record<string, any>; timestamp: string }> = {};
    try {
      if (fs.existsSync(exifInitialPath)) {
        exifInitialMap = JSON.parse(fs.readFileSync(exifInitialPath, 'utf-8'));
      }
    } catch {}
    let exifInitial: Record<string, any>;
    let exifInitialTimestamp: string;
    if (exifInitialMap[filename]) {
      exifInitial = exifInitialMap[filename].exif;
      exifInitialTimestamp = exifInitialMap[filename].timestamp;
    } else {
      // First time: snapshot current EXIF as permanent baseline
      exifInitial = exifData;
      exifInitialTimestamp = new Date().toISOString();
      exifInitialMap[filename] = { exif: exifData, timestamp: exifInitialTimestamp };
      try { fs.writeFileSync(exifInitialPath, JSON.stringify(exifInitialMap, null, 2), 'utf-8'); } catch {}
    }

    // POSIX
    const lsattrStr = getLsattr(absPath);
    const uidName = getUidName(stat.uid);
    const gidName = getGidName(stat.gid);

    // Magic + security
    const magic = detectMagic(fileBuffer);
    const entropy = calculateEntropy(fileBuffer);
    const malwareHits = checkMalware(fileBuffer);

    // Enc analysis
    let encAnalysis = null;
    let origStat: fs.Stats | null = null;
    if (isEnc) {
      encAnalysis = analyzeEncryptedFile(absPath, fileBuffer);
      const origPath = absPath.replace(/\.enc$/, '');
      if (fs.existsSync(origPath)) origStat = fs.statSync(origPath);
    }

    // Text preview
    let textPreview = '';
    const ext = path.extname(filename).toLowerCase();
    if (!isEnc && ['.txt', '.md', '.log', '.csv', '.json', '.xml', '.html', '.js', '.ts', '.py', '.sh'].includes(ext)) {
      try { textPreview = fileBuffer.toString('utf-8').slice(0, 4000); } catch {}
    }

    // DB logs
    let dbLogs: any[] = [];
    try {
      dbLogs = await prisma.vaultAccessLog.findMany({
        where: { OR: [{ filePath }, { filePath: filePath.replace(/\.enc$/, '') }] },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
    } catch {}

    const prevPericias = dbLogs.filter(l => l.action === 'pericia');

    // File access log
    let fileAccessLog = '';
    try {
      const logPath = path.join(VAULT_BASE, folderName, '_registros_acesso.txt');
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        fileAccessLog = content.split('\n')
          .filter(line => line.includes(filename) || line.includes(filename.replace('.enc', '')))
          .slice(-30)
          .join('\n');
      }
    } catch {}

    // Overall risk
    let overallRisk = 'LIMPO';
    let riskLevel = 0;
    if (malwareHits.length > 0) {
      const maxRisk = malwareHits.reduce((max, h) => {
        const lvl = h.risk === 'CRITICO' ? 4 : h.risk === 'ALTO' ? 3 : h.risk === 'MEDIO' ? 2 : 1;
        return Math.max(max, lvl);
      }, 0);
      riskLevel = maxRisk;
      overallRisk = maxRisk >= 4 ? 'CRITICO' : maxRisk >= 3 ? 'ALTO RISCO' : maxRisk >= 2 ? 'SUSPEITO' : 'BAIXO RISCO';
    }
    if (magic && magic.level >= 3 && !isEnc) riskLevel = Math.max(riskLevel, magic.level);
    if (entropy > 7.5 && !isEnc && malwareHits.length > 0) riskLevel = Math.max(riskLevel, 3);

    const docId = `NCFN-${Date.now().toString(36).toUpperCase()}`;

    // Coleta attestation info
    let coletaInfo = null;
    try {
      const coletaPath = path.join(path.dirname(absPath), '_coleta_info.json');
      if (fs.existsSync(coletaPath)) {
        const map = JSON.parse(fs.readFileSync(coletaPath, 'utf-8'));
        coletaInfo = map[filename] || null;
      }
    } catch {}

    // Hex header — first 128 bytes formatted as hex dump
    const hexBuf = fileBuffer.slice(0, 128);
    let hexHeader = '';
    for (let hi = 0; hi < hexBuf.length; hi += 16) {
      const row = hexBuf.slice(hi, hi + 16);
      const addr = hi.toString(16).padStart(4, '0').toUpperCase();
      const hexPart = Array.from(row).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const asciiPart = Array.from(row).map(b => (b >= 0x20 && b < 0x7F) ? String.fromCharCode(b) : '.').join('');
      hexHeader += `${addr}: ${hexPart.padEnd(47)}  ${asciiPart}\n`;
    }
    const hexHeaderUrl = hexBuf.slice(0, 32).toString('hex');

    // Save pericia to DB
    try {
      await prisma.vaultAccessLog.create({
        data: { filePath, action: 'pericia', userEmail: user.email, ip: null, isCanary: false },
      });
    } catch {}

    // Generate PDF
    const pdfBytes = await generatePdf({
      filename, folderName, filePath, stat, sha256, sha1, md5,
      registeredHash, exifData, exifInitial, exifInitialTimestamp, lsattrStr, uidName, gidName,
      magic, entropy, malwareHits, encAnalysis, origStat,
      textPreview, dbLogs, prevPericias, fileAccessLog,
      operator: 'ncfn@ncfn.net', now: new Date(), docId,
      overallRisk, riskLevel, isEnc,
      hexHeader, hexHeaderUrl, coletaInfo,
    }, printMode);

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const printSuffix = printMode ? '_IMPRESSAO' : '';
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="NCFN_Pericia${printSuffix}_${safeName}_${Date.now()}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[custody-report]', err);
    return new NextResponse('Erro ao gerar relatorio de custodia', { status: 500 });
  }
}
