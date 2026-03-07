// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();
const ROOT_ARCHIVES = path.join(process.cwd(), '../arquivos');
const TRASH_DIR = path.join(ROOT_ARCHIVES, 'lixeira');

async function isAdmin(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return token?.role === 'admin';
}

export async function GET(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    const items = await prisma.trashItem.findMany({ orderBy: { deletedAt: 'desc' } });
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    try {
        const { folder, filename, permanent } = await req.json();
        const sourcePath = path.join(ROOT_ARCHIVES, folder, filename);

        if (!fs.existsSync(sourcePath)) {
            return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
        }

        if (permanent) {
            await fs.remove(sourcePath);
            return NextResponse.json({ ok: true, msg: 'Excluído permanentemente' });
        }

        // Move to trash
        await fs.ensureDir(TRASH_DIR);
        const destPath = path.join(TRASH_DIR, `${Date.now()}_${filename}`);
        const stats = await fs.stat(sourcePath);

        await fs.move(sourcePath, destPath);

        await prisma.trashItem.create({
            data: {
                filename: path.basename(destPath),
                originalPath: filename, // original filename
                folder,
                size: stats.size,
                mtime: stats.mtime,
                deletedAt: new Date(),
            },
        });

        return NextResponse.json({ ok: true, msg: 'Movido para a lixeira' });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Erro ao processar exclusão' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    try {
        const { id } = await req.json();
        const item = await prisma.trashItem.findUnique({ where: { id } });

        if (!item) return NextResponse.json({ error: 'Item não encontrado na lixeira' }, { status: 404 });

        const sourcePath = path.join(TRASH_DIR, item.filename);
        const destPath = path.join(ROOT_ARCHIVES, item.folder, item.originalPath);

        if (fs.existsSync(destPath)) {
            // Se já existir um arquivo com o mesmo nome, renomear o restaurado
            const ext = path.extname(item.originalPath);
            const base = path.basename(item.originalPath, ext);
            const renamedPath = path.join(ROOT_ARCHIVES, item.folder, `${base}_restaurado_${Date.now()}${ext}`);
            await fs.move(sourcePath, renamedPath);
        } else {
            await fs.move(sourcePath, destPath);
        }

        await prisma.trashItem.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Erro ao restaurar arquivo' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    try {
        const { id } = await req.json();
        const item = await prisma.trashItem.findUnique({ where: { id } });

        if (item) {
            const filePath = path.join(TRASH_DIR, item.filename);
            await fs.remove(filePath);
            await prisma.trashItem.delete({ where: { id } });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Erro ao excluir permanentemente' }, { status: 500 });
    }
}
