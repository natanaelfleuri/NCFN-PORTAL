// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const VAULT = path.join(process.cwd(), '../COFRE_NCFN');

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw + 'ncfn_vitrine_salt').digest('hex');
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}

async function generateVitrinePDF(opts: {
  recipientName: string;
  filename: string;
  folder: string;
  sha256: string;
  md5: string;
  fileSize: number;
  ip: string;
  timestamp: string;
  downloadCount: number;
}): Promise<Buffer> {
  const { recipientName, filename, folder, sha256, md5, fileSize, ip, timestamp, downloadCount } = opts;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Header bg
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: rgb(0.02, 0.02, 0.06) });
  page.drawText('NCFN FORENSIC NETWORK', { x: 50, y: height - 42, size: 22, font: fontBold, color: rgb(0.74, 0.07, 1) });
  page.drawText('Certificado de Entrega de Arquivo — Cadeia de Custódia', { x: 50, y: height - 65, size: 10, font, color: rgb(0.7, 0.7, 0.7) });
  page.drawText('ncfn.net  |  Protocolo Zero-Trust  |  AES-256-GCM', { x: 50, y: height - 82, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  let y = height - 140;

  // Section title
  page.drawText('DADOS DO DESTINATÁRIO', { x: 50, y, size: 11, font: fontBold, color: rgb(0.74, 0.07, 1) });
  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.74, 0.07, 1) });
  y -= 20;

  const row = (label: string, value: string, yPos: number, mono = false) => {
    page.drawText(label, { x: 50, y: yPos, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(value, { x: 200, y: yPos, size: 9, font: mono ? fontMono : font, color: rgb(0.1, 0.1, 0.1) });
    return yPos - 18;
  };

  y = row('Destinatário:', recipientName.slice(0, 60), y);
  y = row('Data / Hora (UTC):', timestamp, y);
  y = row('IP de Acesso:', ip, y);
  y = row('Download Nº:', String(downloadCount), y);

  y -= 15;
  page.drawText('ARQUIVO CERTIFICADO', { x: 50, y, size: 11, font: fontBold, color: rgb(0.74, 0.07, 1) });
  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.74, 0.07, 1) });
  y -= 20;

  y = row('Nome do Arquivo:', filename.slice(0, 60), y);
  y = row('Pasta (Cofre):', folder.slice(0, 60), y);
  y = row('Tamanho:', formatBytes(fileSize), y);

  y -= 5;
  page.drawText('SHA-256:', { x: 50, y, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;
  // SHA-256 split in two lines if too long
  page.drawText(sha256.slice(0, 64), { x: 60, y, size: 8, font: fontMono, color: rgb(0, 0.5, 0.8) });
  y -= 14;
  page.drawText('MD5:', { x: 50, y, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;
  page.drawText(md5.slice(0, 64), { x: 60, y, size: 8, font: fontMono, color: rgb(0, 0.5, 0.8) });
  y -= 20;

  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
  y -= 20;

  page.drawText('COMO VERIFICAR A AUTENTICIDADE', { x: 50, y, size: 11, font: fontBold, color: rgb(0.74, 0.07, 1) });
  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.74, 0.07, 1) });
  y -= 20;

  const instructions = [
    'Compare o hash SHA-256 acima com o do arquivo recebido.',
    'Se divergirem um único caractere, o arquivo foi adulterado.',
    '',
    'Windows (PowerShell):',
    '  certutil -hashfile <nome_do_arquivo> SHA256',
    '',
    'Linux / macOS:',
    '  sha256sum <nome_do_arquivo>',
  ];
  for (const line of instructions) {
    const isMono = line.startsWith('  ');
    page.drawText(line, { x: 50, y, size: 9, font: isMono ? fontMono : font, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
  }

  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
  y -= 30;

  // Seal box
  page.drawRectangle({ x: width - 210, y: y - 70, width: 160, height: 70, color: rgb(1, 1, 1), borderColor: rgb(0.74, 0.07, 1), borderWidth: 2 });
  page.drawText('NCFN SEAL', { x: width - 195, y: y - 25, size: 13, font: fontBold, color: rgb(0.74, 0.07, 1) });
  page.drawText('VERIFIED CUSTODY', { x: width - 195, y: y - 43, size: 9, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText(`TS: ${Date.now()}`, { x: width - 195, y: y - 58, size: 7, font: fontMono, color: rgb(0.5, 0.5, 0.5) });

  page.drawText('AVISO LEGAL: Este certificado e o hash SHA-256 estão registrados na cadeia de custódia NCFN.', { x: 50, y: 40, size: 7.5, font, color: rgb(0.5, 0.5, 0.5) });
  page.drawText('O acesso foi registrado com timestamp e IP para fins de conformidade legal.', { x: 50, y: 28, size: 7.5, font, color: rgb(0.5, 0.5, 0.5) });

  return Buffer.from(await doc.save());
}

// POST /api/vitrine/redeem
// body: { id, password }
// → validates password, returns ZIP download with file + forensic PDF + hash manifest
export async function POST(req: NextRequest) {
  try {
    const { id, password } = await req.json();
    if (!id || !password) {
      return NextResponse.json({ error: 'ID e senha obrigatórios' }, { status: 400 });
    }

    const entry = await prisma.vitrinePublish.findUnique({ where: { id } });
    if (!entry || !entry.active) {
      return NextResponse.json({ error: 'Arquivo não encontrado ou inativo' }, { status: 404 });
    }

    const hash = hashPassword(String(password));
    if (hash !== entry.passwordHash) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Resolve file path safely
    const folderPath = path.resolve(VAULT, entry.folder);
    if (!folderPath.startsWith(VAULT)) {
      return NextResponse.json({ error: 'Caminho inválido' }, { status: 403 });
    }
    const filePath = path.join(folderPath, entry.filename);
    if (!await fs.pathExists(filePath)) {
      return NextResponse.json({ error: 'Arquivo não encontrado no servidor' }, { status: 404 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const now = new Date();
    const timestamp = now.toISOString();

    console.log(`[VITRINE REDEEM] id=${id} recipient=${entry.recipientName} file=${entry.filename} ip=${ip}`);

    // Update download count
    const updated = await prisma.vitrinePublish.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    const fileBuffer = await fs.readFile(filePath);
    const stat = await fs.stat(filePath);

    // Compute hashes
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Generate forensic PDF report
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateVitrinePDF({
        recipientName: entry.recipientName,
        filename: entry.filename,
        folder: entry.folder,
        sha256,
        md5,
        fileSize: stat.size,
        ip,
        timestamp,
        downloadCount: updated.downloadCount,
      });
    } catch (pdfErr) {
      console.error('[VITRINE REDEEM] PDF generation failed:', pdfErr);
    }

    // Hash manifest text
    const manifest = [
      `NCFN — MANIFESTO DE VERIFICAÇÃO CRIPTOGRÁFICA`,
      `Gerado em: ${timestamp}`,
      `Destinatário: ${entry.recipientName}`,
      `IP de Acesso: ${ip}`,
      `Download Nº: ${updated.downloadCount}`,
      ``,
      `[1] ARQUIVO ORIGINAL`,
      `    Nome:    ${entry.filename}`,
      `    Tamanho: ${formatBytes(stat.size)}`,
      `    SHA-256: ${sha256}`,
      `    MD5:     ${md5}`,
      ``,
      `[2] RELATÓRIO FORENSE NCFN`,
      `    Nome:    relatorio_forense_ncfn.pdf`,
      `    SHA-256: ${pdfBuffer ? crypto.createHash('sha256').update(pdfBuffer).digest('hex') : 'N/A — não gerado'}`,
      ``,
      `COMO VERIFICAR:`,
      `  Linux/Mac:  sha256sum <arquivo>`,
      `  Windows:    certutil -hashfile <arquivo> SHA256`,
      ``,
      `Qualquer divergência invalida a integridade e a validade probatória do arquivo.`,
    ].join('\n');

    // Build ZIP
    const zip = new AdmZip();
    zip.addFile(path.basename(entry.filename), fileBuffer);
    if (pdfBuffer) zip.addFile('relatorio_forense_ncfn.pdf', pdfBuffer);
    zip.addFile('VERIFICACAO_HASHES.txt', Buffer.from(manifest, 'utf-8'));
    const zipBuffer = zip.toBuffer();

    const zipName = `${path.basename(entry.filename, path.extname(entry.filename))}_NCFN_CERTIFY.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (e) {
    console.error('[VITRINE REDEEM ERROR]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
