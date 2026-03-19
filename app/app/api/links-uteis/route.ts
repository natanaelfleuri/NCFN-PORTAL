// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';

const NOTES_FILE = path.resolve('/arquivos', 'links-uteis.json');

interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

async function adminGuard() {
    const session = await getSession();
    if (!session?.user?.email) return null;
    const dbUser = await getDbUser(session.user.email);
    if (!dbUser || dbUser.role !== 'admin') return null;
    return dbUser;
}

async function readNotes(): Promise<Note[]> {
    await fs.ensureDir(path.dirname(NOTES_FILE));
    if (!fs.existsSync(NOTES_FILE)) return [];
    try {
        return await fs.readJson(NOTES_FILE);
    } catch {
        return [];
    }
}

async function writeNotes(notes: Note[]) {
    await fs.ensureDir(path.dirname(NOTES_FILE));
    await fs.writeJson(NOTES_FILE, notes, { spaces: 2 });
}

// GET → lista todas as notas
export async function GET() {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });
        const notes = await readNotes();
        return NextResponse.json(notes);
    } catch (error) {
        console.error('[links-uteis GET]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}

// POST { id?, title, content } → cria ou atualiza
export async function POST(req: Request) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });

        const body = await req.json();
        const { id, title, content } = body;

        if (!title?.trim()) return new NextResponse('Título obrigatório', { status: 400 });

        const notes = await readNotes();
        const now = new Date().toISOString();

        if (id) {
            const idx = notes.findIndex(n => n.id === id);
            if (idx === -1) return new NextResponse('Nota não encontrada', { status: 404 });
            notes[idx] = { ...notes[idx], title: title.trim(), content: content ?? '', updatedAt: now };
            await writeNotes(notes);
            return NextResponse.json(notes[idx]);
        }

        const note: Note = {
            id: randomUUID(),
            title: title.trim(),
            content: content ?? '',
            createdAt: now,
            updatedAt: now,
        };
        notes.unshift(note);
        await writeNotes(notes);
        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error('[links-uteis POST]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}

// DELETE ?id=xxx → remove nota
export async function DELETE(req: Request) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return new NextResponse('id obrigatório', { status: 400 });

        const notes = await readNotes();
        const filtered = notes.filter(n => n.id !== id);
        if (filtered.length === notes.length) return new NextResponse('Nota não encontrada', { status: 404 });

        await writeNotes(filtered);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[links-uteis DELETE]', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}
