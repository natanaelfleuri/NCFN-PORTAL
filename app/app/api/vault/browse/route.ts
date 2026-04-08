import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

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
  '12_NCFN-METADADOS-LIMPOS',
];

// Limite acima do qual não lemos o arquivo para computar hash (usa DB)
const HASH_READ_LIMIT = 10 * 1024 * 1024; // 10MB

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

  // Busca todos os FileStatus de uma vez (hash cache + R2 keys)
  const allStatuses = await prisma.fileStatus.findMany({
    where: { folder: { in: VAULT_FOLDERS } },
    select: { folder: true, filename: true, sha256: true, r2Key: true, size: true },
  });
  const statusMap = new Map<string, { sha256: string | null; r2Key: string | null; dbSize: number }>();
  for (const s of allStatuses) {
    statusMap.set(`${s.folder}/${s.filename}`, { sha256: s.sha256, r2Key: s.r2Key, dbSize: s.size });
  }

  const result: Record<string, { name: string; files: any[] }> = {};

  for (const folder of VAULT_FOLDERS) {
    const folderPath = path.join(vaultDir, folder);
    const files: any[] = [];

    // Arquivos locais
    if (fs.existsSync(folderPath)) {
      const entries = fs.readdirSync(folderPath);
      for (const filename of entries) {
        const filePath = path.join(folderPath, filename);
        try {
          const stat = fs.statSync(filePath);
          if (!stat.isFile()) continue;

          const key = `${folder}/${filename}`;
          const dbStatus = statusMap.get(key);

          // Hash: usa cache do banco se disponível, ou computa para arquivos pequenos
          let hash = dbStatus?.sha256 || null;
          if (!hash) {
            if (stat.size <= HASH_READ_LIMIT) {
              const fileBuffer = fs.readFileSync(filePath);
              hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            } else {
              hash = 'hash-pendente (arquivo grande)';
            }
          }

          files.push({
            name: filename,
            path: key,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            type: getFileType(filename),
            hash,
          });

          // Remove do statusMap para não duplicar com R2
          statusMap.delete(key);
        } catch {
          // skip unreadable files
        }
      }
    }

    // Arquivos R2 (não estão no filesystem local)
    for (const [key, status] of statusMap.entries()) {
      if (!key.startsWith(folder + '/')) continue;
      if (!status.r2Key) continue; // sem r2Key = arquivo local que sumiu, ignora
      const filename = key.slice(folder.length + 1);
      files.push({
        name: filename,
        path: key,
        size: status.dbSize,
        modifiedAt: new Date().toISOString(),
        type: getFileType(filename),
        hash: status.sha256 || 'hash-r2',
        r2: true, // flag para o cliente saber que é arquivo na nuvem
      });
      statusMap.delete(key);
    }

    result[folder] = {
      name: folder,
      files: files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
    };
  }

  return NextResponse.json(result);
}
