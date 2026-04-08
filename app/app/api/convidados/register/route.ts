// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, name: string, code: string) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[convidados/register] SMTP not configured — skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({
    from: `"NCFN — Nexus Cyber Forensic Network" <${user}>`,
    to: email,
    subject: 'Seu código de verificação NCFN',
    html: `
      <div style="font-family:monospace;background:#020408;color:#ffffff;padding:40px;border-radius:12px;max-width:480px;margin:0 auto;">
        <h2 style="color:#00f3ff;margin-top:0;">NCFN — Verificação de E-mail</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Use o código abaixo para confirmar seu cadastro:</p>
        <div style="background:#0a0a14;border:2px solid #00f3ff33;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#00f3ff;">${code}</span>
        </div>
        <p style="color:#666;font-size:12px;">Este código expira em 15 minutos.</p>
        <p style="color:#666;font-size:11px;">Se você não fez este cadastro, ignore este e-mail.</p>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, solicitarCredenciamento, receberNoticias } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }

    const code = generateCode();
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const existing = await prisma.convidado.findUnique({ where: { email: email.trim().toLowerCase() } });

    if (existing?.verified) {
      return NextResponse.json({ error: 'Este e-mail já foi verificado. Faça login diretamente.' }, { status: 409 });
    }

    await prisma.convidado.upsert({
      where: { email: email.trim().toLowerCase() },
      create: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        solicitarCredenciamento: !!solicitarCredenciamento,
        receberNoticias: !!receberNoticias,
        verificationCode: code,
        codeExpiresAt,
      },
      update: {
        name: name.trim(),
        phone: phone?.trim() || null,
        solicitarCredenciamento: !!solicitarCredenciamento,
        receberNoticias: !!receberNoticias,
        verificationCode: code,
        codeExpiresAt,
      },
    });

    await sendVerificationEmail(email.trim(), name.trim(), code).catch(err => {
      console.error('[convidados/register] email error:', err);
    });

    return NextResponse.json({ ok: true, message: 'Código enviado para o seu e-mail.' });
  } catch (err) {
    console.error('[convidados/register]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
