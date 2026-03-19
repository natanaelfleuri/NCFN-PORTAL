// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const VAULT_BASE = path.resolve(process.cwd(), '../COFRE_NCFN');
const PUBLIC_FOLDER = '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS';

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

// POST — multipart (upload) or JSON (delete, trash, make-public)
export async function POST(req: NextRequest) {
    try {
        const user = await adminGuard();
        if (!user) return new NextResponse('Não autorizado', { status: 401 });

        const contentType = req.headers.get('content-type') || '';

        // ── File upload (multipart) ────────────────────────────────────────
        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const folder = formData.get('folder') as string;
            const file = formData.get('file') as File;

            if (!folder || !file) {
                return new NextResponse('folder e file são obrigatórios', { status: 400 });
            }

            const folderPath = resolveSafe(folder);
            if (!folderPath) return new NextResponse('Pasta inválida', { status: 403 });

            await fs.ensureDir(folderPath);

            const destPath = path.join(folderPath, file.name);
            const arrayBuffer = await file.arrayBuffer();
            await fs.writeFile(destPath, Buffer.from(arrayBuffer));

            // Capture EXIF baseline at upload time (immutable reference)
            try {
                const exifInitialPath = path.join(folderPath, '_exif_inicial.json');
                let exifInitialMap: Record<string, { exif: Record<string, any>; timestamp: string }> = {};
                try {
                    if (fs.existsSync(exifInitialPath)) {
                        exifInitialMap = JSON.parse(fs.readFileSync(exifInitialPath, 'utf-8'));
                    }
                } catch {}
                // Only write if not already present (preserve true upload baseline)
                if (!exifInitialMap[file.name]) {
                    let exifData: Record<string, any> = {};
                    try {
                        const raw = execSync(`exiftool -json -short "${destPath}" 2>/dev/null`, { timeout: 8000 }).toString();
                        exifData = JSON.parse(raw)?.[0] || {};
                    } catch {}
                    exifInitialMap[file.name] = { exif: exifData, timestamp: new Date().toISOString() };
                    fs.writeFileSync(exifInitialPath, JSON.stringify(exifInitialMap, null, 2), 'utf-8');
                }
            } catch {}

            return NextResponse.json({ success: true, message: `"${file.name}" enviado para ${folder}.` });
        }

        // ── JSON actions ─────────────────────────────────────────────────
        const body = await req.json();
        const { action, filePath } = body;

        if (!action || !filePath) {
            return new NextResponse('action e filePath são obrigatórios', { status: 400 });
        }

        const absPath = resolveSafe(filePath);
        if (!absPath) return new NextResponse('Caminho inválido', { status: 403 });
        if (!fs.existsSync(absPath)) return new NextResponse('Arquivo não encontrado', { status: 404 });

        // ── Permanent delete ──────────────────────────────────────────────
        if (action === 'permanent-delete') {
            await fs.remove(absPath);
            return NextResponse.json({ success: true, message: 'Arquivo excluído permanentemente.' });
        }

        // ── Move to trash ─────────────────────────────────────────────────
        if (action === 'trash') {
            const trashDir = path.join(VAULT_BASE, '.trash');
            await fs.ensureDir(trashDir);
            const dest = path.join(trashDir, path.basename(absPath));
            await fs.move(absPath, dest, { overwrite: true });
            return NextResponse.json({ success: true, message: 'Arquivo enviado para a lixeira.' });
        }

        // ── Make public (copy to folder 11 + mark in DB) ──────────────────
        if (action === 'make-public') {
            const publicDir = path.join(VAULT_BASE, PUBLIC_FOLDER);
            await fs.ensureDir(publicDir);
            const destFilename = path.basename(absPath);
            const dest = path.join(publicDir, destFilename);
            await fs.copy(absPath, dest, { overwrite: true });
            // Mark as public in DB so vitrine can find it
            try {
                await prisma.fileStatus.upsert({
                    where: { folder_filename: { folder: PUBLIC_FOLDER, filename: destFilename } },
                    create: { folder: PUBLIC_FOLDER, filename: destFilename, isPublic: true, ownerId: user.id || undefined },
                    update: { isPublic: true },
                });
            } catch {}
            return NextResponse.json({ success: true, message: `Arquivo copiado para "${PUBLIC_FOLDER}".` });
        }

        // ── Burn delete (100_BURN_IMMUTABILITY only, with audit log) ──────
        if (action === 'burn-delete') {
            const burnPath = absPath;
            const parts = filePath.split('/');
            const burFolder = parts[0];
            if (!burFolder.startsWith('100_BURN')) {
                return new NextResponse('Exclusão BURN apenas na pasta 100_BURN_IMMUTABILITY', { status: 403 });
            }
            // Log de ciência de exclusão
            const logEntry = `[BURN_DELETE] ${new Date().toISOString()} | operador=${user.email} | arquivo=${filePath} | acao=EXCLUSAO_CONFIRMADA_COM_CIENCIA\n`;
            try {
                await fs.appendFile(path.join(VAULT_BASE, '100_BURN_IMMUTABILITY', '_registros_burn.txt'), logEntry);
            } catch {}
            // Log de auditoria geral
            try {
                await prisma.vaultAccessLog.create({
                    data: { filePath, action: 'burn-delete', userEmail: user.email, ip: null, isCanary: false },
                });
            } catch {}
            await fs.remove(burnPath);
            return NextResponse.json({ success: true, message: 'Arquivo BURN excluído com registro de ciência.' });
        }

        return new NextResponse('Ação desconhecida', { status: 400 });
    } catch (err) {
        console.error('[vault/actions POST]', err);
        return new NextResponse('Erro interno', { status: 500 });
    }
}
