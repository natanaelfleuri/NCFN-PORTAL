import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get('hash');
  const id = searchParams.get('id');

  if (!hash && !id) {
    return NextResponse.json({ error: 'Parâmetro hash ou id obrigatório' }, { status: 400 });
  }

  if (hash) {
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return NextResponse.json({ error: 'Hash SHA-256 inválido' }, { status: 400 });
    }
    const record = await prisma.timestampRecord.findUnique({ where: { sha256: hash } });
    if (!record) {
      return NextResponse.json({ found: false, message: 'Hash não encontrado no registro de custódia' });
    }
    return NextResponse.json({
      found: true,
      sha256: record.sha256,
      filename: record.filename,
      folder: record.folder,
      captureId: record.captureId,
      tsaUrl: record.tsaUrl,
      timestampedAt: record.createdAt,
      hasTsr: !!record.tsrBase64,
    });
  }

  // Lookup by capture ID
  const capture = await prisma.webCapture.findUnique({
    where: { id: id! },
    select: {
      id: true, url: true, hashScreenshot: true, hashPdf: true, hashHtml: true,
      rfcTimestamp: true, status: true, createdAt: true, operatorEmail: true,
      serverIp: true, serverLocation: true,
    },
  });

  if (!capture) {
    return NextResponse.json({ found: false, message: 'Captura não encontrada' });
  }

  return NextResponse.json({ found: true, type: 'capture', capture });
}
