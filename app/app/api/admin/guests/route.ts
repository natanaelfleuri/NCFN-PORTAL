import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

async function isAdmin() {
    const session = await getServerSession();
    return session?.user?.email === ADMIN_EMAIL;
}

export async function GET() {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const guests = await prisma.guestEmail.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(guests);
}

export async function POST(req: Request) {
    if (!await isAdmin()) {
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

export async function DELETE(req: Request) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const { email } = await req.json();
    await prisma.guestEmail.update({ where: { email }, data: { active: false } });
    return NextResponse.json({ ok: true });
}
