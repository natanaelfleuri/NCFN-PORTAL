// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPresignedGetUrl } from '@/lib/r2';

// Retorna URL assinada (15min) para download direto de arquivo R2
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const dbUser = await getDbUser(session.user.email);
    if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder');
    const filename = searchParams.get('filename');

    if (!folder || !filename) {
      return NextResponse.json({ error: 'folder e filename são obrigatórios' }, { status: 400 });
    }

    const fileStatus = await prisma.fileStatus.findUnique({
      where: { folder_filename: { folder, filename } },
      select: { r2Key: true },
    });

    if (!fileStatus?.r2Key) {
      return NextResponse.json({ error: 'Arquivo não encontrado no R2' }, { status: 404 });
    }

    const downloadUrl = await createPresignedGetUrl(fileStatus.r2Key);
    return NextResponse.json({ url: downloadUrl, expiresIn: 900 });
  } catch (err: any) {
    console.error('[r2-download]', err);
    return NextResponse.json({ error: 'Erro ao gerar link de download' }, { status: 500 });
  }
}
