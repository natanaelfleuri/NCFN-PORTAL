// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { r2ObjectExists, getR2ObjectStream } from '@/lib/r2';
import crypto from 'crypto';

// Chamado pelo browser após upload direto ao R2 terminar.
// Registra o arquivo no banco, computa SHA-256 em stream e dispara timestamp.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const dbUser = await getDbUser(session.user.email);
    if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { r2Key, folder, filename, size } = await req.json();
    if (!r2Key || !folder || !filename || !size) {
      return NextResponse.json({ error: 'r2Key, folder, filename e size são obrigatórios' }, { status: 400 });
    }

    // Confirma que o objeto realmente existe no R2
    const exists = await r2ObjectExists(r2Key);
    if (!exists) {
      return NextResponse.json({ error: 'Arquivo não encontrado no R2. Upload pode ter falhado.' }, { status: 404 });
    }

    // Computa SHA-256 fazendo stream do arquivo (sem carregar na memória)
    const stream = await getR2ObjectStream(r2Key);
    const fileHash = await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });

    // Registra no banco (inclui hash para o browse não precisar reler o arquivo)
    await prisma.fileStatus.upsert({
      where: { folder_filename: { folder, filename } },
      update: { ownerId: dbUser.id, size, r2Key, sha256: fileHash },
      create: { folder, filename, isPublic: false, ownerId: dbUser.id, size, r2Key, sha256: fileHash },
    });

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        uploadedFilesCount: { increment: 1 },
        totalBytesUsed: { increment: size },
      },
    });

    // Dispara timestamp RFC 3161 em background (não bloqueia a resposta)
    const baseUrl = req.headers.get('origin') || `http://${req.headers.get('host') || 'localhost:3000'}`;
    fetch(`${baseUrl}/api/timestamp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: fileHash, filename, folder }),
    }).catch((err) => console.error('[r2-confirm] timestamp error:', err));

    return NextResponse.json({ success: true, filename, hash: fileHash, r2: true });
  } catch (err: any) {
    console.error('[r2-confirm]', err);
    return NextResponse.json({ error: 'Erro ao confirmar upload R2' }, { status: 500 });
  }
}
