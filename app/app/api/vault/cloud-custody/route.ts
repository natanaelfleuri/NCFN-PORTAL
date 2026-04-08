// @ts-nocheck
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rateLimit';
import { createHash, createCipheriv, randomBytes } from 'crypto';
import { uploadToDrive, deleteFromDrive } from '@/lib/gdrive';
import { uploadToInternxt, deleteFromInternxt, testInternxtConnection } from '@/lib/internxt';

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

async function adminGuard() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const user = await getDbUser(session.user.email);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await adminGuard();
  if (!user) return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  // ── TEST INTERNXT CONNECTION ──────────────────────────────────────────────
  if (action === 'test_internxt') {
    const ok = await testInternxtConnection();
    return NextResponse.json({ ok, message: ok ? 'Internxt WebDAV acessível.' : 'Internxt WebDAV não está respondendo. Execute: internxt webdav:start' });
  }

  // ── STATUS ────────────────────────────────────────────────────────────────
  if (action === 'status') {
    const { folder, filename } = body;
    if (!folder || !filename) return NextResponse.json({ error: 'folder e filename obrigatórios.' }, { status: 400 });

    const records = await prisma.cloudCustody.findMany({
      where: { folder, filename, status: 'active' },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const byProvider: Record<string, any> = {};
    for (const r of records) byProvider[(r as any).provider || 'google_drive'] = r;

    return NextResponse.json({ exists: records.length > 0, records, byProvider });
  }

  // ── UPLOAD ────────────────────────────────────────────────────────────────
  if (action === 'upload') {
    const { folder, filename, provider = 'google_drive' } = body;
    if (!folder || !filename) return NextResponse.json({ error: 'folder e filename obrigatórios.' }, { status: 400 });

    // Rate limit: 10 uploads/hora por admin
    if (!checkRateLimit(`cloud-custody:${user.email}`, 10, 3_600_000)) {
      return NextResponse.json({ error: 'Limite de uploads atingido (10/hora).' }, { status: 429 });
    }

    // Idempotência — já existe custódia ativa para esse provider?
    const existing = await prisma.cloudCustody.findFirst({
      where: { folder, filename, status: 'active', provider } as any,
    }).catch(() => null);
    if (existing) {
      return NextResponse.json({ alreadyExists: true, ...existing }, { status: 200 });
    }

    // Gera o ZIP via download-bundle interno
    let zipBuffer: Buffer;
    try {
      const zipRes = await fetch(
        `http://localhost:3000/api/download-bundle?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}`,
        { headers: { cookie: req.headers.get('cookie') || '' } }
      );
      if (!zipRes.ok) {
        const txt = await zipRes.text().catch(() => '');
        throw new Error(`download-bundle falhou (${zipRes.status}): ${txt.slice(0, 200)}`);
      }
      zipBuffer = Buffer.from(await zipRes.arrayBuffer());
    } catch (e: any) {
      return NextResponse.json({ error: `Erro ao gerar ZIP: ${e.message}` }, { status: 500 });
    }

    const maxBytes = parseInt(process.env.GDRIVE_MAX_UPLOAD_BYTES || '524288000');
    if (zipBuffer.length > maxBytes) {
      return NextResponse.json({
        error: `ZIP (${(zipBuffer.length / 1048576).toFixed(1)} MB) excede o limite de ${(maxBytes / 1048576).toFixed(0)} MB.`,
      }, { status: 413 });
    }

    // Hashes do ZIP
    const zipSha256 = createHash('sha256').update(zipBuffer).digest('hex');
    const zipSizeBytes = zipBuffer.length;

    // Criptografa ZIP com AES-256-GCM
    const aesKey = randomBytes(32);
    const aesIv  = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', aesKey, aesIv);
    const encBuffer = Buffer.concat([cipher.update(zipBuffer), cipher.final()]);
    const authTag   = cipher.getAuthTag();
    const encSha256 = createHash('sha256').update(encBuffer).digest('hex');

    const baseFilename = filename.endsWith('.enc') ? filename.slice(0, -4) : filename;
    const ts = Date.now();
    const safeName = baseFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const remoteFileName = `NCFN_${folder.slice(0, 20)}_${safeName}_${ts}.zip.enc`;

    // ── Upload por provider ───────────────────────────────────────────────
    let driveFileId = '';
    let driveLink = '';
    let lastErr: Error | null = null;

    if (provider === 'internxt') {
      // Internxt WebDAV
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await uploadToInternxt(remoteFileName, encBuffer);
          driveFileId = result.path;
          driveLink = result.url;
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 2000));
        }
      }
    } else {
      // Google Drive (padrão)
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await uploadToDrive(remoteFileName, encBuffer);
          driveFileId = result.fileId;
          driveLink = result.webViewLink;
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          if (e.code === 401 || e.code === 403) break;
          if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 2000));
        }
      }
    }

    if (lastErr) {
      const providerName = provider === 'internxt' ? 'Internxt WebDAV' : 'Google Drive';
      return NextResponse.json({ error: `Erro no upload para ${providerName}: ${lastErr.message}` }, { status: 502 });
    }

    // Persiste no banco
    const record = await prisma.cloudCustody.create({
      data: {
        id:            `cc_${ts}_${Math.random().toString(36).slice(2, 8)}`,
        folder,
        filename,
        driveFileId,
        driveLink,
        driveFileName:   remoteFileName,
        aesKeyHex:     aesKey.toString('hex'),
        aesIvHex:      aesIv.toString('hex'),
        aesAuthTagHex: authTag.toString('hex'),
        zipSha256,
        zipSizeBytes,
        encSha256,
        operatorEmail: user.email,
        status:        'active',
        provider,
        updatedAt:     new Date(),
      } as any,
    });

    // Log de auditoria
    prisma.vaultAccessLog.create({
      data: { filePath: `${folder}/${filename}`, action: 'cloud_custody', userEmail: user.email, ip: getIp(req), isCanary: false },
    }).catch(() => {});

    return NextResponse.json(record, { status: 201 });
  }

  // ── DOWNLOAD KEY ──────────────────────────────────────────────────────────
  if (action === 'download_key') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 });

    const record = await prisma.cloudCustody.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });

    const keyTxt = [
      `NCFN — CHAVE DE DECRIPTAÇÃO AES-256-GCM`,
      `${'='.repeat(60)}`,
      ``,
      `Arquivo no Drive : ${record.driveFileName}`,
      `Drive File ID    : ${record.driveFileId}`,
      `Drive Link       : ${record.driveLink}`,
      `Upload em        : ${record.createdAt.toISOString()}`,
      `Operador         : ${record.operatorEmail}`,
      ``,
      `AES KEY (hex)    : ${record.aesKeyHex}`,
      `AES IV  (hex)    : ${record.aesIvHex}`,
      `AUTH TAG (hex)   : ${record.aesAuthTagHex}`,
      ``,
      `ZIP SHA-256      : ${record.zipSha256}`,
      `ZIP Tamanho      : ${(record.zipSizeBytes / 1024).toFixed(1)} KB`,
      `ENC SHA-256      : ${record.encSha256}`,
      ``,
      `${'─'.repeat(60)}`,
      `INSTRUÇÕES DE DECRIPTAÇÃO (Python 3):`,
      ``,
      `  from cryptography.hazmat.primitives.ciphers.aead import AESGCM`,
      `  key  = bytes.fromhex("${record.aesKeyHex}")`,
      `  iv   = bytes.fromhex("${record.aesIvHex}")`,
      `  tag  = bytes.fromhex("${record.aesAuthTagHex}")`,
      `  with open("arquivo.zip.enc","rb") as f: ct = f.read()`,
      `  pt = AESGCM(key).decrypt(iv, ct + tag, None)`,
      `  with open("arquivo.zip","wb") as f: f.write(pt)`,
      ``,
      `AVISO: Guarde esta chave em local seguro e SEPARADO do arquivo`,
      `       criptografado. Sem ela, o arquivo não pode ser recuperado.`,
    ].join('\n');

    return new NextResponse(keyTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="NCFN_KEY_${record.driveFileName}_${Date.now()}.txt"`,
      },
    });
  }

  // ── REVOKE ────────────────────────────────────────────────────────────────
  if (action === 'revoke') {
    const { id, reason } = body;
    if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 });

    const record = await prisma.cloudCustody.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });

    // Remove do provider
    if ((record as any).provider === 'internxt') {
      await deleteFromInternxt(record.driveFileId).catch(() => {});
    } else {
      await deleteFromDrive(record.driveFileId).catch(() => {});
    }

    // Marca como revogado no DB
    await prisma.cloudCustody.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date(), revokedBy: user.email, revokeReason: reason || null, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}
