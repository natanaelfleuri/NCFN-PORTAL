// @ts-nocheck
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const execAsync = promisify(exec);

// ─── helpers ───────────────────────────────────────────────────────────────

function safeText(s: string | null | undefined, max = 85): string {
  if (!s) return 'N/A';
  return String(s).replace(/[\x00-\x1F\x7F]/g, ' ').slice(0, max);
}

async function getExifData(filePath: string): Promise<Record<string, string>> {
  try {
    const { stdout } = await execAsync(`exiftool -json "${filePath}" 2>/dev/null`);
    const arr = JSON.parse(stdout);
    return arr?.[0] || {};
  } catch { return {}; }
}

// ─── PDF multi-página ──────────────────────────────────────────────────────

async function generateRelatorio(cap: any, exif: Record<string, string>, sourceCode: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const W = 595, H = 842; // A4

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const PURPLE  = rgb(0.47, 0.05, 0.996);
  const DARK    = rgb(0.05, 0.05, 0.05);
  const GRAY    = rgb(0.45, 0.45, 0.45);
  const LGRAY   = rgb(0.92, 0.92, 0.92);
  const GREEN   = rgb(0.05, 0.55, 0.05);
  const RED     = rgb(0.75, 0.1, 0.1);
  const BLUE    = rgb(0.0, 0.25, 0.75);
  const DGRAY   = rgb(0.1, 0.1, 0.1);

  let page = pdfDoc.addPage([W, H]);
  let y = H - 50;

  // Adiciona nova página quando necessário
  function newPage() {
    page = pdfDoc.addPage([W, H]);
    y = H - 50;
  }
  function checkY(need = 30) {
    if (y < need + 50) newPage();
  }

  function text(t: string, x: number, sz: number, font: any, color: any) {
    checkY(sz + 4);
    page.drawText(safeText(t, 100), { x, y, size: sz, font, color });
    y -= (sz + 4);
  }
  function mono(t: string, x: number, sz = 7) {
    checkY(sz + 3);
    page.drawText(safeText(t, 95), { x, y, size: sz, font: fontMono, color: GRAY });
    y -= (sz + 3);
  }
  function section(title: string, num: string) {
    y -= 8;
    checkY(25);
    page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.5, color: LGRAY });
    y -= 14;
    page.drawText(title, { x: 40, y, size: 11, font: fontBold, color: PURPLE });
    y -= 16;
  }

  // ── CAPA ──────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 120, width: W, height: 120, color: DGRAY });
  page.drawText('PORTAL NCFN', { x: 40, y: H - 40, size: 22, font: fontBold, color: PURPLE });
  page.drawText('Nexus Cyber Forensic Network', { x: 40, y: H - 60, size: 10, font: fontReg, color: rgb(0.7, 0.7, 0.7) });
  page.drawText('RELATÓRIO PERICIAL DIGITAL — PERITO SANSÃO', { x: 40, y: H - 82, size: 12, font: fontBold, color: rgb(0.9, 0.9, 0.9) });
  page.drawText('Laudo Técnico de Captura Forense da Web com Atestado de Disponibilidade', { x: 40, y: H - 98, size: 8, font: fontReg, color: rgb(0.6, 0.6, 0.6) });
  page.drawText(`Gerado em: ${new Date().toISOString()}`, { x: 40, y: H - 112, size: 7, font: fontMono, color: rgb(0.5, 0.5, 0.5) });

  y = H - 140;

  // ID / Data / Operador
  text(`ID da Operação: ${cap.id}`, 40, 8, fontMono, DARK);
  text(`URL Alvo: ${cap.url}`, 40, 8, fontMono, DARK);
  text(`Data da Captura (UTC): ${new Date(cap.createdAt).toISOString()}`, 40, 8, fontMono, DARK);
  text(`Data da Captura (BRT): ${new Date(new Date(cap.createdAt).getTime() - 3*3600000).toISOString().replace('T',' ').slice(0,19)}`, 40, 8, fontMono, DARK);
  text(`Operador: ${cap.operatorEmail}`, 40, 8, fontReg, DARK);
  text(`Perfil de Captura: ${cap.profile?.toUpperCase() || 'N/A'}`, 40, 8, fontReg, DARK);

  // ── SEÇÃO 1: STATUS DE DISPONIBILIDADE ───────────────────────────────────
  section('1. STATUS DE DISPONIBILIDADE DO SITE', '1');

  const isOnline = cap.siteStatus > 0 && cap.siteStatus < 500;
  const statusLabel = isOnline ? '[OK] ONLINE' : '[FALHA] OFFLINE / INACESSIVEL';
  const statusColor = isOnline ? GREEN : RED;

  checkY(20);
  page.drawText(statusLabel, { x: 50, y, size: 14, font: fontBold, color: statusColor });
  y -= 18;
  text(`Código HTTP: ${cap.siteStatus || 0}`, 50, 9, fontReg, DARK);
  if (cap.pingMs >= 0) text(`Latência de Resposta: ${cap.pingMs}ms`, 50, 9, fontReg, DARK);
  text(`IP do Servidor: ${cap.serverIp || 'N/A'}`, 50, 9, fontReg, DARK);
  text(`Geolocalização: ${cap.serverLocation || 'N/A'}`, 50, 9, fontReg, DARK);

  // ── SEÇÃO 2: SSL/TLS ──────────────────────────────────────────────────────
  section('2. CERTIFICADO SSL/TLS', '2');
  text(`Emissor: ${cap.sslIssuer || 'N/A'}`, 50, 8, fontReg, DARK);
  text(`Validade: ${cap.sslExpiry || 'N/A'}`, 50, 8, fontReg, DARK);
  mono(`Fingerprint: ${cap.sslFingerprint || 'N/A'}`, 50);

  // ── SEÇÃO 3: WHOIS ────────────────────────────────────────────────────────
  section('3. ANÁLISE WHOIS', '3');
  const whoisLines = (cap.whoisData || 'Não disponível').split('\n').slice(0, 20);
  for (const ln of whoisLines) {
    if (ln.trim()) mono(ln.trim(), 50);
  }

  // ── SEÇÃO 4: WEB-CHECK ────────────────────────────────────────────────────
  section('4. ANÁLISE WEB-CHECK', '4');

  if (cap.webCheckData) {
    let wc: any = {};
    try { wc = JSON.parse(cap.webCheckData); } catch {}

    // Tech stack
    if (wc['tech-stack']?.technologies?.length > 0) {
      checkY(14);
      page.drawText('Tecnologias Detectadas:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      const techs = wc['tech-stack'].technologies.slice(0, 12).map((t: any) => t.name || String(t));
      for (const t of techs) mono(`  *${t}`, 55, 7);
    }

    // IP info
    if (wc['ip']) {
      checkY(14);
      page.drawText('Informações de IP:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      const ip = wc['ip'];
      if (ip.ip) mono(`  IP: ${ip.ip}`, 55);
      if (ip.org) mono(`  Organização: ${ip.org}`, 55);
      if (ip.country) mono(`  País: ${ip.country}`, 55);
      if (ip.city) mono(`  Cidade: ${ip.city}`, 55);
    }

    // DNS
    if (wc['dns']) {
      checkY(14);
      page.drawText('Registros DNS:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      const dns = wc['dns'];
      const keys = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'];
      for (const k of keys) {
        if (dns[k]?.length > 0) {
          const vals = dns[k].slice(0, 3).map((r: any) => r.address || r.exchange || r.value || String(r)).join(', ');
          mono(`  ${k}: ${vals}`, 55);
        }
      }
    }

    // Portas abertas
    if (wc['ports']?.openPorts?.length > 0) {
      checkY(14);
      page.drawText('Portas Abertas:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      mono(`  ${wc['ports'].openPorts.join(', ')}`, 55);
    }

    // Headers relevantes
    if (wc['headers']) {
      checkY(14);
      page.drawText('Headers HTTP Relevantes:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      const h = wc['headers'];
      const relevant = ['server','x-powered-by','content-security-policy','x-frame-options','strict-transport-security','x-content-type-options'];
      for (const k of relevant) {
        if (h[k]) mono(`  ${k}: ${String(h[k]).slice(0, 70)}`, 55);
      }
    }

    // Cookies
    if (wc['cookies']?.length > 0) {
      checkY(14);
      page.drawText('Cookies Identificados:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      for (const c of wc['cookies'].slice(0, 6)) {
        mono(`  *${(c.name || c).toString().slice(0, 60)} ${c.secure ? '[Secure]' : ''} ${c.httpOnly ? '[HttpOnly]' : ''}`, 55);
      }
    }

    // Robots.txt
    if (wc['robots-txt']?.content) {
      checkY(14);
      page.drawText('Robots.txt:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      const robotLines = wc['robots-txt'].content.split('\n').slice(0, 8);
      for (const rl of robotLines) {
        if (rl.trim()) mono(`  ${rl.trim()}`, 55);
      }
    }

    // Redirects
    if (wc['redirects']?.redirects?.length > 0) {
      checkY(14);
      page.drawText('Cadeia de Redirecionamentos:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      for (const r of wc['redirects'].redirects.slice(0, 5)) {
        mono(`  ${r.url || String(r)}`, 55);
      }
    }

    // Quality summary
    if (wc['quality-summary']) {
      checkY(14);
      page.drawText('Sumário de Qualidade:', { x: 50, y, size: 8, font: fontBold, color: DARK });
      y -= 12;
      const qs = wc['quality-summary'];
      if (qs.score !== undefined) mono(`  Score: ${qs.score}`, 55);
      if (qs.summary) mono(`  ${String(qs.summary).slice(0, 80)}`, 55);
    }
  } else {
    mono('Análise Web-Check não disponível para esta captura.', 50);
    mono('(Disponível para capturas do perfil Completa ou Deep)', 50);
  }

  // ── SEÇÃO 5: METADADOS DOS ARTEFATOS ──────────────────────────────────────
  section('5. METADADOS DOS ARTEFATOS', '5');

  if (Object.keys(exif).length > 0) {
    const exifFields = ['ImageWidth','ImageHeight','BitsPerSample','ColorComponents','FileSize','FileType','MIMEType','Software','CreateDate','ModifyDate'];
    checkY(14);
    page.drawText('Metadados da Screenshot (exiftool):', { x: 50, y, size: 8, font: fontBold, color: DARK });
    y -= 12;
    for (const k of exifFields) {
      if (exif[k]) mono(`  ${k}: ${String(exif[k]).slice(0, 70)}`, 55);
    }
  } else {
    mono('Metadados não disponíveis (screenshot não encontrada).', 50);
  }

  // ── SEÇÃO 6: CÓDIGO FONTE (AMOSTRA) ──────────────────────────────────────
  section('6. CÓDIGO FONTE — AMOSTRA DO DOM', '6');

  if (sourceCode) {
    const lines = sourceCode.replace(/\t/g, '  ').split('\n').slice(0, 60);
    for (const ln of lines) {
      mono(ln.slice(0, 90), 50, 6);
    }
    mono(`... [${sourceCode.length} caracteres totais]`, 50, 6);
  } else {
    mono('Código fonte não disponível.', 50);
  }

  // ── SEÇÃO 7: HASHES SHA-256 ───────────────────────────────────────────────
  section('7. HASHES SHA-256 DOS ARTEFATOS', '7');

  if (cap.hashScreenshot) {
    checkY(20);
    page.drawText('Screenshot PNG:', { x: 50, y, size: 8, font: fontBold, color: DARK }); y -= 12;
    mono(cap.hashScreenshot, 55);
  }
  if (cap.hashPdf) {
    checkY(20);
    page.drawText('PDF Renderizado:', { x: 50, y, size: 8, font: fontBold, color: DARK }); y -= 12;
    mono(cap.hashPdf, 55);
  }
  if (cap.hashHtml) {
    checkY(20);
    page.drawText('HTML/DOM Snapshot:', { x: 50, y, size: 8, font: fontBold, color: DARK }); y -= 12;
    mono(cap.hashHtml, 55);
  }

  // ── SEÇÃO 8: RFC 3161 ─────────────────────────────────────────────────────
  section('8. CARIMBO TEMPORAL RFC 3161', '8');
  mono(cap.rfcTimestamp || 'Não disponível', 50);

  // ── SEÇÃO 9: PRESERVAÇÃO DIGITAL ─────────────────────────────────────────
  section('9. PRESERVAÇÃO DIGITAL', '9');

  if (cap.waybackUrl) {
    checkY(20);
    page.drawText('Wayback Machine — Internet Archive:', { x: 50, y, size: 8, font: fontBold, color: DARK }); y -= 12;
    checkY(14);
    page.drawText(safeText(cap.waybackUrl, 85), { x: 55, y, size: 7, font: fontMono, color: BLUE }); y -= 12;
    mono('  Acesse o link acima para verificar a cópia arquivada da página.', 55);
  }

  if (cap.blockchainVerify || cap.blockchainTx) {
    checkY(20);
    page.drawText('Registro em Blockchain — OpenTimestamps (Bitcoin):', { x: 50, y, size: 8, font: fontBold, color: DARK }); y -= 13;
    const otsInfo = [
      ['Como funciona:', fontBold, DARK],
      ['O hash SHA-256 dos artefatos foi enviado a 3 calendários Bitcoin da rede OpenTimestamps', fontReg, GRAY],
      ['(alice.btc.calendar.opentimestamps.org, bob.btc.calendar.opentimestamps.org,', fontMono, GRAY],
      ['finney.calendar.eternitywall.com). Após aproximadamente 1 hora — tempo do próximo bloco', fontReg, GRAY],
      ['Bitcoin ser minerado — o hash fica ancorado permanentemente na blockchain, tornando-se', fontReg, GRAY],
      ['prova criptográfica imutável de existência na data e hora registradas.', fontReg, GRAY],
      ['', fontReg, GRAY],
      [`Hash registrado: ${cap.blockchainTx || 'N/A'}`, fontMono, GRAY],
      ['', fontReg, GRAY],
      ['Como verificar:', fontBold, DARK],
      ['  1. Acesse https://opentimestamps.org', fontMono, BLUE],
      ['  2. Carregue o arquivo hash.ots (disponível nos artefatos desta captura)', fontReg, GRAY],
      ['  3. O site exibirá o bloco Bitcoin e a data/hora exatos do registro', fontReg, GRAY],
      ['  4. Alternativa via CLI: ots verify hash.ots', fontMono, GRAY],
    ] as const;
    for (const [ln, font, color] of otsInfo) {
      if (!ln) { y -= 5; continue; }
      checkY(11);
      page.drawText(safeText(ln, 90), { x: 55, y, size: 7, font, color }); y -= 11;
    }
  }

  if (!cap.waybackUrl && !cap.blockchainVerify) {
    mono('Preservação digital não disponível para esta captura.', 50);
  }

  // ── SEÇÃO 10: FUNDAMENTO LEGAL ────────────────────────────────────────────
  section('10. FUNDAMENTO LEGAL', '10');
  text('Art. 7º, III da Lei nº 12.965/2014 (Marco Civil da Internet)', 50, 8, fontReg, DARK);
  text('Art. 10 da Lei nº 12.965/2014 — Responsabilidade pela guarda de registros', 50, 8, fontReg, DARK);
  text('Art. 159 do Código de Processo Penal — Perícia criminal digital', 50, 8, fontReg, DARK);
  text('Lei nº 14.155/2021 — Crimes contra dispositivos informáticos', 50, 8, fontReg, DARK);

  // ── SEÇÃO 11: CONCLUSÃO ───────────────────────────────────────────────────
  section('11. CONCLUSÃO', '11');

  const status = cap.siteStatus > 0 && cap.siteStatus < 500 ? 'ONLINE e acessível' : 'OFFLINE ou inacessível';
  const captureDate = new Date(cap.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  checkY(80);
  const conclusaoLines = [
    `O presente relatório atesta que o endereço eletrônico:`,
    `${cap.url}`,
    `encontrava-se ${status} no momento da captura forense realizada em`,
    `${captureDate} (horário de Brasília).`,
    '',
    `A integridade dos artefatos capturados é garantida pelos hashes SHA-256`,
    `registrados neste documento, pelo carimbo temporal RFC 3161 e pelo`,
    `registro em blockchain. A cópia preservada no Internet Archive (Wayback`,
    `Machine) e o registro em blockchain constituem prova adicional da`,
    `existência e conteúdo da página na data informada.`,
    '',
    `Este laudo foi gerado automaticamente pelo sistema Portal NCFN —`,
    `Nexus Cyber Forensic Network, sob responsabilidade do operador indicado.`,
  ];
  for (const ln of conclusaoLines) {
    checkY(12);
    page.drawText(safeText(ln, 90), { x: 50, y, size: 8, font: ln.startsWith(cap.url) ? fontMono : fontReg, color: DARK });
    y -= 12;
  }

  // QR Code na última página
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
    const verifyUrl = `${baseUrl}/verify?id=${cap.id}`;
    const qrBuffer = await QRCode.toBuffer(verifyUrl, { type: 'png', width: 90, margin: 1 });
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    y -= 10;
    checkY(110);
    page.drawImage(qrImage, { x: W - 130, y: y - 90, width: 90, height: 90 });
    page.drawText('Verificar autenticidade:', { x: W - 140, y: y - 96, size: 6, font: fontReg, color: GRAY });
    page.drawText(safeText(verifyUrl, 60), { x: W - 140, y: y - 106, size: 5, font: fontMono, color: PURPLE });
  } catch {}

  // Rodapé em todas as páginas
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const pg = pdfDoc.getPage(i);
    pg.drawRectangle({ x: 0, y: 0, width: W, height: 38, color: DGRAY });
    pg.drawText('Relatório Pericial Digital — Perito Sansão | Portal NCFN — Nexus Cyber Forensic Network', {
      x: 40, y: 24, size: 6, font: fontReg, color: rgb(0.5, 0.5, 0.5)
    });
    pg.drawText(`Página ${i + 1} de ${pageCount}  |  ID: ${cap.id}`, {
      x: 40, y: 13, size: 6, font: fontMono, color: rgb(0.4, 0.4, 0.4)
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ─── POST /api/capture/relatorio ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return new NextResponse('Não autorizado', { status: 401 });

  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return new NextResponse('Acesso restrito', { status: 403 });

  const body = await req.json();
  const { captureId } = body;
  if (!captureId) return new NextResponse('captureId obrigatório', { status: 400 });

  const cap = await prisma.webCapture.findUnique({ where: { id: captureId } });
  if (!cap) return new NextResponse('Captura não encontrada', { status: 404 });

  const captureDir = path.join(process.cwd(), '../COFRE_NCFN/capturas_web', captureId);

  // Exiftool na screenshot
  const screenshotPath = path.join(captureDir, 'screenshot.png');
  const exif = fs.existsSync(screenshotPath) ? await getExifData(screenshotPath) : {};

  // Amostra do código fonte
  let sourceCode = '';
  const htmlPath = path.join(captureDir, 'dom.html');
  if (fs.existsSync(htmlPath)) {
    sourceCode = (await fs.readFile(htmlPath, 'utf8')).slice(0, 4000);
  }

  const pdfBuffer = await generateRelatorio(cap, exif, sourceCode);

  // Salva também no diretório de captura
  const outPath = path.join(captureDir, 'relatorio_perito_sansao.pdf');
  await fs.writeFile(outPath, pdfBuffer).catch(() => {});

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio_perito_sansao_${captureId.slice(0, 8)}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
}
