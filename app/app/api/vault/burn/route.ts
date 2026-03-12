export const dynamic = 'force-dynamic';
import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';

export async function POST(req: Request) {
  // Generate a burn token
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const dbUser = await getDbUser(session.user.email);
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Restrito a Admin' }, { status: 403 });
    }

    const { folder, filename } = await req.json();

    if (folder !== '09_BURN_IMMUTABILITY') {
      return NextResponse.json({ error: 'Burn tokens permitidos apenas para a Pasta 09_BURN_IMMUTABILITY' }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    const tokenPayload = { fileId, folder, filename, type: 'BURN' };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Store in DB, update if exists to prevent crashes
    await prisma.burnToken.upsert({
      where: {
        folder_filename: {
            folder,
            filename
        }
      },
      update: {
        token,
        consumed: false,
        consumedAt: null,
        fileId
      },
      create: {
        fileId,
        folder,
        filename,
        token,
      }
    });

    return NextResponse.json({ success: true, url: `/vault/burn?token=${token}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Consume a burn token
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'BURN') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const record = await prisma.burnToken.findUnique({
      where: { token }
    });

    if (!record) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    if (record.consumed) {
      return NextResponse.json({ error: 'Vazamento Evitado: Este documento já foi consumido e destruído em ' + record.consumedAt?.toISOString() }, { status: 410 });
    }

    // Mark as consumed
    await prisma.burnToken.update({
      where: { id: record.id },
      data: {
        consumed: true,
        consumedAt: new Date()
      }
    });

    const vaultDir = path.join(process.cwd(), '../COFRE_NCFN');
    const fullPath = path.join(vaultDir, record.folder, record.filename);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Arquivo não encontrado fisicamente' }, { status: 404 });
    }

    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    const parsed = matter(rawContent);

    return NextResponse.json({
      success: true,
      data: parsed.data,
      content: parsed.content,
      message: 'ATENÇÃO: Este documento foi destruído do acesso web após esta leitura.'
    });

  } catch (e: any) {
    return NextResponse.json({ error: 'Token expirado ou inválido' }, { status: 401 });
  }
}
