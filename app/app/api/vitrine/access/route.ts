// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

// GET /api/vitrine/access?folder=&filename=  → list viewers for a file
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder') || '';
  const filename = searchParams.get('filename') || '';
  if (!folder || !filename) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

  const viewers = await prisma.fileViewer.findMany({
    where: { folder, filename },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ viewers });
}

// POST /api/vitrine/access
// body: { folder, filename, email, action: 'add' | 'remove' | 'add48h' }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  const { folder, filename, email, action } = await req.json();
  if (!folder || !filename || !email || !action) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (action === 'remove') {
    await prisma.fileViewer.deleteMany({ where: { folder, filename, email: normalizedEmail } });
    return NextResponse.json({ ok: true });
  }

  const expiresAt = action === 'add48h'
    ? new Date(Date.now() + 48 * 60 * 60 * 1000)
    : null;

  await prisma.fileViewer.upsert({
    where: { folder_filename_email: { folder, filename, email: normalizedEmail } },
    update: { expiresAt },
    create: { folder, filename, email: normalizedEmail, expiresAt },
  });

  return NextResponse.json({ ok: true });
}
