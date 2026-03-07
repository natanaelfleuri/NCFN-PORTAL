import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const folder = searchParams.get('folder');
        const filename = searchParams.get('filename');

        if (!folder || !filename) return new NextResponse('Faltam parâmetros', { status: 400 });

        const filePath = path.join(process.cwd(), '../arquivos', folder, filename);

        if (!fs.existsSync(filePath)) return new NextResponse('Arquivo não encontrado', { status: 404 });

        // Stream calculation for large files (Senior approach)
        return new Promise<NextResponse>((resolve) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', async () => {
                const finalHash = hash.digest('hex');
                const stat = await fs.stat(filePath);

                // --- Registro Sênior de Hashes no Diretório ---
                const folderPath = path.join(process.cwd(), '../arquivos', folder);
                const reportPath = path.join(folderPath, '_Lista_de_Hashes_SHA256.txt');

                const timestampBR = new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }).format(new Date());

                const fileSize = formatBytes(stat.size);

                const logEntry = `[${timestampBR}] - ARQUIVO: ${filename} | TAMANHO: ${fileSize} | SHA-256: ${finalHash}\n`;

                // Create or append to the record file
                await fs.appendFile(reportPath, logEntry, 'utf8');

                resolve(NextResponse.json({ hash: finalHash }));
            });
            stream.on('error', (error) => {
                console.error("Error internally in app API", error);
                resolve(NextResponse.json({ error: 'Falha ao processar arquivo' }, { status: 500 }));
            });
        });

    } catch (error) {
        console.error("Error internally in app API", error);
        console.error(error);
        return NextResponse.json({ error: 'Erro interno no Motor de Hash' }, { status: 500 });
    }
}
