// @ts-nocheck
import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autorizado. Faça o login.' }, { status: 401 });
        }

        const dbUser = await getDbUser(session.user.email);

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const folder = formData.get('folder') as string;

        if (!file || !folder) {
            return NextResponse.json({ error: 'Arquivo ou pasta corrompidos' }, { status: 400 });
        }

        // RATE LIMIT: 20 uploads por minuto por usuário
        if (!checkRateLimit(`upload:${session.user.email}`, 20, 60_000)) {
            return NextResponse.json({ error: 'Limite de requisições atingido. Aguarde 1 minuto.' }, { status: 429 });
        }

        // TRIAL LIMITS
        if (dbUser.planType === 'TRIAL' || !dbUser.planType) {
            if (dbUser.uploadedFilesCount >= 10) {
                return NextResponse.json({ error: 'Cota de 10 Arquivos Violada (TRIAL). Faça upgrade para NCFN Pro.' }, { status: 403 });
            }
            if (dbUser.totalBytesUsed + file.size > 1073741824) { // 1GB
                return NextResponse.json({ error: 'Armazenamento de 1GB Excedido (TRIAL). Faça upgrade para NCFN Pro.' }, { status: 403 });
            }
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileHash = require('crypto').createHash('sha256').update(buffer).digest('hex');

        // Caminho da pasta que está mapeada fisicamente
        const rootPath = path.join(process.cwd(), '../arquivos');
        const folderPath = path.join(rootPath, folder);
        const filePath = path.join(folderPath, file.name);

        await fs.ensureDir(folderPath); // Garante que a pasta exista
        await fs.writeFile(filePath, buffer);

        // Update Database Counters & Link File
        await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                uploadedFilesCount: { increment: 1 },
                totalBytesUsed: { increment: file.size }
            }
        });

        await prisma.fileStatus.upsert({
            where: { folder_filename: { folder, filename: file.name } },
            update: { ownerId: dbUser.id, size: file.size },
            create: { folder, filename: file.name, isPublic: false, ownerId: dbUser.id, size: file.size }
        });

        // Ping do Administrador (Alimenta e Reseta a bomba do Dead Man Switch)
        if (dbUser.role === 'admin' || dbUser.role === 'superadmin') {
            await fs.writeFile(path.join(rootPath, '_LAST_SEEN_ADMIN.txt'), new Date().toISOString(), 'utf8').catch(() => { });
        }

        // Dispara Hash + RFC3161 Timestamp em background
        const baseUrl = req.headers.get('origin') || `http://${req.headers.get('host') || 'localhost:3000'}`;
        fetch(`${baseUrl}/api/hash?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(file.name)}`)
            .catch(err => console.error("Erro no Auto-Hash Background:", err));
        fetch(`${baseUrl}/api/timestamp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash: fileHash, filename: file.name, folder }),
        }).catch(err => console.error("Erro no Auto-Timestamp Background:", err));

        return NextResponse.json({ success: true, filename: file.name });
    } catch (error) {
        console.error("Erro de upload:", error);
        return NextResponse.json({ error: 'Erro de processamento no upload' }, { status: 500 });
    }
}
