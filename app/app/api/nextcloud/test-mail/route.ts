// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { sendSecureMail, reportEmailHtml } from '@/lib/secureMail';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: 'to obrigatório' }, { status: 400 });

  const html = reportEmailHtml({
    title: 'Teste de Email — NCFN Portal',
    id: `TEST-${Date.now()}`,
    metadata: {
      'Tipo':       'Email de Teste',
      'Portal':     'NCFN — Nexus Cyber Forensic Network',
      'Enviado por': session.user.email ?? 'admin',
      'Data/Hora':  new Date().toLocaleString('pt-BR'),
    },
  });

  const result = await sendSecureMail({ to, subject: '[NCFN] Teste de Email — SecureMail', html });
  return NextResponse.json(result);
}
