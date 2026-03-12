// @ts-nocheck
import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autorizado. Faça o login.' }, { status: 401 });
        }

        const dbUser = await getDbUser(session.user.email);
        if (!dbUser || dbUser.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
        }

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

        const destFilePath = `${filePath.replace(/\.enc$/, '')}`;

        const salt = process.env.CRYPTO_SALT;
        if (!salt) {
            return new NextResponse('Configuração de criptografia (salt) ausente no servidor.', { status: 500 });
        }
        const key = crypto.scryptSync(password, salt, 32);

        const fileBuffer = await fs.readFile(filePath);
        if (fileBuffer.length < 16) {
            return new NextResponse('Falha de consistência: Arquivo comprometido.', { status: 400 });
        }

        const iv = fileBuffer.subarray(0, 16);
        const encryptedData = fileBuffer.subarray(16);

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        let decryptedData;
        try {
            decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        } catch {
            console.error("Senha Incorreta na Decriptografia Forense");
            return new NextResponse('Autorização Negada: Chave Assinale Criptográfica Inválida.', { status: 403 });
        }

        await fs.writeFile(destFilePath, decryptedData);
        await fs.unlink(filePath);

        return NextResponse.json({ success: true, message: 'Arquivo Descriptografado com sucesso. Restauração completada.' });

    } catch (error) {
        console.error('Falha de Sistema no Rastreio do Motor Criptográfico Sênior:', error);
        return new NextResponse('Erro interno Operacional', { status: 500 });
    }
}
