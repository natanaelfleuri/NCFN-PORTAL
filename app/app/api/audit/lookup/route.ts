// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const VAULT_BASE = path.resolve(process.cwd(), '../COFRE_NCFN');

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * POST /api/audit/lookup
 * Body: { type: 'docid' | 'hex' | 'hash', value: string }
 *
 * type=docid  — look up by document ID (NCFN-XXXXX format)
 *              → decode base36 timestamp, find pericia logs near that time
 * type=hex    — match hex file header against vault files
 *              → scan vault folders and compare first bytes
 * type=hash   — look up SHA-256 hash in TimestampRecord
 *              → returns filename/folder if found + ARQUIVO VALIDADO
 */
export async function POST(req: NextRequest) {
  try {
    const { type, value } = await req.json();
    if (!type || !value?.trim()) {
      return NextResponse.json({ error: 'type e value obrigatórios' }, { status: 400 });
    }

    const ip = getIp(req);

    // ── LOOKUP BY DOCUMENT ID ─────────────────────────────────────────────────
    if (type === 'docid') {
      const docId = value.trim().toUpperCase();

      // Decode timestamp from NCFN-XXXXXX format
      const match = docId.match(/^NCFN-([A-Z0-9]+)$/);
      if (!match) {
        return NextResponse.json({ found: false, message: 'Formato de ID inválido. Esperado: NCFN-XXXXXXXX' });
      }
      const ts = parseInt(match[1], 36);
      if (isNaN(ts) || ts < 1_000_000_000_000) {
        return NextResponse.json({ found: false, message: 'ID de documento inválido ou corrompido.' });
      }

      // Find pericia logs within ±2 minutes of the encoded timestamp
      const from = new Date(ts - 2 * 60 * 1000);
      const to   = new Date(ts + 2 * 60 * 1000);

      const logs = await prisma.vaultAccessLog.findMany({
        where: {
          action: { in: ['pericia', 'custody'] },
          createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      if (logs.length === 0) {
        // Also check AuditLog table for any matching timestamp window
        return NextResponse.json({
          found: false,
          docId,
          message: 'Nenhum arquivo encontrado para este ID de documento. O arquivo pode ter sido descartado ou o ID não pertence a este sistema.',
        });
      }

      const results = logs.map(l => ({
        filePath: l.filePath,
        action: l.action,
        timestamp: l.createdAt.toISOString(),
        userEmail: l.userEmail,
      }));

      return NextResponse.json({
        found: true,
        docId,
        message: `ARQUIVO EM CUSTÓDIA — ${logs.length} registro(s) encontrado(s) para este ID de protocolo.`,
        results,
        generatedAt: new Date(ts).toISOString(),
      });
    }

    // ── LOOKUP BY HEX HEADER ──────────────────────────────────────────────────
    if (type === 'hex') {
      const hexInput = value.trim().replace(/\s+/g, '').toLowerCase();
      if (!/^[0-9a-f]+$/.test(hexInput) || hexInput.length < 4) {
        return NextResponse.json({ found: false, message: 'Cabeçalho hexadecimal inválido. Cole pelo menos 4 bytes hex (8 caracteres).' });
      }
      const searchBytes = Buffer.from(hexInput, 'hex');
      const matchLen = searchBytes.length;

      // Walk vault folders (+ .originals/ subdir) looking for a file whose first bytes match
      const matches: Array<{ filename: string; folder: string; filePath: string }> = [];

      try {
        const folders = fs.readdirSync(VAULT_BASE, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);

        for (const folder of folders) {
          if (folder.startsWith('100_')) continue; // skip burn dir
          // Scan both the main folder and .originals/ subdir
          const scanDirs: Array<{ dir: string; prefix: string }> = [
            { dir: path.join(VAULT_BASE, folder), prefix: folder },
            { dir: path.join(VAULT_BASE, folder, '.originals'), prefix: folder },
          ];

          for (const { dir, prefix } of scanDirs) {
            if (!fs.existsSync(dir)) continue;
            let files: string[] = [];
            try { files = fs.readdirSync(dir); } catch { continue; }

            for (const filename of files) {
              if (filename.startsWith('_') || filename.startsWith('.')) continue;
              const filePath = path.join(dir, filename);
              try {
                const stat = fs.statSync(filePath);
                if (!stat.isFile() || stat.size < matchLen) continue;
                const fd = fs.openSync(filePath, 'r');
                const buf = Buffer.alloc(matchLen);
                fs.readSync(fd, buf, 0, matchLen, 0);
                fs.closeSync(fd);
                if (buf.equals(searchBytes)) {
                  matches.push({ filename, folder: prefix, filePath: `${prefix}/${filename}` });
                  if (matches.length >= 5) break;
                }
              } catch { continue; }
            }
            if (matches.length >= 5) break;
          }
          if (matches.length >= 5) break;
        }
      } catch {}

      if (matches.length === 0) {
        return NextResponse.json({
          found: false,
          message: 'Nenhum arquivo com este cabeçalho hexadecimal encontrado no Cofre NCFN.',
        });
      }

      return NextResponse.json({
        found: true,
        message: `${matches.length} arquivo(s) identificado(s) pelo cabeçalho hexadecimal.`,
        results: matches,
      });
    }

    // ── LOOKUP BY SHA-256 HASH ────────────────────────────────────────────────
    if (type === 'hash') {
      const sha256 = value.trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(sha256)) {
        return NextResponse.json({ found: false, message: 'Hash SHA-256 inválido. Deve ter exatamente 64 caracteres hexadecimais.' });
      }

      // 1. Check TimestampRecord (RFC 3161)
      const tsRecord = await prisma.timestampRecord.findUnique({ where: { sha256 } });

      // 2. Check FileStatus (hashes registrados no download-bundle e R2)
      let fileStatusMatch: { filename: string; folder: string } | null = null;
      if (!tsRecord) {
        const fs2 = await prisma.fileStatus.findFirst({ where: { sha256 }, select: { filename: true, folder: true } });
        if (fs2) fileStatusMatch = { filename: fs2.filename, folder: fs2.folder };
      }

      // 3. Check _hashes_vps.txt files (legado)
      let vaultTxtMatch: { filename: string; folder: string } | null = null;
      if (!tsRecord && !fileStatusMatch) {
        try {
          const folders = fs.readdirSync(VAULT_BASE, { withFileTypes: true })
            .filter(d => d.isDirectory()).map(d => d.name);
          for (const folder of folders) {
            const hashFile = path.join(VAULT_BASE, folder, '_hashes_vps.txt');
            if (!fs.existsSync(hashFile)) continue;
            const content = fs.readFileSync(hashFile, 'utf-8');
            const line = content.split('\n').find(l => l.toLowerCase().includes(sha256));
            if (line) {
              const parts = line.split(' | ');
              vaultTxtMatch = { filename: parts[1]?.trim() || 'arquivo', folder };
              break;
            }
          }
        } catch {}
      }

      // 4. Live scan de arquivos no cofre (inclui .enc e .originals/)
      let liveMatch: { filename: string; folder: string } | null = null;
      if (!tsRecord && !fileStatusMatch && !vaultTxtMatch) {
        try {
          const crypto = await import('crypto');
          const folders = fs.readdirSync(VAULT_BASE, { withFileTypes: true })
            .filter(d => d.isDirectory()).map(d => d.name);
          outer: for (const folder of folders) {
            const scanDirs = [
              path.join(VAULT_BASE, folder),
              path.join(VAULT_BASE, folder, '.originals'),
            ];
            for (const scanDir of scanDirs) {
              if (!fs.existsSync(scanDir)) continue;
              let files: string[] = [];
              try { files = fs.readdirSync(scanDir); } catch { continue; }
              for (const filename of files) {
                if (filename.startsWith('_') || filename.startsWith('.')) continue;
                const filePath = path.join(scanDir, filename);
                try {
                  const stat = fs.statSync(filePath);
                  if (!stat.isFile() || stat.size > 200 * 1024 * 1024) continue; // skip >200MB
                  const buf = fs.readFileSync(filePath);
                  const h = crypto.createHash('sha256').update(buf).digest('hex');
                  if (h === sha256) {
                    const isOriginals = scanDir.endsWith('.originals');
                    liveMatch = { filename, folder };
                    // Cache no FileStatus para buscas futuras
                    prisma.fileStatus.upsert({
                      where: { folder_filename: { folder, filename } },
                      update: { sha256, size: stat.size },
                      create: { folder, filename, sha256, size: stat.size, isPublic: false },
                    }).catch(() => {});
                    break outer;
                  }
                } catch { continue; }
              }
            }
          }
        } catch {}
      }

      const found = !!(tsRecord || fileStatusMatch || vaultTxtMatch || liveMatch);
      const filename = tsRecord?.filename || fileStatusMatch?.filename || vaultTxtMatch?.filename || liveMatch?.filename || null;
      const folder = tsRecord?.folder || fileStatusMatch?.folder || vaultTxtMatch?.folder || liveMatch?.folder || null;

      if (!found) {
        // Log the failed lookup attempt
        await prisma.auditLog.create({
          data: {
            actionType: 'BUSCA_HASH_NAO_ENCONTRADO',
            providedHash: sha256,
            calculatedHash: sha256,
            isMatch: false,
            ipAddress: ip,
            userAgent: (req.headers.get('user-agent') || '').slice(0, 255),
            userId: null,
          },
        }).catch(() => {});

        return NextResponse.json({
          found: false,
          message: 'Hash SHA-256 não encontrado no registro de custódia NCFN. Arquivo não custodiado ou hash incorreto.',
        });
      }

      // Log the successful lookup
      const auditLog = await prisma.auditLog.create({
        data: {
          actionType: 'BUSCA_HASH_VALIDADO',
          providedHash: sha256,
          calculatedHash: sha256,
          isMatch: true,
          ipAddress: ip,
          userAgent: (req.headers.get('user-agent') || '').slice(0, 255),
          userId: null,
        },
      });

      return NextResponse.json({
        found: true,
        validated: true,
        message: 'ARQUIVO VALIDADO — Hash SHA-256 confirmado no registro de custódia NCFN.',
        filename,
        folder,
        sha256,
        logId: auditLog.id,
        registeredAt: tsRecord?.createdAt?.toISOString() || null,
      });
    }

    return NextResponse.json({ error: 'type inválido' }, { status: 400 });

  } catch (err) {
    console.error('[AUDIT LOOKUP ERROR]', err);
    return NextResponse.json({ error: 'Erro interno na consulta' }, { status: 500 });
  }
}
