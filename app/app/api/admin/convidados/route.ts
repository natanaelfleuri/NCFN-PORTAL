// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function superAdminGuard() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

export async function GET(req: NextRequest) {
  const user = await superAdminGuard();
  if (!user) return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });

  const convidados = await prisma.convidado.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ convidados });
}

export async function PATCH(req: NextRequest) {
  const user = await superAdminGuard();
  if (!user) return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });

  const { id, credenciamentoStatus } = await req.json();
  if (!id || !credenciamentoStatus) {
    return NextResponse.json({ error: 'id e credenciamentoStatus são obrigatórios.' }, { status: 400 });
  }

  const valid = ['pendente', 'teste_7dias', 'uso_pago', 'recusado'];
  if (!valid.includes(credenciamentoStatus)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
  }

  const updated = await prisma.convidado.update({
    where: { id },
    data: { credenciamentoStatus },
  });

  return NextResponse.json({ ok: true, convidado: updated });
}
