// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';

const IMG_DIR = path.resolve('/arquivos', 'doc-images');

async function adminGuard() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml',
};

export async function GET(req: Request) {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { searchParams } = new URL(req.url);
    const file = searchParams.get('file');
    if (!file) return new NextResponse('file obrigatório', { status: 400 });

    // Security: prevent path traversal
    const safe = path.basename(file);
    const fullPath = path.join(IMG_DIR, safe);
    if (!fullPath.startsWith(IMG_DIR)) return new NextResponse('Inválido', { status: 400 });

    if (!fs.existsSync(fullPath)) return new NextResponse('Não encontrado', { status: 404 });

    const ext = safe.split('.').pop()?.toLowerCase() ?? '';
    const mime = EXT_MIME[ext] ?? 'application/octet-stream';
    const buffer = await fs.readFile(fullPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[doc/image GET]', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
