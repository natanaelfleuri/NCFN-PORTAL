import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const folder = formData.get('folder') as string;

        if (!file || !folder) {
            return NextResponse.json({ error: 'Arquivo ou pasta corrompidos' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Caminho da pasta que está mapeada fisicamente
        const filePath = path.join(process.cwd(), '../arquivos', folder, file.name);

        await fs.writeFile(filePath, buffer);

        // Ping do Administrador (Alimenta e Reseta a bomba do Dead Man Switch)
        const rootPath = path.join(process.cwd(), '../arquivos');
        await fs.writeFile(path.join(rootPath, '_LAST_SEEN_ADMIN.txt'), new Date().toISOString(), 'utf8').catch(() => { });

        // Dispara a geração de Hash em Fallback (Background) sem travar a resposta do Upload
        // Passando a URL completa local caso o fetch precise de host absoluto na Vercel/Node
        const baseUrl = req.headers.get('origin') || `http://${req.headers.get('host') || 'localhost:3000'}`;
        fetch(`${baseUrl}/api/hash?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(file.name)}`)
            .catch(err => console.error("Erro no Auto-Hash Background:", err));

        return NextResponse.json({ success: true, filename: file.name });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Erro de processamento no upload' }, { status: 500 });
    }
}
