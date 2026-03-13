export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { getToken } from 'next-auth/jwt';

const ARQUIVOS_DIR = path.join(process.cwd(), '../COFRE_NCFN');
const PROTECTED_FILES = ['_hashes_vps.txt', '_registros_acesso.txt'];

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (token?.role !== 'admin') {
            return NextResponse.json({ error: 'Ação restrita a administradores' }, { status: 403 });
        }

        const { folder } = await req.json();
        if (!folder) return NextResponse.json({ error: 'Pasta não informada' }, { status: 400 });

        const folderPath = path.join(ARQUIVOS_DIR, folder);
        if (!(await fs.pathExists(folderPath))) {
            return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 });
        }

        const files = await fs.readdir(folderPath);
        let deletedCount = 0;

        for (const file of files) {
            if (PROTECTED_FILES.includes(file)) continue;
            if (file === 'vazio.txt') continue;

            await fs.remove(path.join(folderPath, file));
            deletedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `${deletedCount} arquivos removidos. Arquivos forenses preservados.`
        });
    } catch (error) {
        console.error('[DELETE ALL ERROR]', error);
        return NextResponse.json({ error: 'Falha na execução da limpeza em massa' }, { status: 500 });
    }
}
