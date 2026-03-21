// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';

const STORE_FILE = path.resolve('/arquivos', 'links-uteis.json');

interface Folder {
    id: string;
    name: string;
    createdAt: string;
}

interface Note {
    id: string;
    title: string;
    content: string;
    folderId?: string | null;
    createdAt: string;
    updatedAt: string;
    highlights?: string[];
    pinned?: boolean;
    color?: string | null;
}

interface Store {
    folders: Folder[];
    notes: Note[];
}

async function adminGuard() {
    const session = await getSession();
    if (!session?.user?.email) return null;
    const dbUser = await getDbUser(session.user.email);
    if (!dbUser || dbUser.role !== 'admin') return null;
    return dbUser;
}

async function readStore(): Promise<Store> {
    await fs.ensureDir(path.dirname(STORE_FILE));
    if (!fs.existsSync(STORE_FILE)) return { folders: [], notes: [] };
    try {
        const raw = await fs.readJson(STORE_FILE);
        if (Array.isArray(raw)) return { folders: [], notes: raw };
        return { folders: raw.folders ?? [], notes: raw.notes ?? [] };
    } catch {
        return { folders: [], notes: [] };
    }
}

async function writeStore(store: Store) {
    await fs.ensureDir(path.dirname(STORE_FILE));
    await fs.writeJson(STORE_FILE, store, { spaces: 2 });
}

export async function GET() {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });
        const store = await readStore();
        return NextResponse.json(store);
    } catch (error) {
        console.error('[links-uteis GET]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });

        const body = await req.json();
        const store = await readStore();
        const now = new Date().toISOString();

        if (body.type === 'folder') {
            const name = body.name?.trim();
            if (!name) return new NextResponse('Nome obrigatório', { status: 400 });
            const folder: Folder = { id: randomUUID(), name, createdAt: now };
            store.folders.push(folder);
            await writeStore(store);
            return NextResponse.json(folder, { status: 201 });
        }

        const { id, title, content, folderId } = body;
        if (!title?.trim()) return new NextResponse('Título obrigatório', { status: 400 });

        if (id) {
            const idx = store.notes.findIndex(n => n.id === id);
            if (idx === -1) return new NextResponse('Nota não encontrada', { status: 404 });
            store.notes[idx] = {
                ...store.notes[idx],
                title: title.trim(),
                content: content ?? '',
                folderId: folderId !== undefined ? (folderId ?? null) : store.notes[idx].folderId,
                highlights: body.highlights !== undefined ? body.highlights : store.notes[idx].highlights,
                pinned: body.pinned !== undefined ? body.pinned : store.notes[idx].pinned,
                color: body.color !== undefined ? body.color : store.notes[idx].color,
                updatedAt: now,
            };
            await writeStore(store);
            return NextResponse.json(store.notes[idx]);
        }

        const note: Note = {
            id: randomUUID(),
            title: title.trim(),
            content: content ?? '',
            folderId: folderId ?? null,
            createdAt: now,
            updatedAt: now,
        };
        store.notes.unshift(note);
        await writeStore(store);
        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error('[links-uteis POST]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });
        const body = await req.json();
        const store = await readStore();
        const now = new Date().toISOString();

        // Reorder folders
        if (body.type === 'reorder-folders') {
            const { ids }: { ids: string[] } = body;
            const map = Object.fromEntries(store.folders.map(f => [f.id, f]));
            const ordered: Folder[] = [];
            for (const fid of ids) { if (map[fid]) ordered.push(map[fid]); }
            for (const f of store.folders) { if (!ids.includes(f.id)) ordered.push(f); }
            store.folders = ordered;
            await writeStore(store);
            return NextResponse.json({ success: true });
        }

        // Quick patch a note (pin, color, highlights, folderId only)
        if (body.type === 'patch-note') {
            const { id, ...fields } = body;
            const idx = store.notes.findIndex(n => n.id === id);
            if (idx === -1) return new NextResponse('Nota não encontrada', { status: 404 });
            const allowed = ['highlights', 'pinned', 'color', 'folderId'];
            const patch: Partial<Note> = {};
            for (const k of allowed) {
                if (k in fields) (patch as any)[k] = fields[k];
            }
            store.notes[idx] = { ...store.notes[idx], ...patch, updatedAt: now };
            await writeStore(store);
            return NextResponse.json(store.notes[idx]);
        }

        // Rename folder
        if (body.type === 'rename-folder') {
            const { id, name } = body;
            const idx = store.folders.findIndex(f => f.id === id);
            if (idx === -1) return new NextResponse('Pasta não encontrada', { status: 404 });
            store.folders[idx] = { ...store.folders[idx], name: name.trim() };
            await writeStore(store);
            return NextResponse.json(store.folders[idx]);
        }

        return new NextResponse('Tipo não reconhecido', { status: 400 });
    } catch (error) {
        console.error('[links-uteis PATCH]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const type = searchParams.get('type');
        if (!id) return new NextResponse('id obrigatório', { status: 400 });

        const store = await readStore();

        if (type === 'folder') {
            store.folders = store.folders.filter(f => f.id !== id);
            store.notes = store.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n);
            await writeStore(store);
            return NextResponse.json({ success: true });
        }

        const before = store.notes.length;
        store.notes = store.notes.filter(n => n.id !== id);
        if (store.notes.length === before) return new NextResponse('Nota não encontrada', { status: 404 });
        await writeStore(store);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[links-uteis DELETE]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}
