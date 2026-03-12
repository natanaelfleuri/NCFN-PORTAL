// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function isAdmin(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return token?.role === 'admin';
}

export async function GET(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const guests = await prisma.guestEmail.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(guests);
}

export async function POST(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const { email, name } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });

    const guest = await prisma.guestEmail.upsert({
        where: { email },
        update: { active: true, name: name || null },
        create: { email, name: name || null, active: true },
    });
    return NextResponse.json(guest);
}

export async function DELETE(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const { email } = await req.json();
    await prisma.guestEmail.update({ where: { email }, data: { active: false } });
    return NextResponse.json({ ok: true });
}
