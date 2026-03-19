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
    const baseUrl = new URL(req.url).origin;
    const custodyHeaders = {
      'Content-Type': 'application/json',
      'cookie': req.headers.get('cookie') || '',
    };
    const custodyBody = { filePath: `${folder}/${filename}` };

    let periciaPdfBytes: Buffer | null = null;
    let periciaPrintBytes: Buffer | null = null;
    try {
      const [digitalRes, printRes] = await Promise.all([
        fetch(`${baseUrl}/api/vault/custody-report`, {
          method: 'POST', headers: custodyHeaders,
          body: JSON.stringify(custodyBody),
        }),
        fetch(`${baseUrl}/api/vault/custody-report`, {
          method: 'POST', headers: custodyHeaders,
          body: JSON.stringify({ ...custodyBody, print: true }),
        }),
      ]);
      if (digitalRes.ok) periciaPdfBytes = Buffer.from(await digitalRes.arrayBuffer());
      if (printRes.ok)   periciaPrintBytes = Buffer.from(await printRes.arrayBuffer());
    } catch { /* silencioso — ZIP continua sem PDFs se falhar */ }

    // Compute PDF hashes for the verification manifest
    const pdfDigitalSha256 = periciaPdfBytes
      ? createHash('sha256').update(periciaPdfBytes).digest('hex') : null;
    const pdfPrintSha256 = periciaPrintBytes
      ? createHash('sha256').update(periciaPrintBytes).digest('hex') : null;

    // VERIFICACAO_HASHES.txt — hash manifest for all files in the ZIP
    const hashManifest = [
      `NCFN — MANIFESTO DE VERIFICACAO CRIPTOGRAFICA`,
      `Gerado em: ${now.toISOString()}`,
      `Operador: ncfn@ncfn.net`,
      `IP: ${ip}`,
      ``,
      `[1] ARQUIVO ORIGINAL (cofre)`,
      `    Nome:    ${filename}`,
      `    SHA-256: ${sha256}`,
      `    MD5:     ${md5}`,
      `    SHA-1:   ${sha1}`,
      ``,
      `[2] RELATORIO FORENSE DIGITAL (versao escura — tela)`,
      `    Nome:    pericia_forense_ncfn_digital.pdf`,
      `    SHA-256: ${pdfDigitalSha256 || 'N/A — PDF nao gerado'}`,
      ``,
      `[3] RELATORIO FORENSE IMPRESSAO (versao clara — papel)`,
      `    Nome:    pericia_forense_ncfn_impressao.pdf`,
      `    SHA-256: ${pdfPrintSha256 || 'N/A — PDF nao gerado'}`,
      ``,
      `COMO VERIFICAR:`,
      `  Linux/Mac:  sha256sum <arquivo>`,
      `  Windows:    certutil -hashfile <arquivo> SHA256`,
      ``,
      `Qualquer divergencia de um unico caractere invalida a integridade do arquivo.`,
    ].join('\n');

    // ── Recuperar arquivo original plaintext ──────────────────────────────
    // Caso 1: arquivo ainda não encriptado → ele mesmo é o original
    // Caso 2: arquivo é .enc → busca plaintext no BURN (manifesto ou scan)
    let originalBuffer: Buffer | null = null;
    let originalFilename: string | null = null;

    if (!filename.endsWith('.enc')) {
      // O próprio arquivo é o original
      originalBuffer   = fileBuffer;
      originalFilename = filename;
    } else {
      // Tenta manifesto primeiro, depois faz scan pelo padrão timestamp_basename
      try {
        const burnDir      = path.join(VAULT_DIR, '100_BURN_IMMUTABILITY');
        const manifestPath = path.join(burnDir, '_burn_manifest.json');
        let burnFile: string | null = null;

        if (existsSync(manifestPath)) {
          const manifest: Record<string, string> = JSON.parse(readFileSync(manifestPath, 'utf8'));
          burnFile = manifest[`${folder}/${baseFilename}`]
                  || manifest[`${folder}/${filename}`]
                  || null;
        }

        // Fallback: scan por `*_${baseFilename}` no diretório BURN
        if (!burnFile && existsSync(burnDir)) {
          const entries = readdirSync(burnDir).filter(
            f => f.endsWith(`_${baseFilename}`) && !f.endsWith('.enc.bin')
          );
          if (entries.length > 0) {
            // Pega o mais recente (maior timestamp prefix)
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
      } catch {}
    }

    // ZIP: arquivo(s) + PDFs + hash manifest
    const zip = new AdmZip();
    if (originalBuffer && originalFilename && filename.endsWith('.enc')) {
      // Arquivo encriptado: inclui original plaintext + versão .enc
      zip.addFile(`ORIGINAL_${originalFilename}`, originalBuffer);
      zip.addFile(filename, fileBuffer);
    } else if (originalBuffer && originalFilename) {
      // Arquivo não encriptado: inclui diretamente como original
      zip.addFile(originalFilename, originalBuffer);
    } else {
      // Fallback: só o arquivo do cofre
      zip.addFile(filename, fileBuffer);
    }
    if (periciaPdfBytes)   zip.addFile('pericia_forense_ncfn_digital.pdf', periciaPdfBytes);
    if (periciaPrintBytes) zip.addFile('pericia_forense_ncfn_impressao.pdf', periciaPrintBytes);
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
