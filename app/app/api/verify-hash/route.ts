import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Arquivo Ausente' }, { status: 400 });
        }

        // Lê o arquivo inteiramente para a RAM temporária do Node.js (Vercel)
        // O arquivo NUNCA toca o disco rígido do servidor.
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Gera o Hash em memória
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        // O Node descarta o buffer automaticamente no Garbage Collector após o Retorno
        return NextResponse.json({ success: true, hash, filename: file.name });
    } catch (error) {
        console.error("Erro no Auditor Online In-Memory:", error);
        return NextResponse.json({ error: 'Erro de processamento da malha forense' }, { status: 500 });
    }
}
