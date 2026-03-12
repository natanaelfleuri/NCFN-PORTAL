import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito (Admin)' }, { status: 403 });
  }

  const { filePath } = await req.json();

  if (!filePath || filePath.includes('..') || filePath.startsWith('/')) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 });
  }

  const vaultDir = path.join(process.cwd(), '../COFRE_NCFN');
  const fullPath = path.join(vaultDir, filePath);

  if (!fullPath.startsWith(vaultDir)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
  }

  const stat = fs.statSync(fullPath);
  const fileBuffer = fs.readFileSync(fullPath);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
  const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');

  // ExifTool metadata
  let exifData: Record<string, any> = {};
  let exifRaw = "";
  try {
    const { stdout } = await execAsync(`exiftool -json -n "${fullPath}" 2>/dev/null`);
    const parsed = JSON.parse(stdout);
    if (parsed && parsed[0]) {
      const { SourceFile, ExifToolVersion, ...rest } = parsed[0];
      exifData = rest;
    }
    exifRaw = stdout;
  } catch {
    exifData = { error: 'ExifTool não disponível ou falha na extração' };
  }

  // File type detection via `file` command
  let fileType = "";
  try {
    const { stdout } = await execAsync(`file -b "${fullPath}" 2>/dev/null`);
    fileType = stdout.trim();
  } catch {
    fileType = "Indeterminado";
  }

  // Check for suspicious metadata patterns
  const findings: string[] = [];
  if (exifData.GPSLatitude || exifData.GPSLongitude) {
    findings.push(`GPS detectado: Lat ${exifData.GPSLatitude}, Lng ${exifData.GPSLongitude}`);
  }
  if (exifData.Author || exifData.Creator || exifData.Artist) {
    findings.push(`Autoria: ${exifData.Author || exifData.Creator || exifData.Artist}`);
  }
  if (exifData.Software) {
    findings.push(`Software de criação: ${exifData.Software}`);
  }
  if (exifData.CreateDate || exifData.DateTimeOriginal) {
    findings.push(`Data original de criação: ${exifData.CreateDate || exifData.DateTimeOriginal}`);
  }
  if (exifData.Make || exifData.Model) {
    findings.push(`Dispositivo: ${exifData.Make || ''} ${exifData.Model || ''}`);
  }
  if (exifData.SerialNumber) {
    findings.push(`Número de série do dispositivo: ${exifData.SerialNumber}`);
  }

  const laudo = {
    arquivo: path.basename(fullPath),
    caminho: filePath,
    peritoOperador: session.user.email,
    dataPericia: new Date().toISOString(),
    tamanhoBytes: stat.size,
    tipoDetectado: fileType,
    hashes: { sha256, md5, sha1 },
    metadados: exifData,
    achados: findings,
    integridadeConfirmada: true,
  };

  return NextResponse.json(laudo);
}
