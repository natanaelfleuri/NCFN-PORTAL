// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Restrito a administradores.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const password = formData.get('password') as string | null;

    if (!file || !password) {
      return NextResponse.json({ error: 'Arquivo e senha obrigatórios.' }, { status: 400 });
    }

    const salt = process.env.CRYPTO_SALT;
    if (!salt) {
      return NextResponse.json({ error: 'CRYPTO_SALT não configurado no servidor.' }, { status: 500 });
    }

    const buf = Buffer.from(await file.arrayBuffer());

    // Formato: IV (16 bytes) + dados cifrados
    if (buf.length < 17) {
      return NextResponse.json({ error: 'Arquivo inválido ou corrompido.' }, { status: 400 });
    }

    const iv = buf.slice(0, 16);
    const encrypted = buf.slice(16);
    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    const originalName = file.name.replace(/\.enc(\.bin)?$/, '');

    return new NextResponse(decrypted, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Content-Length': decrypted.length.toString(),
      },
    });
  } catch (err: any) {
    // Senha errada → EVP_DecryptFinal_ex: bad decrypt
    if (err?.message?.includes('bad decrypt') || err?.message?.includes('wrong final block')) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 400 });
    }
    return NextResponse.json({ error: `Erro: ${err?.message}` }, { status: 500 });
  }
}
