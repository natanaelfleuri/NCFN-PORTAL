// @ts-nocheck
import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autorizado. Faça o login.' }, { status: 401 });
        }

        const dbUser = await getDbUser(session.user.email);

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const folder = formData.get('folder') as string;

        if (!file || !folder) {
            return NextResponse.json({ error: 'Arquivo ou pasta corrompidos' }, { status: 400 });
        }

        // RATE LIMIT: 20 uploads por minuto por usuário
        if (!checkRateLimit(`upload:${session.user.email}`, 20, 60_000)) {
            return NextResponse.json({ error: 'Limite de requisições atingido. Aguarde 1 minuto.' }, { status: 429 });
        }

        // TRIAL LIMITS
        if (dbUser.planType === 'TRIAL' || !dbUser.planType) {
            if (dbUser.uploadedFilesCount >= 10) {
                return NextResponse.json({ error: 'Cota de 10 Arquivos Violada (TRIAL). Faça upgrade para NCFN Pro.' }, { status: 403 });
            }
            if (dbUser.totalBytesUsed + file.size > 1073741824) { // 1GB
                return NextResponse.json({ error: 'Armazenamento de 1GB Excedido (TRIAL). Faça upgrade para NCFN Pro.' }, { status: 403 });
            }
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileHash = require('crypto').createHash('sha256').update(buffer).digest('hex');

        // Caminho da pasta que está mapeada fisicamente
        const rootPath = path.join(process.cwd(), '../COFRE_NCFN');
        const folderPath = path.resolve(rootPath, folder);
        if (!folderPath.startsWith(rootPath + path.sep) && folderPath !== rootPath) {
            return NextResponse.json({ error: 'Caminho de pasta inválido' }, { status: 403 });
        }
        const safeFilename = path.basename(file.name);
        const filePath = path.join(folderPath, safeFilename);

        await fs.ensureDir(folderPath); // Garante que a pasta exista
        await fs.writeFile(filePath, buffer);

        // ── Auto-criptografia AES-256-CBC ─────────────────────────────────
        const autoPassword = crypto.randomBytes(24).toString('base64').replace(/[+/=]/g, '').slice(0, 32);
        const salt = process.env.CRYPTO_SALT || 'ncfn-salt';
        const key = crypto.scryptSync(autoPassword, salt, 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const encBuffer = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
        await fs.writeFile(`${filePath}.enc.bin`, encBuffer);

        // ── Cópia de imutabilidade em 100_BURN_IMMUTABILITY ──────────────
        try {
          const burnDir = path.join(rootPath, '100_BURN_IMMUTABILITY');
          await fs.ensureDir(burnDir);
          // Salva cópia plaintext (original) com prefixo de timestamp
          const burnFilename = `${Date.now()}_${safeFilename}`;
          await fs.copyFile(filePath, path.join(burnDir, burnFilename));
          // Manifesto: mapeia folder/filename → burnFilename para recuperação no ZIP
          const manifestPath = path.join(burnDir, '_burn_manifest.json');
          let manifest: Record<string, string> = {};
          try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}
          manifest[`${folder}/${safeFilename}`] = burnFilename;
          await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
          await fs.appendFile(
            path.join(burnDir, '_registros_burn.txt'),
            `[UPLOAD_BURN] ${new Date().toISOString()} | ${session.user.email} | ${folder}/${safeFilename} | SHA-256=${fileHash} | burn=${burnFilename}\n`,
          );
        } catch {} // falha silenciosa

        // ── Relatório forense de recepção ─────────────────────────────────
        const sha256hash = fileHash; // already computed above
        const md5hash = crypto.createHash('md5').update(buffer).digest('hex');
        const reportContent = `=========================================================
RELATÓRIO DE RECEPÇÃO FORENSE — NCFN
=========================================================
Arquivo: ${safeFilename}
Pasta: ${folder}
Tamanho: ${file.size} bytes
Upload em: ${new Date().toLocaleString('pt-BR')}
Uploader: ${session.user.email}

INTEGRIDADE:
  SHA-256: ${sha256hash}
  MD5:     ${md5hash}

CÓPIA AES GERADA: ${safeFilename}.enc.bin
  Algoritmo: AES-256-CBC (scrypt key derivation)
  SENHA: ${autoPassword}

⚠️  GUARDE A SENHA ACIMA EM LOCAL MUITO SEGURO.
     Sem ela não será possível recuperar o arquivo.
=========================================================
`;
        await fs.writeFile(`${filePath}.RECIBO.txt`, reportContent, 'utf8');

        // Update Database Counters & Link File
        await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                uploadedFilesCount: { increment: 1 },
                totalBytesUsed: { increment: file.size }
            }
        });

        await prisma.fileStatus.upsert({
            where: { folder_filename: { folder, filename: safeFilename } },
            update: { ownerId: dbUser.id, size: file.size },
            create: { folder, filename: safeFilename, isPublic: false, ownerId: dbUser.id, size: file.size }
        });

        // Ping do Administrador (Alimenta e Reseta a bomba do Dead Man Switch)
        if (dbUser.role === 'admin' || dbUser.role === 'superadmin') {
            await fs.writeFile(path.join(process.cwd(), '../COFRE_NCFN/_LAST_SEEN_ADMIN.txt'), new Date().toISOString(), 'utf8').catch(() => { });
        }

        // Dispara Hash + RFC3161 Timestamp em background
        const baseUrl = req.headers.get('origin') || `http://${req.headers.get('host') || 'localhost:3000'}`;
        fetch(`${baseUrl}/api/hash?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(safeFilename)}`)
            .catch(err => console.error("Erro no Auto-Hash Background:", err));
        fetch(`${baseUrl}/api/timestamp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash: fileHash, filename: safeFilename, folder }),
        }).catch(err => console.error("Erro no Auto-Timestamp Background:", err));

        return NextResponse.json({ success: true, filename: safeFilename, encPassword: autoPassword });
    } catch (error) {
        console.error("Erro de upload:", error);
        return NextResponse.json({ error: 'Erro de processamento no upload' }, { status: 500 });
    }
}
