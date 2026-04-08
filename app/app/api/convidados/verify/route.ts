// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email?.trim() || !code?.trim()) {
      return NextResponse.json({ error: 'E-mail e código são obrigatórios.' }, { status: 400 });
    }

    const convidado = await prisma.convidado.findUnique({ where: { email: email.trim().toLowerCase() } });

    if (!convidado) {
      return NextResponse.json({ error: 'Cadastro não encontrado. Faça o cadastro primeiro.' }, { status: 404 });
    }

    if (convidado.verified) {
      return NextResponse.json({ ok: true, message: 'E-mail já verificado.' });
    }

    if (!convidado.verificationCode || !convidado.codeExpiresAt) {
      return NextResponse.json({ error: 'Código expirado. Refaça o cadastro.' }, { status: 400 });
    }

    if (new Date() > new Date(convidado.codeExpiresAt)) {
      return NextResponse.json({ error: 'Código expirado. Refaça o cadastro para receber um novo código.' }, { status: 400 });
    }

    if (convidado.verificationCode !== code.trim()) {
      return NextResponse.json({ error: 'Código inválido. Verifique e tente novamente.' }, { status: 400 });
    }

    await prisma.convidado.update({
      where: { email: email.trim().toLowerCase() },
      data: { verified: true, verificationCode: null, codeExpiresAt: null },
    });

    return NextResponse.json({ ok: true, message: 'E-mail verificado com sucesso! Análise gratuita liberada.' });
  } catch (err) {
    console.error('[convidados/verify]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
