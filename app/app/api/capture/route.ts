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

async function generateCertidao(data: {
  id: string; url: string; operatorEmail: string; createdAt: Date;
  serverIp: string; serverLocation: string; sslIssuer: string; sslExpiry: string; sslFingerprint: string;
  whoisData: string; httpHeaders: string; profile: string;
  hashScreenshot: string; hashPdf: string; hashHtml: string; rfcTimestamp: string;
  verifyUrl: string;
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

  let y = height - 50;

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.02, 0.02, 0.04) });
  page.drawText('PORTAL NCFN', { x: 40, y: height - 35, size: 18, font: fontBold, color: purple });
  page.drawText('Nexus Cyber Forensic Network', { x: 40, y: height - 52, size: 9, font: fontReg, color: rgb(0.7, 0.7, 0.7) });
  page.drawText('CERTIDÃO DE CAPTURA FORENSE DA WEB', { x: 40, y: height - 70, size: 8, font: fontBold, color: rgb(0.6, 0.6, 0.6) });

  y = height - 105;

  // ID e Data
  page.drawText(`ID da Operação: ${data.id}`, { x: 40, y, size: 8, font: fontMono, color: dark });
  y -= 14;
  page.drawText(`Data/Hora (UTC): ${data.createdAt.toISOString()}`, { x: 40, y, size: 8, font: fontMono, color: dark });
  y -= 14;
  page.drawText(`Data/Hora (BRT): ${new Date(data.createdAt.getTime() - 3*3600000).toISOString().replace('T', ' ').slice(0, 19)}`, { x: 40, y, size: 8, font: fontMono, color: dark });
  y -= 14;
  page.drawText(`Operador: ${data.operatorEmail}`, { x: 40, y, size: 8, font: fontMono, color: dark });
  y -= 14;
  page.drawText(`Perfil de Captura: ${data.profile.toUpperCase()}`, { x: 40, y, size: 8, font: fontMono, color: dark });

  y -= 20;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção: Alvo
  page.drawText('1. IDENTIFICAÇÃO DO ALVO', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  const urlLines = data.url.match(/.{1,80}/g) || [data.url];
  for (const line of urlLines) {
    page.drawText(line, { x: 50, y, size: 8, font: fontMono, color: dark });
    y -= 12;
  }
  y -= 5;
  page.drawText(`IP do Servidor: ${data.serverIp}`, { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  page.drawText(`Geolocalização: ${data.serverLocation}`, { x: 50, y, size: 8, font: fontReg, color: dark });

  y -= 20;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção: SSL
  page.drawText('2. CERTIFICADO SSL/TLS', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  page.drawText(`Emissor: ${data.sslIssuer.slice(0, 80)}`, { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  page.drawText(`Validade: ${data.sslExpiry}`, { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  page.drawText(`Fingerprint: ${data.sslFingerprint.slice(0, 80)}`, { x: 50, y, size: 8, font: fontMono, color: dark });

  y -= 20;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção: WHOIS resumido
  page.drawText('3. REGISTRO DE DOMÍNIO (WHOIS)', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  const whoisLines = data.whoisData.split('\n').slice(0, 12);
  for (const line of whoisLines) {
    if (line.trim()) {
      page.drawText(line.trim().slice(0, 85), { x: 50, y, size: 7, font: fontMono, color: gray });
      y -= 10;
    }
  }

  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção: Hashes
  page.drawText('4. HASHES SHA-256 DOS ARTEFATOS', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  if (data.hashScreenshot) {
    page.drawText('Screenshot PNG:', { x: 50, y, size: 8, font: fontBold, color: dark });
    y -= 11;
    page.drawText(data.hashScreenshot, { x: 55, y, size: 7, font: fontMono, color: rgb(0.1, 0.5, 0.1) });
    y -= 13;
  }
  if (data.hashPdf) {
    page.drawText('PDF Renderizado:', { x: 50, y, size: 8, font: fontBold, color: dark });
    y -= 11;
    page.drawText(data.hashPdf, { x: 55, y, size: 7, font: fontMono, color: rgb(0.1, 0.5, 0.1) });
    y -= 13;
  }
  if (data.hashHtml) {
    page.drawText('HTML/DOM Snapshot:', { x: 50, y, size: 8, font: fontBold, color: dark });
    y -= 11;
    page.drawText(data.hashHtml, { x: 55, y, size: 7, font: fontMono, color: rgb(0.1, 0.5, 0.1) });
    y -= 13;
  }

  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Seção: Carimbo Temporal
  page.drawText('5. CARIMBO TEMPORAL', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  page.drawText(data.rfcTimestamp || 'Não disponível', { x: 50, y, size: 8, font: fontMono, color: dark });

  y -= 20;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightGray });
  y -= 15;

  // Base Legal
  page.drawText('6. FUNDAMENTO LEGAL', { x: 40, y, size: 10, font: fontBold, color: purple });
  y -= 14;
  page.drawText('Art. 7º, III da Lei nº 12.965/2014 (Marco Civil da Internet)', { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  page.drawText('Art. 10 da Lei nº 12.965/2014 — Responsabilidade pela guarda de registros', { x: 50, y, size: 8, font: fontReg, color: dark });
  y -= 12;
  page.drawText('Art. 159 do Código de Processo Penal — Perícia criminal digital', { x: 50, y, size: 8, font: fontReg, color: dark });

  // QR Code de verificação
  try {
    const qrBuffer = await QRCode.toBuffer(data.verifyUrl, { type: 'png', width: 80, margin: 1 });
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    page.drawImage(qrImage, { x: width - 120, y: 50, width: 80, height: 80 });
    page.drawText('Verificar autenticidade', { x: width - 125, y: 38, size: 6, font: fontReg, color: gray });
  } catch {}

  // Rodapé
  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: rgb(0.02, 0.02, 0.04) });
  page.drawText('Certidão de Captura Forense — Portal NCFN | Nexus Cyber Forensic Network', {
    x: 40, y: 25, size: 7, font: fontReg, color: rgb(0.5, 0.5, 0.5)
  });
  page.drawText(`Verificar: ${data.verifyUrl}`, {
    x: 40, y: 13, size: 7, font: fontReg, color: purple
  });

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
      screenshotFile: true, certidaoPdf: true, createdAt: true, errorMessage: true
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

  // RATE LIMIT: 5 capturas por hora por admin
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

  // Diretório de saída
  const captureDir = path.join(process.cwd(), '../COFRE_NCFN/capturas_web', capture.id);
  await fs.ensureDir(captureDir);

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // ── 1. Informações do servidor (paralelo) ─────────────────────────────
    const [serverInfo, whoisData, sslInfo] = await Promise.all([
      getServerInfo(url),
      profile !== 'rapida' ? getWhois(hostname) : Promise.resolve(''),
      profile !== 'rapida' ? getSslInfo(hostname) : Promise.resolve({ issuer: 'N/A', expiry: 'N/A', fingerprint: 'N/A' }),
    ]);

    const serverIp = await resolveIp(hostname);
    const serverLocation = serverIp !== 'N/A' ? await getGeoIp(serverIp) : 'N/A';
    const httpHeaders = JSON.stringify(serverInfo.headers, null, 2);

    // ── 2. Captura com Playwright (via script Node inline) ─────────────────
    const playwrightScript = `
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    recordHar: ${profile !== 'rapida' ? `{ path: '${captureDir}/network.har' }` : 'undefined'},
  });
  const page = await ctx.newPage();

  await page.goto('${url.replace(/'/g, "\\'")}', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '${captureDir}/screenshot.png', fullPage: true });
  await page.pdf({ path: '${captureDir}/pagina.pdf', format: 'A4', printBackground: true });

  const html = await page.content();
  fs.writeFileSync('${captureDir}/dom.html', html);

  await ctx.close();
  await browser.close();
  console.log('OK');
})().catch(e => { console.error(e.message); process.exit(1); });
`;

    const scriptPath = path.join(captureDir, '_capture.js');
    await fs.writeFile(scriptPath, playwrightScript);

    let screenshotFile: string | null = null;
    let pdfFile: string | null = null;
    let htmlFile: string | null = null;
    let harFile: string | null = null;
    let hashScreenshot: string | null = null;
    let hashPdf: string | null = null;
    let hashHtml: string | null = null;

    try {
      await execAsync(`node ${scriptPath}`, { timeout: 60000, env: process.env });

      if (fs.existsSync(path.join(captureDir, 'screenshot.png'))) {
        screenshotFile = `capturas_web/${capture.id}/screenshot.png`;
        hashScreenshot = sha256(path.join(captureDir, 'screenshot.png'));
      }
      if (fs.existsSync(path.join(captureDir, 'pagina.pdf'))) {
        pdfFile = `capturas_web/${capture.id}/pagina.pdf`;
        hashPdf = sha256(path.join(captureDir, 'pagina.pdf'));
      }
      if (fs.existsSync(path.join(captureDir, 'dom.html'))) {
        htmlFile = `capturas_web/${capture.id}/dom.html`;
        hashHtml = sha256(path.join(captureDir, 'dom.html'));
      }
      if (fs.existsSync(path.join(captureDir, 'network.har'))) {
        harFile = `capturas_web/${capture.id}/network.har`;
      }
    } catch (e: any) {
      console.error('[CAPTURE] Playwright error:', e.message);
    }

    // ── 3. RFC 3161 Timestamp ──────────────────────────────────────────────
    const combinedHash = sha256Buffer(Buffer.from([hashScreenshot, hashPdf, hashHtml].filter(Boolean).join('')));
    const rfcTs = await rfcTimestamp(combinedHash, capture.id);

    // ── 4. Certidão PDF ────────────────────────────────────────────────────
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
    });

    const certidaoPath = path.join(captureDir, 'certidao_captura.pdf');
    await fs.writeFile(certidaoPath, certidaoBuffer);

    // ── 5. Atualiza registro no DB ─────────────────────────────────────────
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
        certidaoPdf: `capturas_web/${capture.id}/certidao_captura.pdf`,
        status: 'done',
      }
    });

    // Limpa script temporário
    await fs.remove(scriptPath).catch(() => {});

    return NextResponse.json({ ok: true, capture: updated });

  } catch (err: any) {
    await prisma.webCapture.update({
      where: { id: capture.id },
      data: { status: 'error', errorMessage: err.message?.slice(0, 500) }
    });
    return NextResponse.json({ error: 'Falha na captura forense', detail: err.message }, { status: 500 });
  }
}
