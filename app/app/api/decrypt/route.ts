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

        if (!filename.endsWith('.enc')) {
            return new NextResponse('Arquivo não consta como criptografado (.enc)', { status: 400 });
        }

        const destFilePath = `${filePath.replace(/\.enc$/, '')}`; // Remove extensão .enc

        const key = crypto.scryptSync(password, 'salt-forense-ncfn', 32);

        // O arquivo .enc gravou o 'iv' de 16 bytes no início dele. Precisamos ler.
        const fileBuffer = await fs.readFile(filePath);
        if (fileBuffer.length < 16) {
            return new NextResponse('Falha de consistência: Arquivo comprometido.', { status: 400 });
        }

        const iv = fileBuffer.subarray(0, 16);
        const encryptedData = fileBuffer.subarray(16);

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        // Em caso de senha errada, a decriptação solta Exceção.
        let decryptedData;
        try {
            decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        } catch {
            console.error("Senha Incorreta na Decriptografia Forense");
            return new NextResponse('Autorização Negada: Chave Assinale Criptográfica Inválida.', { status: 403 });
        }

        await fs.writeFile(destFilePath, decryptedData);
        // Deleta o engatilhado `.enc` após conversão segura.
        await fs.unlink(filePath);

        return NextResponse.json({ success: true, message: 'Arquivo Descriptografado com sucesso. Restauração completada.' });

    } catch (error) {
        console.error('Falha de Sistema no Rastreio do Motor Criptográfico Sênior:', error);
        return new NextResponse('Erro interno Operacional', { status: 500 });
    }
}
