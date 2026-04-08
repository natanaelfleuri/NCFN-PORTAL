export const dynamic = 'force-dynamic';
import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';


import { prisma } from '@/lib/prisma';


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePathParam = searchParams.get('path');
  
  if (!filePathParam) {
    return NextResponse.json({ error: 'Caminho não fornecido' }, { status: 400 });
  }

  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const dbUser = await getDbUser(session.user.email);

  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito (Admin)' }, { status: 403 });
  }

  const vaultDir = path.resolve(process.cwd(), '../COFRE_NCFN');
  const fullPath = path.resolve(vaultDir, filePathParam);

  // Path traversal guard — resolved path must stay within vaultDir
  if (!fullPath.startsWith(vaultDir + path.sep) && fullPath !== vaultDir) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
  }

  try {
    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    const parsed = matter(rawContent);
    return NextResponse.json({ 
      data: parsed.data, 
      content: parsed.content 
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao ler arquivo' }, { status: 500 });
  }
}
