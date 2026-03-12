import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';


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

        return NextResponse.json([]);
    } catch (error) {
        console.error('Erro na busca forense:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
