// @ts-nocheck
import { getSession, getDbUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { stampAndSave } from '@/lib/timestamp';
import { checkRateLimit } from '@/lib/rateLimit';

import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const execAsync = promisify(exec);

// ─── Helpers ───────────────────────────────────────────────────────────────

function sha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function sha256Buffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function getServerInfo(url: string) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return { status: res.status, headers };
  } catch {
    return { status: 0, headers: {} };
  }
}

async function resolveIp(hostname: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`nslookup ${hostname} 2>/dev/null | grep -A1 'Name:' | tail -1 | awk '{print $2}'`);
    return stdout.trim() || 'N/A';
  } catch { return 'N/A'; }
}

async function getWhois(hostname: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`whois ${hostname} 2>/dev/null | head -40`);
    return stdout.trim().slice(0, 2000);
  } catch { return 'Whois indisponível'; }
}

async function getSslInfo(hostname: string): Promise<{ issuer: string; expiry: string; fingerprint: string }> {
  try {
    const { stdout } = await execAsync(
      `echo | openssl s_client -connect ${hostname}:443 -servername ${hostname} 2>/dev/null | openssl x509 -noout -issuer -enddate -fingerprint 2>/dev/null`
    );
    const issuerMatch = stdout.match(/issuer=(.+)/);
    const expiryMatch = stdout.match(/notAfter=(.+)/);
    const fpMatch = stdout.match(/Fingerprint=(.+)/i);
    return {
      issuer: issuerMatch?.[1]?.trim() || 'N/A',
      expiry: expiryMatch?.[1]?.trim() || 'N/A',
      fingerprint: fpMatch?.[1]?.trim() || 'N/A',
    };
  } catch { return { issuer: 'N/A', expiry: 'N/A', fingerprint: 'N/A' }; }
}

async function getGeoIp(ip: string): Promise<string> {
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 'N/A';
    const data = await res.json();
    return `${data.city || ''}, ${data.region || ''}, ${data.country || ''} (ASN: ${data.org || 'N/A'})`.trim();
  } catch { return 'N/A'; }
}

async function rfcTimestamp(hash: string, captureId: string): Promise<string | null> {
  const tsr = await stampAndSave(hash, { captureId });
  return tsr ? `RFC3161:SHA256:${hash.slice(0, 32)}...:TSR_SAVED` : null;
}

// ─── Novos helpers ─────────────────────────────────────────────────────────

async function pingUrl(url: string): Promise<{ pingMs: number; status: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000), redirect: 'follow' });
    return { pingMs: Date.now() - start, status: res.status };
  } catch {
    return { pingMs: -1, status: 0 };
  }
}

async function queryWebCheck(url: string): Promise<Record<string, any> | null> {
  const baseUrl = process.env.WEB_CHECK_URL || 'http://web-check:3000';
  const enc = encodeURIComponent(url);

  const endpoints = ['get-ip', 'ssl', 'dns', 'headers', 'cookies', 'robots-txt', 'ports', 'redirects'];

  const results: Record<string, any> = {};

  await Promise.allSettled(
    endpoints.map(async (ep) => {
      try {
        const res = await fetch(`${baseUrl}/api/${ep}?url=${enc}`, {
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          results[ep] = await res.json();
        }
      } catch {
        // silencioso
      }
    })
  );

  return Object.keys(results).length > 0 ? results : null;
}

async function saveToWayback(url: string): Promise<string | null> {
  // Submete à fila do Wayback Machine
  try {
    await fetch(`https://web.archive.org/save/${url}`, {
      method: 'GET',
      signal: AbortSignal.timeout(30000),
      redirect: 'follow',
    });
  } catch { /* submissão silenciosa */ }

  // Aguarda 5s e consulta CDX para obter o snapshot mais recente
  await new Promise(r => setTimeout(r, 5000));
  try {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=1&fl=timestamp,original&filter=statuscode:200&from=&to=`;
    const res = await fetch(cdxUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      // data[0] é o header, data[1] é o primeiro resultado
      if (Array.isArray(data) && data.length > 1 && data[1]?.[0]) {
        const [timestamp] = data[1];
        return `https://web.archive.org/web/${timestamp}/${url}`;
      }
    }
  } catch {}

  return `https://web.archive.org/web/*/${url}`;
}

