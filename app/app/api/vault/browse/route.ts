import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const VAULT_FOLDERS = [
  '0_NCFN-ULTRASECRETOS',
  '1_NCFN-PROVAS-SENSÍVEIS',
  '2_NCFN-ELEMENTOS-DE-PROVA',
  '3_NCFN-DOCUMENTOS-GERENTE',
  '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS',
  '5_NCFN-GOVERNOS-EMPRESAS',
  '6_NCFN-FORNECIDOS_sem_registro_de_coleta',
  '7_NCFN-CAPTURAS-WEB_OSINT',
  '8_NCFN-VIDEOS',
  '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS',
  '10_NCFN-ÁUDIO',
  '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS',
  '12_NCFN-METADADOS-LIMPOS',
  '100_BURN_IMMUTABILITY',
];

function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) return 'image';
  if (ext === '.pdf') return 'pdf';
  if (['.md', '.txt', '.log'].includes(ext)) return 'text';
  if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) return 'audio';
  if (ext === '.enc') return 'encrypted';
  if (['.har', '.wacz'].includes(ext)) return 'capture';
  return 'binary';
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito (Admin)' }, { status: 403 });
  }

  const vaultDir = path.join(process.cwd(), '../COFRE_NCFN');

  const result: Record<string, { name: string; files: any[] }> = {};

  for (const folder of VAULT_FOLDERS) {
    const folderPath = path.join(vaultDir, folder);
    const files: any[] = [];

    if (fs.existsSync(folderPath)) {
      const entries = fs.readdirSync(folderPath);
      for (const filename of entries) {
        const filePath = path.join(folderPath, filename);
        try {
          const stat = fs.statSync(filePath);
          if (!stat.isFile()) continue;

          const fileType = getFileType(filename);
          const fileBuffer = fs.readFileSync(filePath);
          const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

          files.push({
            name: filename,
            path: `${folder}/${filename}`,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            type: fileType,
            hash,
          });
        } catch {
          // skip unreadable files
        }
      }
    }

    result[folder] = {
      name: folder,
      files: files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
    };
  }

  return NextResponse.json(result);
}
