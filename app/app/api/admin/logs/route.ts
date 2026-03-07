import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const logs = await prisma.guestAccessLog.findMany({
        orderBy: { loginAt: 'desc' },
        take: 200,
    });

    return NextResponse.json(logs);
}

// Called by client to update lastSeenAt and calculate session duration
export async function PATCH(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email || token.email === ADMIN_EMAIL) {
        return NextResponse.json({ ok: false });
    }

    const { ip } = await req.json().catch(() => ({ ip: null }));

    // Find most recent log for this guest and update it
    const latestLog = await prisma.guestAccessLog.findFirst({
        where: { email: token.email as string },
        orderBy: { loginAt: 'desc' },
    });

    if (latestLog) {
        const now = new Date();
        const sessionMins = Math.floor((now.getTime() - latestLog.loginAt.getTime()) / 60000);
        await prisma.guestAccessLog.update({
            where: { id: latestLog.id },
            data: {
                lastSeenAt: now,
                sessionMins,
                ip: ip || latestLog.ip,
            },
        });
    }

    return NextResponse.json({ ok: true });
}
