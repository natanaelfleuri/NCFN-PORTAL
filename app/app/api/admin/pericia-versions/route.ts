// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';

const VAULT_BASE = path.resolve(process.cwd(), '../COFRE_NCFN');
const MAX_VERSIONS = 2;

async function adminGuard() {
    const session = await getSession();
    if (!session?.user?.email) return null;
    const dbUser = await getDbUser(session.user.email);
    return dbUser?.role === 'admin' ? dbUser : null;
}

function parsePath(filePath: string): { folder: string; filename: string } | null {
    const clean = (filePath ?? '').replace(/\.\./g, '').replace(/^\//, '');
    const idx = clean.indexOf('/');
    if (idx === -1) return null;
    return { folder: clean.substring(0, idx), filename: clean.substring(idx + 1) };
}

function getPericiaDir(folder: string): string {
    return path.join(VAULT_BASE, folder, '.pericias');
}

function versionFilename(filename: string, v: number): string {
    return `${filename}_v${String(v).padStart(4, '0')}.json`;
}

function listVersions(folder: string, filename: string) {
    const dir = getPericiaDir(folder);
    if (!fs.existsSync(dir)) return [];
    const prefix = filename + '_v';
    return (fs.readdirSync(dir) as string[])
        .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
        .map(f => {
            const match = f.match(/_v(\d+)\.json$/);
            if (!match) return null;
            try {
                const stat = fs.statSync(path.join(dir, f));
                return { version: parseInt(match[1]), file: f, savedAt: stat.mtime.toISOString() };
            } catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => a!.version - b!.version) as Array<{ version: number; file: string; savedAt: string }>;
}

// GET ?filePath=folder/filename[&version=N] → list or read specific version
export async function GET(req: Request) {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('filePath') ?? '';
    const versionParam = searchParams.get('version');

    const parsed = parsePath(filePath);
    if (!parsed) return NextResponse.json([]);

    const { folder, filename } = parsed;
    const versions = listVersions(folder, filename);

    if (versionParam !== null) {
        const vNum = parseInt(versionParam);
        const entry = versions.find(v => v.version === vNum);
        if (!entry) return new NextResponse('Versão não encontrada', { status: 404 });
        const content = fs.readJsonSync(path.join(getPericiaDir(folder), entry.file));
        return NextResponse.json(content);
    }

    return NextResponse.json(versions.map(v => ({ version: v.version, savedAt: v.savedAt })));
}

// POST { filePath, laudo } → save new version, prune to MAX_VERSIONS
export async function POST(req: Request) {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { filePath, laudo } = await req.json().catch(() => ({}));
    if (!filePath || !laudo) return new NextResponse('Parâmetros inválidos', { status: 400 });

    const parsed = parsePath((filePath as string).replace(/\.\./g, ''));
    if (!parsed) return new NextResponse('Caminho inválido', { status: 400 });

    const { folder, filename } = parsed;
    const dir = getPericiaDir(folder);

    const dirFull = path.join(VAULT_BASE, folder);
    if (!dirFull.startsWith(VAULT_BASE)) return new NextResponse('Acesso negado', { status: 403 });

    await fs.ensureDir(dir);

    const existing = listVersions(folder, filename);
    const nextV = existing.length > 0 ? existing[existing.length - 1].version + 1 : 1;
    const newFile = versionFilename(filename, nextV);

    await fs.writeJson(path.join(dir, newFile), {
        ...laudo,
        _version: nextV,
        _savedAt: new Date().toISOString(),
    }, { spaces: 2 });

    // Prune — keep only the last MAX_VERSIONS
    const all = listVersions(folder, filename);
    if (all.length > MAX_VERSIONS) {
        const toDelete = all.slice(0, all.length - MAX_VERSIONS);
        for (const item of toDelete) {
            try { fs.removeSync(path.join(dir, item.file)); } catch {}
        }
    }

    return NextResponse.json({ ok: true, version: nextV });
}
