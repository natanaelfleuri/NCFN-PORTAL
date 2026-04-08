// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';

const IMG_DIR = path.resolve('/arquivos', 'doc-images');

async function adminGuard() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export async function POST(req: Request) {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return new NextResponse('Arquivo obrigatório', { status: 400 });

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) return new NextResponse(`Tipo não permitido: ${file.type}`, { status: 415 });

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) return new NextResponse('Arquivo muito grande (máx 10 MB)', { status: 413 });

    await fs.ensureDir(IMG_DIR);
    const filename = `${randomUUID()}.${ext}`;
    const dest = path.join(IMG_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dest, buffer);

    return NextResponse.json({ url: `/api/doc/image?file=${filename}` }, { status: 201 });
  } catch (error) {
    console.error('[doc/upload-image POST]', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
