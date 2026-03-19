// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';

const COFRE_BASE = path.resolve(process.cwd(), '../COFRE_NCFN');

async function adminGuard() {
    const session = await getSession();
    if (!session?.user?.email) return null;
    const dbUser = await getDbUser(session.user.email);
    return dbUser?.role === 'admin' ? dbUser : null;
}

export async function GET(req: Request) {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { searchParams } = new URL(req.url);
    const folder   = searchParams.get('folder')?.replace(/\.\./g, '') ?? '';
    const filename = searchParams.get('filename')?.replace(/\.\./g, '') ?? '';

    if (!folder || !filename) return new NextResponse('Parâmetros inválidos', { status: 400 });

    const folderPath = path.join(COFRE_BASE, folder);
    if (!folderPath.startsWith(COFRE_BASE)) return new NextResponse('Inválido', { status: 400 });

    // Try to read .RECIBO.txt file created at upload
    const reciboPath = path.join(folderPath, `${filename}.RECIBO.txt`);
    let recibo: string | null = null;
    if (fs.existsSync(reciboPath)) {
        recibo = fs.readFileSync(reciboPath, 'utf8');
    }

    // File stat for basic metadata
    const filePath = path.join(folderPath, filename);
    let stat: fs.Stats | null = null;
    try { stat = fs.statSync(filePath); } catch (_) {}

    return NextResponse.json({
        recibo,
        size: stat?.size ?? null,
        mtime: stat?.mtime?.toISOString() ?? null,
        birthtime: stat?.birthtime?.toISOString() ?? null,
    });
}
