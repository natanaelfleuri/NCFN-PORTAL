// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Restrito a administradores.' }, { status: 403 });
  }
  return NextResponse.json({ key: process.env.MASTER_DECRYPT_KEY || '' });
}
