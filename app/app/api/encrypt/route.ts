import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { folder, filename, password } = body;

        if (!folder || !filename || !password) {
            return new NextResponse('Dados ou Senha incompletos', { status: 400 });
        }

        const filePath = path.join(process.cwd(), '../arquivos', folder, filename);

        if (!fs.existsSync(filePath)) {
            return new NextResponse('Arquivo alvo não encontrado', { status: 404 });
        }

        if (filename.endsWith('.enc')) {
            return new NextResponse('Arquivo já se encontra com a blindagem criptográfica base ligada.', { status: 400 });
        }

        const destFilePath = `${filePath}.enc`;

        // Motor: Gerar chave fixa de 32 bytes através da senha do usuário
        const key = crypto.scryptSync(password, 'salt-forense-ncfn', 32);
        // Vetor de inicialização (IV) de 16 bytes
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const input = fs.createReadStream(filePath);
        const output = fs.createWriteStream(destFilePath);

        // Prepend o IV no começo do arquivo para permitir descriptografia futura
        output.write(iv);

        await new Promise((resolve, reject) => {
            input.pipe(cipher).pipe(output)
                .on('finish', () => resolve(true))
                .on('error', reject);
        });

        // Deleção do arquivo original vulnerável após criptografar Sênior (Semente de Segurança Secundária)
        await fs.unlink(filePath);

        return NextResponse.json({ success: true, message: 'Malha Criptográfica Aplicada (AES-256-CBC). O arquivo original foi expurgado.' });

    } catch (error) {
        console.error('Falha catastrófica no Motor Criptográfico:', error);
        return new NextResponse('Erro interno de Blindagem de Dados', { status: 500 });
    }
}
