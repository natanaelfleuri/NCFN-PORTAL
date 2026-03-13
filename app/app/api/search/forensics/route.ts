// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const COFRE_BASE = path.resolve(process.cwd(), '../COFRE_NCFN');

export async function GET(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q')?.trim();

        if (!q || q.length < 2) {
            return NextResponse.json([]);
        }

        const results: any[] = [];

        // 1. Search OSINT investigations (OsintScheduledScan)
        try {
            const scans = await prisma.osintScheduledScan.findMany({
                where: {
                    OR: [
                        { target: { contains: q } },
                        { tool: { contains: q } },
                        { aiReport: { contains: q } },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                take: 8,
                select: {
                    id: true,
                    target: true,
                    tool: true,
                    status: true,
                    createdAt: true,
                },
            });

            for (const scan of scans) {
                results.push({
                    folder: 'investigações',
                    filename: `${scan.tool}:${scan.target}`,
                    size: 0,
                    mtime: scan.createdAt.toISOString(),
                    type: 'forensic_log',
                    id: scan.id,
                    taskName: `${scan.tool.toUpperCase()} → ${scan.target}`,
                    status: scan.status,
                    createdAt: scan.createdAt.toISOString(),
                });
            }
        } catch {}

        // 2. Search WebCapture records
        try {
            const captures = await prisma.webCapture.findMany({
                where: {
                    OR: [
                        { url: { contains: q } },
                        { serverIp: { contains: q } },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, url: true, status: true, createdAt: true },
            });

            if (captures.length) {
                for (const cap of captures) {
                    results.push({
                        folder: 'capturas-web',
                        filename: cap.url,
                        size: 0,
                        mtime: cap.createdAt.toISOString(),
                        type: 'forensic_log',
                        id: cap.id,
                        taskName: `WEB CAPTURE → ${cap.url}`,
                        status: cap.status,
                        createdAt: cap.createdAt.toISOString(),
                    });
                }
            }
        } catch {}

        // 3. Search laudo IA files in vault
        try {
            const laudoDir = path.join(COFRE_BASE, '[Laudo IA]');
            if (fs.existsSync(laudoDir)) {
                const files = fs.readdirSync(laudoDir).filter(f =>
                    f.toLowerCase().includes(q.toLowerCase())
                );
                for (const file of files.slice(0, 5)) {
                    const stat = fs.statSync(path.join(laudoDir, file));
                    results.push({
                        folder: '[Laudo IA]',
                        filename: file,
                        size: stat.size,
                        mtime: stat.mtime.toISOString(),
                        type: 'forensic_log',
                        id: file,
                        taskName: `LAUDO IA → ${file}`,
                        status: 'success',
                        createdAt: stat.mtime.toISOString(),
                    });
                }
            }
        } catch {}

        return NextResponse.json(results);
    } catch (error) {
        console.error('Erro na busca forense:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
