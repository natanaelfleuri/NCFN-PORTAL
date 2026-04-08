// @ts-nocheck
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getDbUser } from '@/lib/auth';
import AdmZip from 'adm-zip';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { type, ids } = body as { type: 'laudos' | 'capturas'; ids: string[] };

  if (!type || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'type e ids são obrigatórios' }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: 'Máximo 100 itens por exportação' }, { status: 400 });
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  try {
    if (type === 'laudos') {
      const laudos = await prisma.laudoForense.findMany({
        where: { id: { in: ids } },
      });

      const zip = new AdmZip();
      const manifest = {
        exportType: 'laudos',
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.email,
        count: laudos.length,
        system: 'NCFN — Nexus Cyber Forensic Network',
      };

      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

      for (const laudo of laudos) {
        const filename = `laudo_${laudo.id}_${sanitizeFilename(laudo.titulo)}.json`;
        let evidencias: any[] = [];
        try { evidencias = JSON.parse(laudo.evidencias || '[]'); } catch {}

        const exportData = {
          id: laudo.id,
          titulo: laudo.titulo,
          numeroCaso: laudo.numeroCaso,
          operatorEmail: laudo.operatorEmail,
          reportType: laudo.reportType,
          folder: laudo.folder,
          filename: laudo.filename,
          status: laudo.status,
          metodologia: laudo.metodologia,
          achados: laudo.achados,
          conclusao: laudo.conclusao,
          quesitos: laudo.quesitos,
          evidencias,
          finalReportExpiresAt: laudo.finalReportExpiresAt,
          createdAt: laudo.createdAt,
          updatedAt: laudo.updatedAt,
          exportedAt: new Date().toISOString(),
          exportedBy: session.user.email,
        };

        zip.addFile(`laudos/${filename}`, Buffer.from(JSON.stringify(exportData, null, 2), 'utf8'));
      }

      const zipBuffer = zip.toBuffer();
      return new Response(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename=ncfn_laudos_${dateStr}.zip`,
          'Content-Length': String(zipBuffer.length),
        },
      });
    }

    if (type === 'capturas') {
      // Try to fetch from CapturaWeb model if it exists
      let capturas: any[] = [];
      try {
        capturas = await (prisma as any).capturaWeb.findMany({
          where: { id: { in: ids } },
        });
      } catch {
        // If model doesn't exist, fall back to vault access logs
        capturas = await prisma.vaultAccessLog.findMany({
          where: { id: { in: ids } },
        });
      }

      const zip = new AdmZip();
      const manifest = {
        exportType: 'capturas',
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.email,
        count: capturas.length,
        system: 'NCFN — Nexus Cyber Forensic Network',
      };

      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

      for (const captura of capturas) {
        const filename = `captura_${captura.id}.json`;
        const exportData = {
          ...captura,
          exportedAt: new Date().toISOString(),
          exportedBy: session.user.email,
        };
        zip.addFile(`capturas/${filename}`, Buffer.from(JSON.stringify(exportData, null, 2), 'utf8'));
      }

      const zipBuffer = zip.toBuffer();
      return new Response(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename=ncfn_capturas_${dateStr}.zip`,
          'Content-Length': String(zipBuffer.length),
        },
      });
    }

    return NextResponse.json({ error: 'Tipo inválido. Use laudos ou capturas.' }, { status: 400 });

  } catch (err: any) {
    console.error('[export-batch]', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

function sanitizeFilename(str: string): string {
  return (str || 'sem_titulo')
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
}
