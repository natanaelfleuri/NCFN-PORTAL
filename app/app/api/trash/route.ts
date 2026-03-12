import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs-extra';
import path from 'path';

export const dynamic = 'force-dynamic';

const ROOT_ARCHIVES = path.join(process.cwd(), '../arquivos');
const TRASH_DIR = path.join(ROOT_ARCHIVES, 'lixeira');

async function getUserSession(_req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) return null;
    return await getDbUser(session.user.email);
}

export async function GET(req: NextRequest) {
    const user = await getUserSession(req);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    let items;
    if (user.role === 'admin' || user.role === 'superadmin') {
        items = await prisma.trashItem.findMany({ orderBy: { deletedAt: 'desc' } });
    } else {
        items = await prisma.trashItem.findMany({ where: { ownerId: user.id }, orderBy: { deletedAt: 'desc' } });
    }
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    const user = await getUserSession(req);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    try {
        const { folder, filename, permanent } = await req.json();
        const sourcePath = path.join(ROOT_ARCHIVES, folder, filename);

        const fileStatus = await prisma.fileStatus.findUnique({
            where: { folder_filename: { folder, filename } }
        });

        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        if (!isAdmin && fileStatus?.ownerId !== user.id) {
            return NextResponse.json({ error: 'Você só pode excluir seus próprios arquivos' }, { status: 403 });
        }

        if (!fs.existsSync(sourcePath)) {
            // Se o arquivo sumiu do disco, removemos do banco e pronto.
            if (fileStatus) await prisma.fileStatus.delete({ where: { id: fileStatus.id } });
            return NextResponse.json({ error: 'Arquivo já excluído ou não encontrado fisicamente' }, { status: 404 });
        }

        if (permanent) {
            await fs.remove(sourcePath);
            if (fileStatus) {
                if (fileStatus.ownerId) {
                    await prisma.user.update({
                        where: { id: fileStatus.ownerId },
                        data: {
                            uploadedFilesCount: { decrement: 1 },
                            totalBytesUsed: { decrement: fileStatus.size }
                        }
                    });
                }
                await prisma.fileStatus.delete({ where: { id: fileStatus.id } });
            }
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
                ownerId: fileStatus?.ownerId || user.id,
            },
        });

        if (fileStatus) {
            await prisma.fileStatus.delete({ where: { id: fileStatus.id } });
        }

        return NextResponse.json({ ok: true, msg: 'Movido para a lixeira' });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Erro ao processar exclusão' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const user = await getUserSession(req);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    try {
        const { id } = await req.json();
        const item = await prisma.trashItem.findUnique({ where: { id } });

        if (!item) return NextResponse.json({ error: 'Item não encontrado na lixeira' }, { status: 404 });

        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        if (!isAdmin && item.ownerId !== user.id) {
            return NextResponse.json({ error: 'Você não tem permissão para restaurar isso' }, { status: 403 });
        }

        const sourcePath = path.join(TRASH_DIR, item.filename);
        let destPath = path.join(ROOT_ARCHIVES, item.folder, item.originalPath);

        if (fs.existsSync(destPath)) {
            const ext = path.extname(item.originalPath);
            const base = path.basename(item.originalPath, ext);
            const newName = `${base}_restaurado_${Date.now()}${ext}`;
            destPath = path.join(ROOT_ARCHIVES, item.folder, newName);
            item.originalPath = newName;
        }

        if (fs.existsSync(sourcePath)) {
            await fs.move(sourcePath, destPath);
        }

        await prisma.trashItem.delete({ where: { id } });

        // Recriar FileStatus
        if (item.ownerId) {
            await prisma.fileStatus.create({
                data: {
                    filename: item.originalPath,
                    folder: item.folder,
                    size: item.size,
                    ownerId: item.ownerId,
                    isPublic: false
                }
            });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Erro ao restaurar arquivo' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getUserSession(req);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    try {
        const { id } = await req.json();
        const item = await prisma.trashItem.findUnique({ where: { id } });

        if (!item) return NextResponse.json({ ok: true });

        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        if (!isAdmin && item.ownerId !== user.id) {
            return NextResponse.json({ error: 'Permissão Negada' }, { status: 403 });
        }

        const filePath = path.join(TRASH_DIR, item.filename);
        if (fs.existsSync(filePath)) {
            await fs.remove(filePath);
        }

        // DECREMENT QUOTAS upon permanent deletion from trash!
        if (item.ownerId) {
            const itemOwner = await prisma.user.findUnique({ where: { id: item.ownerId }});
            if (itemOwner) {
                await prisma.user.update({
                    where: { id: item.ownerId },
                    data: {
                        uploadedFilesCount: { decrement: 1 },
                        totalBytesUsed: { decrement: item.size }
                    }
                });
            }
        }

        await prisma.trashItem.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Erro ao excluir permanentemente' }, { status: 500 });
    }
}
