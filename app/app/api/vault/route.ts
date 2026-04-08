// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';
import { deleteFromCloud } from '@/lib/cloudBackup';

const VAULT_BASE = path.resolve(process.cwd(), '../COFRE_NCFN');
const IGNORED_DIRS = new Set(['.smart-env', '.trash', '.obsidian', '.git']);

type TreeNode = {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: TreeNode[];
};

function buildTree(dir: string, relBase: string): TreeNode[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const nodes: TreeNode[] = [];

    for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            nodes.push({
                name: entry.name,
                path: relPath,
                type: 'folder',
                children: buildTree(path.join(dir, entry.name), relPath),
            });
        } else {
            nodes.push({ name: entry.name, path: relPath, type: 'file' });
        }
    }

    // folders first, then files, both alphabetical
    nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt-BR');
    });

    return nodes;
}

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

// GET ?action=tree
// GET ?action=read&path=<relative>
export async function GET(req: Request) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });

        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action') ?? 'tree';

        if (action === 'tree') {
            if (!fs.existsSync(VAULT_BASE)) {
                return NextResponse.json([]);
            }
            const tree = buildTree(VAULT_BASE, '');
            return NextResponse.json(tree);
        }

        if (action === 'read') {
            const relPath = searchParams.get('path');
            if (!relPath) return new NextResponse('Parâmetro path obrigatório', { status: 400 });

            const filePath = resolveSafe(relPath);
            if (!filePath) return new NextResponse('Caminho inválido', { status: 403 });
            if (!fs.existsSync(filePath)) return new NextResponse('Arquivo não encontrado', { status: 404 });

            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) return new NextResponse('É um diretório', { status: 400 });

            const content = fs.readFileSync(filePath, 'utf8');
            return NextResponse.json({ content });
        }

        return new NextResponse('Ação desconhecida', { status: 400 });
    } catch (error) {
        console.error('[vault GET]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}

// POST { path, content }           → salva arquivo
// POST { path, action: "create_folder" } → cria pasta
export async function POST(req: Request) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });

        const body = await req.json();
        const { path: relPath, content, action } = body;

        if (!relPath) return new NextResponse('Parâmetro path obrigatório', { status: 400 });

        const filePath = resolveSafe(relPath);
        if (!filePath) return new NextResponse('Caminho inválido', { status: 403 });

        if (action === 'create_folder') {
            await fs.ensureDir(filePath);
            return NextResponse.json({ success: true });
        }

        // save file
        if (content === undefined) return new NextResponse('content obrigatório', { status: 400 });
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content, 'utf8');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[vault POST]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}

// DELETE ?path=<relative> → move para .trash
export async function DELETE(req: Request) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });

        const { searchParams } = new URL(req.url);
        const relPath = searchParams.get('path');
        if (!relPath) return new NextResponse('Parâmetro path obrigatório', { status: 400 });

        const filePath = resolveSafe(relPath);
        if (!filePath) return new NextResponse('Caminho inválido', { status: 403 });
        if (!fs.existsSync(filePath)) return new NextResponse('Não encontrado', { status: 404 });

        const trashDir = path.join(VAULT_BASE, '.trash');
        await fs.ensureDir(trashDir);
        const dest = path.join(trashDir, path.basename(filePath));
        await fs.move(filePath, dest, { overwrite: true });

        // Cascade: remove cópia criptografada do NC (GDrive preserva)
        deleteFromCloud(relPath).catch(e => console.error('[vault DELETE] cloudDelete error:', e));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[vault DELETE]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}
