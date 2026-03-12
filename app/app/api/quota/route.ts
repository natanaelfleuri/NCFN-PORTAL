import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const dbUser = await getDbUser(session.user.email);

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        // Conta quantos tokens de burn o usuário possui através de seus arquivos
        const burnTokensCount = await prisma.burnToken.count({
            where: {
                file: {
                    ownerId: dbUser.id
                }
            }
        });

        return NextResponse.json({
            planType: dbUser.planType,
            uploadedFilesCount: dbUser.uploadedFilesCount,
            totalBytesUsed: Number(dbUser.totalBytesUsed),
            burn_tokens: burnTokensCount,
            user: {
                ...dbUser,
                totalBytesUsed: Number(dbUser.totalBytesUsed),
                burn_tokens: burnTokensCount
            }
        });

    } catch (error) {
        console.error("Erro na API de cota:", error);
        return NextResponse.json({ error: 'Falha ao buscar cota' }, { status: 500 });
    }
}
