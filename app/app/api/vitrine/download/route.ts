// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { prisma } from '@/lib/prisma';

const VAULT = path.join(process.cwd(), '../COFRE_NCFN');

const README_TXT = `=========================================================
NCFN — GUIA DE VERIFICAÇÃO DE AUTENTICIDADE
=========================================================

Este pacote foi gerado automaticamente pelo sistema NCFN.NET
(Nexus Cloud Forensic Network) e contém:

 1. O arquivo original intacto (com cadeia de custódia ativa)
 2. Este guia de verificação

COMO VERIFICAR A AUTENTICIDADE DO ARQUIVO:

  Windows (CMD / PowerShell):
    certutil -hashfile <nome_do_arquivo> SHA256

  Linux / macOS:
    sha256sum <nome_do_arquivo>

Compare o resultado com o hash SHA-256 fornecido pelo portal
NCFN. Se os valores divergirem, o arquivo foi adulterado e
perde validade probatória judicial.

=========================================================
AVISO LEGAL: Este arquivo e seu hash SHA-256 estão registrados
na cadeia de custódia do protocolo NCFN. O acesso que gerou
este download foi registrado com timestamp e IP para fins
de conformidade legal.
=========================================================
`;

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const folder = searchParams.get('folder');
        const filename = searchParams.get('filename');

        if (!folder || !filename) {
            return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 });
        }

        // Security: prevent path traversal
        const folderPath = path.resolve(VAULT, folder);
        if (!folderPath.startsWith(VAULT + path.sep) && folderPath !== VAULT) {
            return NextResponse.json({ error: 'Caminho inválido' }, { status: 403 });
        }

        const filePath = path.join(folderPath, path.basename(filename));
        if (!await fs.pathExists(filePath)) {
            return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
        }

        // Check file is public
        const fileStatus = await prisma.fileStatus.findUnique({
            where: { folder_filename: { folder, filename: path.basename(filename) } }
        }).catch(() => null);

        if (fileStatus && !fileStatus.isPublic) {
            return NextResponse.json({ error: 'Acesso negado — arquivo não público' }, { status: 403 });
        }

        // Log access
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('x-real-ip') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        console.log(`[VITRINE] Download: ${folder}/${filename} | IP: ${ip}`);

        // Build ZIP with adm-zip
        const fileBuffer = await fs.readFile(filePath);
        const zip = new AdmZip();
        zip.addFile(path.basename(filename), fileBuffer);
        zip.addFile('leia-me_verificacao.txt', Buffer.from(README_TXT, 'utf-8'));
        const zipBuffer = zip.toBuffer();

        return new NextResponse(zipBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${path.basename(filename, path.extname(filename))}_NCFN_CERTIFY.zip"`,
                'Content-Length': String(zipBuffer.length),
                'X-NCFN-Access-Logged': 'true',
            }
        });

    } catch (error) {
        console.error('Vitrine download error:', error);
        return NextResponse.json({ error: 'Erro ao gerar pacote forense' }, { status: 500 });
    }
}
