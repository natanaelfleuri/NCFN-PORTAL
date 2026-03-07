import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { folder, filename, content } = body;

        if (!folder || !filename || content === undefined) {
            return new NextResponse('Dados incompletos', { status: 400 });
        }

        if (!filename.toLowerCase().endsWith('.md')) {
            return new NextResponse('Apenas edição de arquivos Markdown (.md) é permitida', { status: 403 });
        }

        const filePath = path.join(process.cwd(), '../arquivos', folder, filename);

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
