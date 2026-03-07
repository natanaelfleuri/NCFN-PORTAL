import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');

        if (!q) {
            return NextResponse.json([]);
        }

        const logs = await prisma.moltbotLog.findMany({
            where: {
                OR: [
                    { taskName: { contains: q } },
                    { logText: { contains: q } }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const formatted = logs.map(log => ({
            id: log.id,
            taskName: log.taskName,
            status: log.status,
            createdAt: log.createdAt,
            type: 'forensic_log'
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Erro na busca forense:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
