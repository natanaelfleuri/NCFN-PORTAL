// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';

const COFRE_BASE    = path.resolve(process.cwd(), '../COFRE_NCFN');
const STATUS_FILE   = '_sansao_status.json';

async function adminGuard() {
    const session = await getSession();
    if (!session?.user?.email) return null;
    const dbUser = await getDbUser(session.user.email);
    return dbUser?.role === 'admin' ? dbUser : null;
}

// GET ?folder=X  → returns { [filename]: { status, lastCheck } }
export async function GET(req: Request) {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder')?.replace(/\.\./g, '') ?? '';
    if (!folder) return NextResponse.json({});

    const statusPath = path.join(COFRE_BASE, folder, STATUS_FILE);
    if (!statusPath.startsWith(COFRE_BASE)) return NextResponse.json({});

    try {
        if (fs.existsSync(statusPath)) {
            return NextResponse.json(JSON.parse(fs.readFileSync(statusPath, 'utf8')));
        }
    } catch (_) {}
    return NextResponse.json({});
}

// POST { folder, filename, status, lastCheck }  → writes/updates status
export async function POST(req: Request) {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { folder, filename, status, lastCheck } = await req.json().catch(() => ({}));
    if (!folder || !filename || !status) return new NextResponse('Parâmetros inválidos', { status: 400 });

    const folderPath = path.join(COFRE_BASE, folder.replace(/\.\./g, ''));
    if (!folderPath.startsWith(COFRE_BASE)) return new NextResponse('Inválido', { status: 400 });

    const statusPath = path.join(folderPath, STATUS_FILE);
    let current: Record<string, any> = {};
    try {
        if (fs.existsSync(statusPath)) current = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    } catch (_) {}

    current[filename] = { status, lastCheck: lastCheck || new Date().toISOString() };
    await fs.writeFile(statusPath, JSON.stringify(current, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
}
