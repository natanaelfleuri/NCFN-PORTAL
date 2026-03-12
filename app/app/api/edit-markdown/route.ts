// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';

const ARQUIVOS_BASE = path.resolve(process.cwd(), '../arquivos');

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return new NextResponse('Não autorizado', { status: 401 });
        }
        const dbUser = await getDbUser(session.user.email);
        if (!dbUser || dbUser.role !== 'admin') {
            return new NextResponse('Acesso restrito a administradores', { status: 403 });
        }

        const body = await req.json();
        const { folder, filename, content } = body;

        if (!folder || !filename || content === undefined) {
            return new NextResponse('Dados incompletos', { status: 400 });
        }

        if (!filename.toLowerCase().endsWith('.md')) {
            return new NextResponse('Apenas edição de arquivos Markdown (.md) é permitida', { status: 403 });
        }

        const filePath = path.resolve(ARQUIVOS_BASE, folder, filename);

        // Prevent directory traversal
        if (!filePath.startsWith(ARQUIVOS_BASE + path.sep)) {
            return new NextResponse('Caminho inválido', { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return new NextResponse('Arquivo não encontrado', { status: 404 });
        }

        // Escreve o conteúdo atualizado no arquivo físico (Sincroniza com Obsidian)
        await fs.writeFile(filePath, content, 'utf8');

        return NextResponse.json({ success: true, message: 'Nota Zettelkasten atualizada com sucesso' });

    } catch (error) {
        console.error('Erro na gravação do Markdown:', error);
        return new NextResponse('Erro interno do servidor', { status: 500 });
    }
}
