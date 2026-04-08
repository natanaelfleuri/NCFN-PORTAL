// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { createPresignedPutUrl } from '@/lib/r2';
import path from 'path';
import crypto from 'crypto';

const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

// Pastas permitidas (mesma lista do VaultClient)
const ALLOWED_FOLDERS = [
  '1_DOCUMENTOS', '2_IMAGENS', '3_VIDEOS', '4_AUDIOS',
  '5_ARQUIVOS-COMPACTADOS', '6_PLANILHAS', '7_NCFN-CAPTURAS-WEB_OSINT',
  '8_LAUDOS-E-RELATORIOS', '9_BACKUPS', '10_OUTROS',
];

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const dbUser = await getDbUser(session.user.email);
    if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    if (!checkRateLimit(`r2-presign:${session.user.email}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Limite atingido. Aguarde 1 minuto.' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder');
    const filename = searchParams.get('filename');
    const sizeStr = searchParams.get('size');
    const contentType = searchParams.get('contentType') || 'application/octet-stream';

    if (!folder || !filename || !sizeStr) {
      return NextResponse.json({ error: 'folder, filename e size são obrigatórios' }, { status: 400 });
    }

    const size = parseInt(sizeStr, 10);
    if (isNaN(size) || size < LARGE_FILE_THRESHOLD) {
      return NextResponse.json({ error: 'Use /api/vault/actions para arquivos menores que 50MB' }, { status: 400 });
    }

    // Valida a pasta
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 });
    }

    // Verifica cotas
    if (dbUser.planType === 'TRIAL' || !dbUser.planType) {
      if (dbUser.uploadedFilesCount >= 10) {
        return NextResponse.json({ error: 'Cota de 10 arquivos excedida (TRIAL).' }, { status: 403 });
      }
      if (dbUser.totalBytesUsed + size > 1073741824) {
        return NextResponse.json({ error: 'Armazenamento de 1GB excedido (TRIAL).' }, { status: 403 });
      }
    }

    const safeFilename = path.basename(filename);
    const r2Key = `vault/${folder}/${Date.now()}_${safeFilename}`;

    const presignedUrl = await createPresignedPutUrl(r2Key, contentType, size);

    return NextResponse.json({ presignedUrl, r2Key, filename: safeFilename });
  } catch (err: any) {
    console.error('[r2-presign]', err);
    if (err.message?.includes('R2 não configurado')) {
      return NextResponse.json({ error: 'R2 não configurado no servidor. Contate o administrador.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
