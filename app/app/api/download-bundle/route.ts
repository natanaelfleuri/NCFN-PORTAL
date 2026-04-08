// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createHash, createCipheriv, randomBytes } from 'crypto';
import { readFileSync, existsSync, statSync, appendFileSync, readdirSync } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VAULT_DIR = path.join(process.cwd(), '../COFRE_NCFN');

function sanitizePath(folder: string, filename: string): string {
  // Preserva acentos e espaços — necessário para nomes de pasta do COFRE_NCFN
  const safeFolder = folder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\- ÁÉÍÓÚÀÂÊÔÃÕÜÇ]/gi, '');
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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  }
  const userEmail = session.user.email;

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
    // Strip trailing .enc before appending .enc.bin to avoid double extension (e.g. file.enc.enc.bin)
    const baseFilename = filename.endsWith('.enc') ? filename.slice(0, -4) : filename;
    const encFile   = `${baseFilename}.enc.bin`;
    const encSha256 = createHash('sha256').update(encBuffer).digest('hex');

    // Gerar PDFs via custody-report: versão digital (dark) e versão impressão (white)
    // Usa localhost:3000 diretamente para evitar round-trip externo via Cloudflare/DNS
    const internalBase = 'http://localhost:3000';
    const custodyHeaders = {
      'Content-Type': 'application/json',
      'cookie': req.headers.get('cookie') || '',
    };

    // Try to find the latest typed report for this file (final > intermediario > inicial)
    let reportId: string | null = null;
    try {
      // Prefer the most recent report of the highest cycle stage
      const latestTyped = await prisma.laudoForense.findFirst({
        where: {
          folder,
          filename: { in: [filename, baseFilename] },
          reportType: { in: ['final', 'intermediario', 'inicial'] },
        },
        orderBy: [
          // Prioritize by type rank, then by date
          { createdAt: 'desc' },
        ],
      });

      if (latestTyped) {
        // Pick highest stage available: final > intermediario > inicial
        const stageRank: Record<string, number> = { final: 3, intermediario: 2, inicial: 1 };
        const candidates = await prisma.laudoForense.findMany({
          where: {
            folder,
            filename: { in: [filename, baseFilename] },
            reportType: { in: ['final', 'intermediario', 'inicial'] },
          },
          orderBy: { createdAt: 'desc' },
        });
        const best = candidates.sort((a, b) =>
          (stageRank[b.reportType] || 0) - (stageRank[a.reportType] || 0)
        )[0];
        reportId = best?.id || null;
      }

      // Fallback to initialReportId from custody state if no LaudoForense found
      if (!reportId) {
        const cs = await prisma.fileCustodyState.findFirst({
          where: { folder, OR: [{ filename }, { filename: baseFilename }] },
          select: { initialReportId: true },
        });
        reportId = cs?.initialReportId || null;
      }
    } catch {}

    let periciaPdfBytes: Buffer | null = null;
    let periciaPrintBytes: Buffer | null = null;
    try {
      if (reportId) {
        // Use typed custody report (proper formatted PDF with report type label)
        const [digitalRes, printRes] = await Promise.all([
          fetch(`${internalBase}/api/vault/custody-report`, {
            method: 'POST', headers: custodyHeaders,
            body: JSON.stringify({ action: 'view_typed_report', id: reportId }),
          }),
          fetch(`${internalBase}/api/vault/custody-report`, {
            method: 'POST', headers: custodyHeaders,
            body: JSON.stringify({ action: 'view_typed_report', id: reportId, print: true }),
          }),
        ]);
        if (digitalRes.ok) periciaPdfBytes = Buffer.from(await digitalRes.arrayBuffer());
        if (printRes.ok)   periciaPrintBytes = Buffer.from(await printRes.arrayBuffer());
      }
      // Fallback to generic pericia report if no custody report found
      if (!periciaPdfBytes) {
        const custodyBody = { filePath: `${folder}/${filename}` };
        const [digitalRes, printRes] = await Promise.all([
          fetch(`${internalBase}/api/vault/custody-report`, {
            method: 'POST', headers: custodyHeaders,
            body: JSON.stringify(custodyBody),
          }),
          fetch(`${internalBase}/api/vault/custody-report`, {
            method: 'POST', headers: custodyHeaders,
            body: JSON.stringify({ ...custodyBody, print: true }),
          }),
        ]);
        if (digitalRes.ok) periciaPdfBytes = Buffer.from(await digitalRes.arrayBuffer());
        if (printRes.ok)   periciaPrintBytes = Buffer.from(await printRes.arrayBuffer());
      }
    } catch { /* silencioso — ZIP continua sem PDFs se falhar */ }

    // ── Recuperar arquivo original plaintext ──────────────────────────────
    // Caso 1: arquivo ainda não encriptado → ele mesmo é o original
    // Caso 2: arquivo é .enc → busca plaintext no BURN (manifesto ou scan)
    let originalBuffer: Buffer | null = null;
    let originalFilename: string | null = null;

    if (!filename.endsWith('.enc')) {
      originalBuffer   = fileBuffer;
      originalFilename = filename;
    } else {
      try {
        // Prioridade 1: .originals/ dentro da mesma pasta (padrão v11)
        const originalsPath = path.join(VAULT_DIR, folder, '.originals', baseFilename);
        if (existsSync(originalsPath)) {
          originalBuffer   = readFileSync(originalsPath);
          originalFilename = baseFilename;
        } else {
          // Prioridade 2: 100_BURN_IMMUTABILITY (legado / cópia burn)
          const burnDir      = path.join(VAULT_DIR, '100_BURN_IMMUTABILITY');
          const manifestPath = path.join(burnDir, '_burn_manifest.json');
          let burnFile: string | null = null;

          if (existsSync(manifestPath)) {
            const manifest: Record<string, string> = JSON.parse(readFileSync(manifestPath, 'utf8'));
            burnFile = manifest[`${folder}/${baseFilename}`]
                    || manifest[`${folder}/${filename}`]
                    || null;
          }

          if (!burnFile && existsSync(burnDir)) {
            const entries = readdirSync(burnDir).filter(
              f => f.endsWith(`_${baseFilename}`) && !f.endsWith('.enc.bin')
            );
            if (entries.length > 0) {
              entries.sort((a, b) => {
                const ta = parseInt(a.split('_')[0]) || 0;
                const tb = parseInt(b.split('_')[0]) || 0;
                return tb - ta;
              });
              burnFile = entries[0];
            }
          }

          if (burnFile) {
            const burnPath = path.join(burnDir, burnFile);
            if (existsSync(burnPath)) {
              originalBuffer   = readFileSync(burnPath);
              originalFilename = baseFilename;
            }
          }
        }
      } catch {}
    }

    // Compute PDF hashes for the verification manifest
    const pdfDigitalSha256 = periciaPdfBytes
      ? createHash('sha256').update(periciaPdfBytes).digest('hex') : null;
    const pdfPrintSha256 = periciaPrintBytes
      ? createHash('sha256').update(periciaPrintBytes).digest('hex') : null;

    // VERIFICACAO_HASHES.txt — hash manifest for all files in the ZIP
    const hashManifest = [
      `NCFN — MANIFESTO DE VERIFICACAO CRIPTOGRAFICA`,
      `Gerado em: ${now.toISOString()}`,
      `Operador: ${userEmail}`,
      `IP: ${ip}`,
      ``,
      `[1] ARQUIVO CUSTODIADO (.enc — versao encriptada no cofre)`,
      `    Nome:    ${filename}`,
      `    SHA-256: ${sha256}`,
      `    MD5:     ${md5}`,
      `    SHA-1:   ${sha1}`,
      ``,
      ...(originalBuffer && originalFilename && filename.endsWith('.enc') ? [
        `[2] ARQUIVO ORIGINAL (plaintext — copia imutavel)`,
        `    Nome:    ${originalFilename}`,
        `    SHA-256: ${createHash('sha256').update(originalBuffer).digest('hex')}`,
        `    MD5:     ${createHash('md5').update(originalBuffer).digest('hex')}`,
        `    SHA-1:   ${createHash('sha1').update(originalBuffer).digest('hex')}`,
        ``,
      ] : []),
      `[3] RELATORIO FORENSE DIGITAL (versao escura — tela)`,
      `    Nome:    relatorio_custodia_ncfn_digital.pdf`,
      `    SHA-256: ${pdfDigitalSha256 || 'N/A — PDF nao gerado'}`,
      ``,
      `[4] RELATORIO FORENSE IMPRESSAO (versao clara — papel)`,
      `    Nome:    relatorio_custodia_ncfn_impressao.pdf`,
      `    SHA-256: ${pdfPrintSha256 || 'N/A — PDF nao gerado'}`,
      ``,
      `COMO VERIFICAR:`,
      `  Linux/Mac:  sha256sum <arquivo>`,
      `  Windows:    certutil -hashfile <arquivo> SHA256`,
      ``,
      `Qualquer divergencia de um unico caractere invalida a integridade do arquivo.`,
    ].join('\n');

    // ZIP: original + .enc + PDFs + hash manifest
    const zip = new AdmZip();
    // Always include the .enc file (custody-encrypted version)
    zip.addFile(filename, fileBuffer);
    // Include original plaintext if found
    if (originalBuffer && originalFilename && filename.endsWith('.enc')) {
      zip.addFile(`ORIGINAL_${originalFilename}`, originalBuffer);
    }
    if (periciaPdfBytes)   zip.addFile('relatorio_custodia_ncfn_digital.pdf', periciaPdfBytes);
    if (periciaPrintBytes) zip.addFile('relatorio_custodia_ncfn_impressao.pdf', periciaPrintBytes);
    zip.addFile('VERIFICACAO_HASHES.txt', Buffer.from(hashManifest, 'utf-8'));
    const zipBuf = zip.toBuffer();

    // Access log (file + DB)
    const logPath = path.join(VAULT_DIR, folder, '_registros_acesso.txt');
    try {
      appendFileSync(logPath,
        `[BUNDLE] ${now.toISOString()} | ${userEmail} | IP: ${ip} | ${filename} | sha256=${sha256}\n`
      );
    } catch {}
    prisma.vaultAccessLog.create({
      data: { filePath: `${folder}/${filename}`, action: 'download', userEmail: userEmail || 'unknown', ip, isCanary: false },
    }).catch(() => {});

    // Registra hashes no FileStatus para que /auditor possa verificá-los
    prisma.fileStatus.upsert({
      where: { folder_filename: { folder, filename } },
      update: { sha256, size: statSync(filePath).size },
      create: { folder, filename, sha256, size: statSync(filePath).size, isPublic: false },
    }).catch(() => {});
    if (originalBuffer && originalFilename && originalFilename !== filename) {
      const origSha256 = createHash('sha256').update(originalBuffer).digest('hex');
      prisma.fileStatus.upsert({
        where: { folder_filename: { folder, filename: originalFilename } },
        update: { sha256: origSha256, size: originalBuffer.length },
        create: { folder, filename: originalFilename, sha256: origSha256, size: originalBuffer.length, isPublic: false },
      }).catch(() => {});
    }

    // Burn copy — salva cópia AES imutável em 100_BURN_IMMUTABILITY (acumulativa)
    try {
      const { mkdirSync, writeFileSync } = await import('fs');
      const burnDir = path.join(VAULT_DIR, '100_BURN_IMMUTABILITY');
      mkdirSync(burnDir, { recursive: true });
      writeFileSync(path.join(burnDir, `${now.getTime()}_${baseFilename}.enc.bin`), encBuffer);
      appendFileSync(path.join(burnDir, '_registros_burn.txt'),
        `[BURN] ${now.toISOString()} | ${userEmail} | IP: ${ip} | ${filename} | sha256_enc=${encSha256}\n`
      );
    } catch {} // falha silenciosa — não bloquear o download

    const zipName = `COFRE_${baseFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}_${now.getTime()}.zip`;

    return new NextResponse(zipBuf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': zipBuf.length.toString(),
        'X-NCFN-SHA256': sha256,
        'X-NCFN-Operator': userEmail,
      },
    });
  } catch (err: any) {
    console.error('[DOWNLOAD-BUNDLE ERROR]', err);
    return NextResponse.json({ error: 'Erro ao gerar bundle forense.' }, { status: 500 });
  }
}