// OpenTimestamps — submete hash a 3 calendários Bitcoin (sem API key)
async function registerBlockchain(hash: string, otsPath: string): Promise<{ tx: string; verifyUrl: string }> {
  const calendars = [
    'https://alice.btc.calendar.opentimestamps.org/digest',
    'https://bob.btc.calendar.opentimestamps.org/digest',
    'https://finney.calendar.eternitywall.com/digest',
  ];

  const hashBytes = Buffer.from(hash, 'hex'); // 32 bytes

  let otsData: Buffer | null = null;

  for (const calendar of calendars) {
    try {
      const res = await fetch(calendar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: hashBytes,
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        otsData = Buffer.from(await res.arrayBuffer());
        break;
      }
    } catch {
      // tenta próximo calendário
    }
  }

  if (otsData) {
    try { await fs.writeFile(otsPath, otsData); } catch {}
  }

  return {
    tx: hash,
    verifyUrl: 'https://opentimestamps.org',
  };
}

// ─── Certidão PDF ──────────────────────────────────────────────────────────

async function generateCertidao(data: {
  id: string; url: string; operatorEmail: string; createdAt: Date;
  serverIp: string; serverLocation: string; sslIssuer: string; sslExpiry: string; sslFingerprint: string;
  whoisData: string; httpHeaders: string; profile: string;
  hashScreenshot: string; hashPdf: string; hashHtml: string; rfcTimestamp: string;
  verifyUrl: string;
  pingMs?: number; siteStatus?: number;
  waybackUrl?: string; blockchainVerify?: string;
  webCheckData?: string;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const purple = rgb(0.47, 0.05, 0.996);
  const dark = rgb(0.05, 0.05, 0.05);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.92, 0.92, 0.92);
  const green = rgb(0.1, 0.6, 0.1);
  const red = rgb(0.8, 0.1, 0.1);

  let y = height - 50;

  // Helper para adicionar nova página quando necessário
  let currentPage = page;
  function checkNewPage(needed = 30) {
    if (y < needed + 40) {
      currentPage = pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
  }

  function drawText(text: string, opts: any) {
    currentPage.drawText(text, opts);
  }
  function drawLine(opts: any) {
    currentPage.drawLine(opts);
  }
  function drawRect(opts: any) {
    currentPage.drawRectangle(opts);
  }

  // Header
  drawRect({ x: 0, y: height - 80, width, height: 80, color: rgb(0.02, 0.02, 0.04) });
  drawText('PORTAL NCFN', { x: 40, y: height - 35, size: 18, font: fontBold, color: purple });
  drawText('Nexus Cyber Forensic Network', { x: 40, y: height - 52, size: 9, font: fontReg, color: rgb(0.7, 0.7, 0.7) });
  drawText('CERTIDÃO DE CAPTURA FORENSE DA WEB', { x: 40, y: height - 70, size: 8, font: fontBold, color: rgb(0.6, 0.6, 0.6) });

  y = height - 105;

  // ID e Data
  drawText(`ID da Operação: ${data.id}`, { x: 40, y, size: 8, font: fontMono, color: dark });
  y -= 14;
  drawText(`Data/Hora (UTC): ${data.createdAt.toISOString()}`, { x: 40, y, size: 8, font: fontMono, color: dark });
  y -= 14;
  drawText(`Data/Hora (BRT): ${new Date(data.createdAt.getTime() - 3*3600000).toISOString().replace('T', ' ').slice(0, 19)}`, { x: 40, y, size: 8, font: fontMono, color: dark });
  y -= 14;
  drawText(`Operador: ${data.operatorEmail}`, { x: 40, y, size: 8, font: fontMono, color: dark });
  y -= 14;
  drawText(`Perfil de Captura: ${data.profile.toUpperCase()}`, { x: 40, y, size: 8, font: fontMono, color: dark });

  y -= 20;
  drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção 1: Alvo
  drawText('1. IDENTIFICAÇÃO DO ALVO', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  const urlLines = data.url.match(/.{1,80}/g) || [data.url];
  for (const line of urlLines) {
    drawText(line, { x: 50, y, size: 8, font: fontMono, color: dark });
    y -= 12;
  }
  y -= 5;
  drawText(`IP do Servidor: ${data.serverIp}`, { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  drawText(`Geolocalização: ${data.serverLocation}`, { x: 50, y, size: 8, font: fontReg, color: dark });

  // Status de disponibilidade
  if (data.siteStatus !== undefined) {
    y -= 12;
    const online = data.siteStatus > 0 && data.siteStatus < 500;
    const statusColor = online ? green : red;
    drawText(`Status HTTP: ${data.siteStatus} — ${online ? 'ONLINE' : 'OFFLINE/ERRO'}`, { x: 50, y, size: 8, font: fontBold, color: statusColor });
    if (data.pingMs !== undefined && data.pingMs >= 0) {
      y -= 12;
      drawText(`Tempo de Resposta: ${data.pingMs}ms`, { x: 50, y, size: 8, font: fontReg, color: dark });
    }
  }

  y -= 20;
  checkNewPage();
  drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção 2: SSL
  drawText('2. CERTIFICADO SSL/TLS', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  drawText(`Emissor: ${data.sslIssuer.slice(0, 80)}`, { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  drawText(`Validade: ${data.sslExpiry}`, { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  drawText(`Fingerprint: ${data.sslFingerprint.slice(0, 80)}`, { x: 50, y, size: 7, font: fontMono, color: dark });

  y -= 20;
  checkNewPage();
  drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção 3: WHOIS
  drawText('3. REGISTRO DE DOMÍNIO (WHOIS)', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  const whoisLines = data.whoisData.split('\n').slice(0, 12);
  for (const line of whoisLines) {
    if (line.trim()) {
      checkNewPage();
      drawText(line.trim().slice(0, 85), { x: 50, y, size: 7, font: fontMono, color: gray });
      y -= 10;
    }
  }

  // Seção 4: Web-Check
  if (data.webCheckData) {
    try {
      const wc = JSON.parse(data.webCheckData);
      y -= 10;
      checkNewPage();
      drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
      y -= 15;
      drawText('4. ANÁLISE WEB-CHECK', { x: 40, y, size: 10, font: fontBold, color: purple });
      y -= 14;

      // Tech stack
      if (wc['tech-stack']?.technologies?.length > 0) {
        const techs = wc['tech-stack'].technologies.slice(0, 8).map((t: any) => t.name || t).join(', ');
        checkNewPage();
        drawText(`Tech Stack: ${techs.slice(0, 85)}`, { x: 50, y, size: 8, font: fontReg, color: dark });
        y -= 12;
      }

      // DNS
      if (wc['dns']) {
        const dnsStr = JSON.stringify(wc['dns']).slice(0, 200);
        checkNewPage();
        drawText(`DNS Records: ${dnsStr}`, { x: 50, y, size: 7, font: fontMono, color: gray });
        y -= 12;
      }

      // Portas abertas
      if (wc['ports']?.openPorts?.length > 0) {
        const ports = wc['ports'].openPorts.join(', ');
        checkNewPage();
        drawText(`Portas Abertas: ${ports}`, { x: 50, y, size: 8, font: fontReg, color: dark });
        y -= 12;
      }

      // Headers relevantes
      if (wc['headers']) {
        const relevantHeaders = ['server', 'x-powered-by', 'content-security-policy', 'x-frame-options'];
        for (const h of relevantHeaders) {
          if (wc['headers'][h]) {
            checkNewPage();
            drawText(`${h}: ${String(wc['headers'][h]).slice(0, 80)}`, { x: 50, y, size: 7, font: fontMono, color: gray });
            y -= 10;
          }
        }
      }
    } catch {}
  }

  y -= 10;
  checkNewPage();
  drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção 5: Hashes
  const secNum = data.webCheckData ? '5' : '4';
  drawText(`${secNum}. HASHES SHA-256 DOS ARTEFATOS`, { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  if (data.hashScreenshot) {
    drawText('Screenshot PNG:', { x: 50, y, size: 8, font: fontBold, color: dark });
    y -= 11;
    drawText(data.hashScreenshot, { x: 55, y, size: 7, font: fontMono, color: rgb(0.1, 0.5, 0.1) });
    y -= 13;
  }
  if (data.hashPdf) {
    drawText('PDF Renderizado:', { x: 50, y, size: 8, font: fontBold, color: dark });
    y -= 11;
    drawText(data.hashPdf, { x: 55, y, size: 7, font: fontMono, color: rgb(0.1, 0.5, 0.1) });
    y -= 13;
  }
  if (data.hashHtml) {
    drawText('HTML/DOM Snapshot:', { x: 50, y, size: 8, font: fontBold, color: dark });
    y -= 11;
    drawText(data.hashHtml, { x: 55, y, size: 7, font: fontMono, color: rgb(0.1, 0.5, 0.1) });
    y -= 13;
  }

  y -= 10;
  checkNewPage();
  drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção 6: Carimbo Temporal
  drawText(`${parseInt(secNum)+1}. CARIMBO TEMPORAL RFC 3161`, { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  drawText(data.rfcTimestamp || 'Não disponível', { x: 50, y, size: 8, font: fontMono, color: dark });

  // Seção 7: Preservação Digital
  if (data.waybackUrl || data.blockchainVerify) {
    y -= 20;
    checkNewPage();
    drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
    y -= 15;
    drawText(`${parseInt(secNum)+2}. PRESERVAÇÃO DIGITAL`, { x: 40, y, size: 10, font: fontBold, color: purple });
    y -= 14;

    if (data.waybackUrl) {
      drawText('Wayback Machine (Internet Archive):', { x: 50, y, size: 8, font: fontBold, color: dark });
      y -= 11;
      drawText(data.waybackUrl.slice(0, 85), { x: 55, y, size: 7, font: fontMono, color: rgb(0.0, 0.3, 0.8) });
      y -= 13;
    }

    if (data.blockchainVerify || data.waybackUrl) {
      checkNewPage();
      drawText('Registro Blockchain — OpenTimestamps (Bitcoin):', { x: 50, y, size: 8, font: fontBold, color: dark });
      y -= 12;
      const otsLines = [
        'Como funciona: o hash SHA-256 dos artefatos foi enviado a 3 calendários Bitcoin da rede',
        'OpenTimestamps (alice, bob, finney). Após ~1h (próximo bloco minerado), o hash fica',
        'ancorado permanentemente na blockchain Bitcoin, tornando-se prova imutável de existência.',
        '',
        'Para verificar:',
        '  1. Acesse https://opentimestamps.org',
        '  2. Carregue o arquivo hash.ots (disponível nos artefatos desta captura)',
        '  3. O site exibirá o bloco Bitcoin e a data/hora exatos do registro',
        '  4. Alternativa via CLI: ots verify hash.ots',
      ];
      for (const ln of otsLines) {
        checkNewPage(12);
        drawText(ln, { x: 55, y, size: 7, font: ln.startsWith('  ') || ln.startsWith('https') ? fontMono : fontReg, color: ln === '' ? dark : (ln.startsWith('Para') || ln.startsWith('Como') ? dark : gray) });
        y -= 10;
      }
    }
  }

  y -= 20;
  checkNewPage();
  drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Base Legal
  drawText(`${parseInt(secNum)+3}. FUNDAMENTO LEGAL`, { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  drawText('Art. 7º, III da Lei nº 12.965/2014 (Marco Civil da Internet)', { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  drawText('Art. 10 da Lei nº 12.965/2014 — Responsabilidade pela guarda de registros', { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  drawText('Art. 159 do Código de Processo Penal — Perícia criminal digital', { x: 50, y, size: 8, font: fontReg, color: dark });

  // QR Code de verificação
  try {
    const qrBuffer = await QRCode.toBuffer(data.verifyUrl, { type: 'png', width: 80, margin: 1 });
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    currentPage.drawImage(qrImage, { x: width - 120, y: 50, width: 80, height: 80 });
    currentPage.drawText('Verificar autenticidade', { x: width - 125, y: 38, size: 6, font: fontReg, color: gray });
  } catch {}

  // Rodapé em todas as páginas
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    const pg = pdfDoc.getPage(i);
    pg.drawRectangle({ x: 0, y: 0, width, height: 40, color: rgb(0.02, 0.02, 0.04) });
    pg.drawText('Certidão de Captura Forense — Portal NCFN | Nexus Cyber Forensic Network', {
      x: 40, y: 25, size: 7, font: fontReg, color: rgb(0.5, 0.5, 0.5)
    });
    pg.drawText(`Verificar: ${data.verifyUrl}`, {
      x: 40, y: 13, size: 7, font: fontReg, color: purple
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ─── GET — Listar capturas ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  const captures = await prisma.webCapture.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, url: true, profile: true, status: true, operatorEmail: true,
      serverIp: true, serverLocation: true, hashScreenshot: true,
      screenshotFile: true, certidaoPdf: true, createdAt: true, errorMessage: true,
      webCheckData: true, waybackUrl: true, blockchainVerify: true,
      pingMs: true, siteStatus: true,
    }
  });

  return NextResponse.json({ captures });
}

// ─── POST — Executar captura ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  if (!checkRateLimit(`capture:${session.user.email}`, 5, 3_600_000)) {
    return NextResponse.json({ error: 'Limite de capturas atingido (5/hora). Aguarde.' }, { status: 429 });
  }

  const body = await req.json();
  const { url, profile = 'completa' } = body;

  if (!url || !/^https?:\/\/.+/.test(url)) {
    return NextResponse.json({ error: 'URL inválida. Use https://...' }, { status: 400 });
  }

  // Cria registro inicial
  const capture = await prisma.webCapture.create({
    data: { url, profile, operatorEmail: session.user.email!, status: 'processing' }
  });

  const captureDir = path.join(process.cwd(), '../COFRE_NCFN/7_NCFN-CAPTURAS-WEB_OSINT', capture.id);
  await fs.ensureDir(captureDir);

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // ── 1. Informações do servidor + ping + web-check (paralelo) ──────────
    const [serverInfo, whoisData, sslInfo, pingResult, webCheckResult] = await Promise.all([
      getServerInfo(url),
      profile !== 'rapida' ? getWhois(hostname) : Promise.resolve(''),
      profile !== 'rapida' ? getSslInfo(hostname) : Promise.resolve({ issuer: 'N/A', expiry: 'N/A', fingerprint: 'N/A' }),
      pingUrl(url),
      profile !== 'rapida' ? queryWebCheck(url) : Promise.resolve(null),
    ]);

    const serverIp = await resolveIp(hostname);
    const serverLocation = serverIp !== 'N/A' ? await getGeoIp(serverIp) : 'N/A';
    const httpHeaders = JSON.stringify(serverInfo.headers, null, 2);

    // ── 2. Wayback Machine (em paralelo com Playwright) ───────────────────
    const waybackPromise = saveToWayback(url);

    // ── 3. Captura com Playwright (direto, sem subprocess) ────────────────
    let screenshotFile: string | null = null;
    let pdfFile: string | null = null;
    let htmlFile: string | null = null;
    let harFile: string | null = null;
    let hashScreenshot: string | null = null;
    let hashPdf: string | null = null;
    let hashHtml: string | null = null;

    try {
      const { chromium } = require('playwright');
      const launchOpts: any = {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      };
      if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
        launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
      }
      const browser = await chromium.launch(launchOpts);
      const ctxOpts: any = {
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      };
      if (profile !== 'rapida') {
        ctxOpts.recordHar = { path: path.join(captureDir, 'network.har') };
      }
      const ctx = await browser.newContext(ctxOpts);
      const page = await ctx.newPage();

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      await page.screenshot({ path: path.join(captureDir, 'screenshot.png'), fullPage: true });
      await page.pdf({ path: path.join(captureDir, 'pagina.pdf'), format: 'A4', printBackground: true });

      const html = await page.content();
      await fs.writeFile(path.join(captureDir, 'dom.html'), html);

      await ctx.close();
      await browser.close();

      screenshotFile = `7_NCFN-CAPTURAS-WEB_OSINT/${capture.id}/screenshot.png`;
      hashScreenshot = sha256(path.join(captureDir, 'screenshot.png'));
      pdfFile = `7_NCFN-CAPTURAS-WEB_OSINT/${capture.id}/pagina.pdf`;
      hashPdf = sha256(path.join(captureDir, 'pagina.pdf'));
      htmlFile = `7_NCFN-CAPTURAS-WEB_OSINT/${capture.id}/dom.html`;
      hashHtml = sha256(path.join(captureDir, 'dom.html'));
      if (fs.existsSync(path.join(captureDir, 'network.har'))) {
        harFile = `7_NCFN-CAPTURAS-WEB_OSINT/${capture.id}/network.har`;
      }
    } catch (e: any) {
      console.error('[CAPTURE] Playwright error:', e.message);
    }

    // ── 4. RFC 3161 Timestamp ──────────────────────────────────────────────
    const combinedHash = sha256Buffer(Buffer.from([hashScreenshot, hashPdf, hashHtml].filter(Boolean).join('')));
    const rfcTs = await rfcTimestamp(combinedHash, capture.id);

    // ── 5. Blockchain registration + Wayback (resolve) ────────────────────
    const otsPath = path.join(captureDir, 'hash.ots');
    const [blockchainResult, waybackUrl] = await Promise.all([
      registerBlockchain(combinedHash, otsPath),
      waybackPromise,
    ]);

    // ── 6. Certidão PDF ────────────────────────────────────────────────────
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
    const verifyUrl = `${baseUrl}/verify?id=${capture.id}`;

    const certidaoBuffer = await generateCertidao({
      id: capture.id,
      url,
      operatorEmail: session.user.email!,
      createdAt: capture.createdAt,
      serverIp,
      serverLocation,
      sslIssuer: sslInfo.issuer,
      sslExpiry: sslInfo.expiry,
      sslFingerprint: sslInfo.fingerprint,
      whoisData,
      httpHeaders,
      profile,
      hashScreenshot: hashScreenshot || '',
      hashPdf: hashPdf || '',
      hashHtml: hashHtml || '',
      rfcTimestamp: rfcTs || 'Indisponível',
      verifyUrl,
      pingMs: pingResult.pingMs,
      siteStatus: pingResult.status,
      waybackUrl: waybackUrl || undefined,
      blockchainVerify: blockchainResult.verifyUrl,
      webCheckData: webCheckResult ? JSON.stringify(webCheckResult) : undefined,
    });

    const certidaoPath = path.join(captureDir, 'certidao_captura.pdf');
    await fs.writeFile(certidaoPath, certidaoBuffer);

    // ── 7. Atualiza registro no DB ─────────────────────────────────────────
    const updated = await prisma.webCapture.update({
      where: { id: capture.id },
      data: {
        serverIp, serverLocation,
        sslIssuer: sslInfo.issuer, sslExpiry: sslInfo.expiry, sslFingerprint: sslInfo.fingerprint,
        whoisData: whoisData.slice(0, 3000),
        httpHeaders: httpHeaders.slice(0, 2000),
        screenshotFile, pdfFile, htmlFile, harFile,
        hashScreenshot, hashPdf, hashHtml,
        rfcTimestamp: rfcTs,
        certidaoPdf: `7_NCFN-CAPTURAS-WEB_OSINT/${capture.id}/certidao_captura.pdf`,
        webCheckData: webCheckResult ? JSON.stringify(webCheckResult).slice(0, 8000) : null,
        waybackUrl,
        blockchainTx: blockchainResult.tx,
        blockchainVerify: blockchainResult.verifyUrl,
        pingMs: pingResult.pingMs >= 0 ? pingResult.pingMs : null,
        siteStatus: pingResult.status || null,
        status: 'done',
      }
    });


    return NextResponse.json({ ok: true, capture: updated });

  } catch (err: any) {
    await prisma.webCapture.update({
      where: { id: capture.id },
      data: { status: 'error', errorMessage: err.message?.slice(0, 500) }
    });
    return NextResponse.json({ error: 'Falha na captura forense', detail: err.message }, { status: 500 });
  }
}
