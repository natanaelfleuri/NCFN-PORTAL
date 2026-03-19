// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const dbUser = await getDbUser(session.user.email);
    if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('filePath');
    const limitParam = parseInt(searchParams.get('limit') || '100');

    const where = filePath ? { filePath } : {};

    const logs = await prisma.vaultAccessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limitParam,
    });

    return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const dbUser = await getDbUser(session.user.email);
    if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

    const { filePath, action } = await req.json();
    if (!filePath || !action) return NextResponse.json({ error: 'filePath e action obrigatórios' }, { status: 400 });

    await prisma.vaultAccessLog.create({
        data: { filePath, action, userEmail: dbUser.email, ip: null, isCanary: false },
    });

    return NextResponse.json({ ok: true });
}
