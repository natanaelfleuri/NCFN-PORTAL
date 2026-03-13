import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { triggerCanaryAlert } from '@/lib/canaryAlert';

export const dynamic = 'force-dynamic';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito (Admin)' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Caminho não fornecido' }, { status: 400 });
  }

  // Path traversal protection
  if (filePath.includes('..') || filePath.startsWith('/')) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 403 });
  }

  const vaultDir = path.join(process.cwd(), '../COFRE_NCFN');
  const fullPath = path.join(vaultDir, filePath);

  // Ensure resolved path is still inside vaultDir (include sep to prevent prefix-match bypass)
  if (!fullPath.startsWith(vaultDir + path.sep) && fullPath !== vaultDir) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';
  let fileBuffer = fs.readFileSync(fullPath);

  // Watermark invisível em PDFs: injeta metadados de rastreamento
  if (ext === '.pdf') {
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      pdfDoc.setAuthor(`NCFN-VAULT:${dbUser.id}`);
      pdfDoc.setCreator(`Portal NCFN | Acesso: ${new Date().toISOString()} | User: ${dbUser.email}`);
      pdfDoc.setKeywords([`ncfn_track:${dbUser.id}`, `ncfn_ts:${Date.now()}`]);
      fileBuffer = Buffer.from(await pdfDoc.save());
    } catch { /* serve original se o PDF não for carregável */ }
  }

  // Verificar e disparar alerta de canary file (async, não bloqueia resposta)
  const [fileFolder, fileName] = filePath.includes('/')
    ? [filePath.substring(0, filePath.lastIndexOf('/')), filePath.substring(filePath.lastIndexOf('/') + 1)]
    : ['', filePath];

  if (fileFolder && fileName) {
    prisma.canaryFile.findUnique({
      where: { folder_filename: { folder: fileFolder, filename: fileName } }
    }).then(async canary => {
      if (canary && canary.active) {
        const ip = (req as any).headers?.get?.('x-forwarded-for') ||
                   (req as any).headers?.get?.('x-real-ip') || '0.0.0.0';
        const newCount = canary.accessCount + 1;
        await Promise.all([
          prisma.canaryFile.update({
            where: { id: canary.id },
            data: { accessCount: newCount, lastAccessedAt: new Date() }
          }),
          triggerCanaryAlert({
            filename: canary.filename,
            folder: canary.folder,
            alertEmail: canary.alertEmail,
            accessorEmail: dbUser.email || 'unknown',
            ip,
            accessCount: newCount,
          }),
        ]);
      }
    }).catch(() => {/* silently ignore canary errors */});
  }

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
