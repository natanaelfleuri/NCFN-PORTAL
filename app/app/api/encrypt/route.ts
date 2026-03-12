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

        if (filename.endsWith('.enc')) {
            return new NextResponse('Arquivo já se encontra com a blindagem criptográfica base ligada.', { status: 400 });
        }

        const destFilePath = `${filePath}.enc`;

        const salt = process.env.CRYPTO_SALT;
        if (!salt) {
            return new NextResponse('Configuração de criptografia (salt) ausente no servidor.', { status: 500 });
        }
        const key = crypto.scryptSync(password, salt, 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const input = fs.createReadStream(filePath);
        const output = fs.createWriteStream(destFilePath);

        output.write(iv);

        await new Promise((resolve, reject) => {
            input.pipe(cipher).pipe(output)
                .on('finish', () => resolve(true))
                .on('error', reject);
        });

        await fs.unlink(filePath);

        return NextResponse.json({ success: true, message: 'Malha Criptográfica Aplicada (AES-256-CBC). O arquivo original foi expurgado.' });

    } catch (error) {
        console.error('Falha catastrófica no Motor Criptográfico:', error);
        return new NextResponse('Erro interno de Blindagem de Dados', { status: 500 });
    }
}
