// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createHash, createCipheriv, randomBytes } from 'crypto';
import { readFileSync, existsSync, statSync, appendFileSync } from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

const VAULT_DIR = '/arquivos';

function sanitizePath(folder: string, filename: string): string {
  const safeFolder = folder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-]/g, '');
  const safeFile = path.basename(filename);
  return path.join(VAULT_DIR, safeFolder, safeFile);
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'IP_DESCONHECIDO'
  );
}

async function buildForensicPdf(p: {
  filename: string; folder: string; size: number; mtime: Date;
  sha256: string; md5: string; sha1: string;
  operator: string; ip: string; downloadTime: Date;
  encFilename: string; aesKey: string; aesIv: string; encSha256: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const W = 595, H = 842;

  const fMono = await doc.embedFont(StandardFonts.Courier);
  const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fReg  = await doc.embedFont(StandardFonts.Helvetica);

  const C = { // colors
    bg:     rgb(0.04, 0.04, 0.08),
    band:   rgb(0.02, 0.02, 0.06),
    purple: rgb(0.74, 0.07, 0.99),
    cyan:   rgb(0.00, 0.95, 1.00),
    white:  rgb(0.95, 0.95, 0.95),
    gray:   rgb(0.55, 0.55, 0.60),
    lgray:  rgb(0.30, 0.30, 0.35),
    orange: rgb(1.00, 0.60, 0.00),
    divider:rgb(0.15, 0.15, 0.20),
  };

  // Background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });

  // Header band
  page.drawRectangle({ x: 0, y: H - 75, width: W, height: 75, color: C.band });
  page.drawLine({ start: { x: 0, y: H - 75 }, end: { x: W, y: H - 75 }, thickness: 2, color: C.purple });

  page.drawText('NCFN', { x: 28, y: H - 44, size: 30, font: fBold, color: C.purple });
  page.drawText('NEURAL COMPUTING & FUTURE NETWORKS', { x: 105, y: H - 34, size: 8, font: fBold, color: C.cyan });
  page.drawText('RELATÓRIO FORENSE DE BUNDLE DE CUSTÓDIA DIGITAL', { x: 105, y: H - 50, size: 7, font: fReg, color: C.gray });
  page.drawText(p.downloadTime.toISOString(), { x: W - 185, y: H - 34, size: 7, font: fMono, color: C.lgray });
  page.drawText('Protocolo Imutável NCFN v1.0', { x: W - 185, y: H - 46, size: 6, font: fReg, color: C.lgray });

  let y = H - 100;
  const PAD = 28;

  const section = (title: string, color = C.cyan) => {
    y -= 4;
    page.drawRectangle({ x: PAD, y: y - 4, width: W - PAD * 2, height: 20, color: rgb(0.0, 0.04, 0.07) });
    page.drawRectangle({ x: PAD, y: y - 4, width: 3, height: 20, color });
    page.drawText(title, { x: PAD + 10, y: y + 3, size: 8.5, font: fBold, color });
    y -= 26;
  };

  const row = (label: string, value: string, mono = false, color = C.white) => {
    page.drawText(`${label}`, { x: PAD + 6, y, size: 7.5, font: fBold, color: C.gray });
    const maxW = 70;
    const valX = PAD + 100;
    const chunks = [];
    let v = value;
    while (v.length > 0) { chunks.push(v.slice(0, maxW)); v = v.slice(maxW); }
    for (let i = 0; i < chunks.length; i++) {
      page.drawText(chunks[i], { x: valX, y: y - i * 11, size: 7.5, font: mono ? fMono : fReg, color });
    }
    y -= (chunks.length * 11) + 3;
  };

  const divider = () => {
    page.drawLine({ start: { x: PAD, y }, end: { x: W - PAD, y }, thickness: 0.5, color: C.divider });
    y -= 8;
  };

  // ① Arquivo
  section('① ARQUIVO ANALISADO');
  row('Nome', p.filename);
  row('Pasta (Vault)', p.folder);
  row('Tamanho', `${p.size.toLocaleString('pt-BR')} bytes  (${(p.size / 1024 / 1024).toFixed(4)} MB)`);
  row('Última Modificação', p.mtime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
  divider();

  // ② Hashes
  section('② IDENTIDADE CRIPTOGRÁFICA', C.cyan);
  row('SHA-256', p.sha256, true);
  row('MD5', p.md5, true);
  row('SHA-1', p.sha1, true);
  divider();

  // ③ Acesso
  section('③ REGISTRO DE ACESSO', C.orange);
  row('Data/Hora (UTC)', p.downloadTime.toISOString());
  row('Operador', p.operator);
  row('Endereço IP', p.ip);
  divider();

  // ④ Cópia criptografada
  section('④ CÓPIA CRIPTOGRAFADA  (AES-256-CBC)', C.purple);
  row('Arquivo Gerado', p.encFilename);
  row('SHA-256 (enc.)', p.encSha256, true);
  row('Chave AES (hex)', p.aesKey, true, C.cyan);
  row('IV AES (hex)', p.aesIv, true, C.cyan);
  divider();

  // ⑤ Deciframento
  section('⑤ PROTOCOLO DE DECIFRAMENTO', C.lgray);
  const cmd = `openssl enc -d -aes-256-cbc -K ${p.aesKey.slice(0, 32)} -iv ${p.aesIv} -in "${p.encFilename}" -out "${p.filename}"`;
  const cmdNote = '(substitua -K pelo valor completo da Chave AES acima)';
  for (const line of [cmd, cmdNote]) {
    page.drawText(line, { x: PAD + 6, y, size: 6.5, font: fMono, color: C.cyan });
    y -= 12;
  }

  // Footer
  page.drawLine({ start: { x: PAD, y: 36 }, end: { x: W - PAD, y: 36 }, thickness: 0.5, color: C.divider });
  page.drawText('Documento gerado automaticamente pelo Sistema NCFN — Protocolo Imutável de Custódia Digital v1.0', { x: PAD, y: 24, size: 6, font: fReg, color: C.lgray });
  page.drawText(`SHA-256: ${p.sha256}`, { x: PAD, y: 13, size: 5.5, font: fMono, color: rgb(0.22, 0.22, 0.27) });

  return doc.save();
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folder   = searchParams.get('folder')   || '';
  const filename = searchParams.get('filename') || '';

  if (!folder || !filename) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
  }

  const filePath = sanitizePath(folder, filename);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
  }

  try {
    const fileBuffer = readFileSync(filePath);
    const stat       = statSync(filePath);
    const ip         = getIp(req);
    const now        = new Date();

    // Hashes
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const md5    = createHash('md5').update(fileBuffer).digest('hex');
    const sha1   = createHash('sha1').update(fileBuffer).digest('hex');

    // AES-256-CBC encryption
    const aesKey    = randomBytes(32);
    const aesIv     = randomBytes(16);
    const cipher    = createCipheriv('aes-256-cbc', aesKey, aesIv);
    const encBuffer = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const encFile   = `${filename}.enc.bin`;
    const encSha256 = createHash('sha256').update(encBuffer).digest('hex');

    // PDF
    const pdfBytes = await buildForensicPdf({
      filename, folder,
      size: stat.size,
      mtime: new Date(stat.mtime),
      sha256, md5, sha1,
      operator: token.email,
      ip, downloadTime: now,
      encFilename: encFile,
      aesKey: aesKey.toString('hex'),
      aesIv: aesIv.toString('hex'),
      encSha256,
    });

    // ZIP
    const zip = new AdmZip();
    zip.addFile(filename, fileBuffer);
    zip.addFile(encFile, encBuffer);
    zip.addFile('relatorio_forense_ncfn.pdf', Buffer.from(pdfBytes));
    const zipBuf = zip.toBuffer();

    // Access log
    const logPath = path.join(VAULT_DIR, folder, '_registros_acesso.txt');
    try {
      appendFileSync(logPath,
        `[BUNDLE] ${now.toISOString()} | ${token.email} | IP: ${ip} | ${filename} | sha256=${sha256}\n`
      );
    } catch {}

    const zipName = `bundle_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}_${now.getTime()}.zip`;

    return new NextResponse(zipBuf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': zipBuf.length.toString(),
        'X-NCFN-SHA256': sha256,
        'X-NCFN-Operator': token.email,
      },
    });
  } catch (err: any) {
    console.error('[DOWNLOAD-BUNDLE ERROR]', err);
    return NextResponse.json({ error: 'Erro ao gerar bundle forense.' }, { status: 500 });
  }
}
