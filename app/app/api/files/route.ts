import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';

const ARQUIVOS_DIR = path.join(process.cwd(), '../COFRE_NCFN');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const isPublicRequested = searchParams.get('public') === 'true';

        // Check session role
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        
        if (token?.role === 'guest') {
            return NextResponse.json([]);
        }

        const folders = await fs.readdir(ARQUIVOS_DIR);
        const allFiles = [];

        for (const folder of folders) {
            const folderPath = path.join(ARQUIVOS_DIR, folder);
            const statDir = await fs.stat(folderPath);
            if (statDir.isDirectory()) {
                const filesInDir = await fs.readdir(folderPath);
                for (const file of filesInDir) {
                    if (file.startsWith('_')) continue; // Skip internal forensic files
                    const filePath = path.join(folderPath, file);
                    const statFile = await fs.stat(filePath);
                    allFiles.push({ folder, filename: file, size: statFile.size, mtime: statFile.mtime });
                }
            }
        }

        const dbStatus = await prisma.fileStatus.findMany();
        const statusMap = new Map();
        dbStatus.forEach(s => statusMap.set(`${s.folder}/${s.filename}`, s.isPublic));

        // Filter results: If public requested and no admin session, only show public files
        const isAdmin = token?.role === 'admin';
        
        const result = allFiles
            .map(f => ({
                ...f,
                isPublic: statusMap.get(`${f.folder}/${f.filename}`) || false
            }))
            .filter(f => {
                if (isAdmin) return true;
                if (isPublicRequested) return f.isPublic;
                return token ? true : false; // Logged in users see all unless guest, others see nothing unless public requested
            });

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Erro ao ler arquivos do disco' }, { status: 500 });
    }
}

async function updateForensicFiles(folder: string, folderPath: string) {
    try {
        const files = await fs.readdir(folderPath);
        const normalFiles = files.filter(f => !f.startsWith('_'));

        // 1. Update _hashes_vps.txt
        const hashFilePath = path.join(folderPath, '_hashes_vps.txt');
        let hashContent = `=========================================================\n`;
        hashContent += `NCFN FORENSIC INTEGRITY - HASH LIST [SHA-256]\n`;
        hashContent += `FOLDER: ${folder}\n`;
        hashContent += `UPDATED: ${new Date().toLocaleString('pt-BR')}\n`;
        hashContent += `=========================================================\n\n`;

        for (const file of normalFiles) {
            const filePath = path.join(folderPath, file);
            const fileBuffer = await fs.readFile(filePath);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            hashContent += `${hash} | ${file}\n`;
        }

        await fs.writeFile(hashFilePath, hashContent, 'utf8');

        // 2. Ensure _registros_acesso.txt exists
        const accessLogPath = path.join(folderPath, '_registros_acesso.txt');
        if (!fs.existsSync(accessLogPath)) {
            const header = `=========================================================\nNCFN ACCESS LOGS - ${folder}\n=========================================================\n\n`;
            await fs.writeFile(accessLogPath, header, 'utf8');
        }

    } catch (err) {
        console.error(`Error updating forensic files for ${folder}:`, err);
    }
}

export async function POST(req: NextRequest) {
    try {
        // Only admin can change visibility
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (token?.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }
        const { folder, filename, isPublic } = await req.json();
        const updated = await prisma.fileStatus.upsert({
            where: { folder_filename: { folder, filename } },
            update: { isPublic },
            create: { folder, filename, isPublic },
        });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
    }
}
