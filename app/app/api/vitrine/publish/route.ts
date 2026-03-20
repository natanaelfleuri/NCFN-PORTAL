// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw + 'ncfn_vitrine_salt').digest('hex');
}

// GET /api/vitrine/publish?folder=&filename= → list publishes for a file (admin)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder') || '';
  const filename = searchParams.get('filename') || '';
  const items = await prisma.vitrinePublish.findMany({
    where: { folder, filename, active: true },
    orderBy: { publishedAt: 'desc' },
  });
  return NextResponse.json(items);
}

// POST /api/vitrine/publish — create a vitrine entry
// body: { folder, filename, recipientName, password }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  const { folder, filename, recipientName, password } = await req.json();
  if (!folder || !filename || !recipientName || !password) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }
  const passwordHash = hashPassword(String(password));
  const entry = await prisma.vitrinePublish.create({
    data: { folder, filename, recipientName: recipientName.trim(), passwordHash },
  });
  return NextResponse.json({ ok: true, id: entry.id });
}

// DELETE /api/vitrine/publish?id=xxx — deactivate a vitrine entry (admin)
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  await prisma.vitrinePublish.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
