// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        const body = await req.json();
        const { calculatedHash, referenceHash } = body;

        if (!calculatedHash || !referenceHash) {
            return NextResponse.json({ error: 'Hashes obrigatórios' }, { status: 400 });
        }

        const isMatch = calculatedHash.toLowerCase().trim() === referenceHash.toLowerCase().trim();

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('x-real-ip') || 'unknown';
        const userAgent = (req.headers.get('user-agent') || '').slice(0, 255);

        // Create AuditLog record
        const log = await prisma.auditLog.create({
            data: {
                actionType: 'AFERICAO_CRUZADA',
                providedHash: referenceHash.trim(),
                calculatedHash: calculatedHash.trim(),
                isMatch,
                ipAddress: ip,
                userAgent,
                userId: session?.user?.email || null,
            }
        });

        return NextResponse.json({
            isMatch,
            logId: log.id,
            message: isMatch
                ? 'CONFORME — Assinatura digital verificada com sucesso. Arquivo íntegro.'
                : 'CRÍTICO: DESCONFORMIDADE — A assinatura testada não corresponde à evidência custodiada.',
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Audit verify error:', error);
        return NextResponse.json({ error: 'Erro na verificação' }, { status: 500 });
    }
}
