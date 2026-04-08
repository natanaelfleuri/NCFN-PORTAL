// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import fs from 'fs';
import path from 'path';

const VAULT_BASE = path.resolve(process.cwd(), '../COFRE_NCFN');
const FOLDER_7 = '7_NCFN-CAPTURAS-WEB_OSINT';

async function adminGuard() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

function resolveSafe(relPath: string): string | null {
  const resolved = path.resolve(VAULT_BASE, relPath);
  if (!resolved.startsWith(VAULT_BASE + path.sep) && resolved !== VAULT_BASE) return null;
  return resolved;
}

// POST — save coleta attestation for a file
export async function POST(req: NextRequest) {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    if (!checkRateLimit(`vault-coleta:${user.email}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Limite de requisições atingido. Aguarde 1 minuto.' }, { status: 429 });
    }

    const body = await req.json();
    const { folder, filename, attestsVeracity, collectedByUser, collectionDate, filled } = body;

    if (!folder || !filename) {
      return new NextResponse('folder e filename obrigatórios', { status: 400 });
    }

    // Block folder 7
    if (folder === FOLDER_7) {
      return new NextResponse('Pasta 7 não requer atestado de coleta', { status: 400 });
    }

    const folderPath = resolveSafe(folder);
    if (!folderPath) return new NextResponse('Pasta inválida', { status: 403 });
    if (!fs.existsSync(folderPath)) return new NextResponse('Pasta não encontrada', { status: 404 });

    const coletaPath = path.join(folderPath, '_coleta_info.json');
    let coletaMap: Record<string, any> = {};
    try {
      if (fs.existsSync(coletaPath)) {
        coletaMap = JSON.parse(fs.readFileSync(coletaPath, 'utf-8'));
      }
    } catch {}

    coletaMap[filename] = {
      filled: filled !== false,
      attestsVeracity: attestsVeracity ?? false,
      collectedByUser: collectedByUser ?? false,
      collectionDate: collectionDate || null,
      operator: user.email,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(coletaPath, JSON.stringify(coletaMap, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[vault/coleta POST]', err);
    return new NextResponse('Erro interno', { status: 500 });
  }
}

// GET — read coleta info for a file
export async function GET(req: NextRequest) {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder');
    const filename = searchParams.get('filename');
    if (!folder || !filename) return NextResponse.json({ data: null });

    const folderPath = resolveSafe(folder);
    if (!folderPath) return NextResponse.json({ data: null });

    const coletaPath = path.join(folderPath, '_coleta_info.json');
    if (!fs.existsSync(coletaPath)) return NextResponse.json({ data: null });

    const map = JSON.parse(fs.readFileSync(coletaPath, 'utf-8'));
    return NextResponse.json({ data: map[filename] || null });
  } catch {
    return NextResponse.json({ data: null });
  }
}
