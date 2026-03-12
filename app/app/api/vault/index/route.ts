export const dynamic = 'force-dynamic';
import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';


const SECRET = process.env.NCFN_FORENSIC_SECRET || 'fallback-secret-for-dev';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const dbUser = await getDbUser(session.user.email);

  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito (Admin)' }, { status: 403 });
  }

  const vaultDir = path.join(process.cwd(), '../COFRE_NCFN');
  const indexPath = path.join(vaultDir, 'index.json');
  const sigPath = path.join(vaultDir, 'index.sig');

  if (!fs.existsSync(indexPath) || !fs.existsSync(sigPath)) {
    return NextResponse.json({ error: 'Índice de custódia não encontrado ou não gerado.' }, { status: 404 });
  }

  const rawIndex = fs.readFileSync(indexPath, 'utf-8');
  const existingSig = fs.readFileSync(sigPath, 'utf-8');
  
  const expectedSig = crypto.createHmac('sha256', SECRET).update(rawIndex).digest('hex');
  
  if (existingSig !== expectedSig) {
    return NextResponse.json({ 
      error: 'CRÍTICO: Assinatura de integridade do Vault é inválida! Cadeia de custódia quebrada.'
    }, { status: 500 });
  }

  try {
    const data = JSON.parse(rawIndex);
    return NextResponse.json(data);
  } catch(e) {
    return NextResponse.json({ error: 'Falha ao parsear índice de custódia.' }, { status: 500 });
  }
}
