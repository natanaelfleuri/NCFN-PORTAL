// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        const body = await req.json();
        const { logId } = body;

        if (!logId) {
            return NextResponse.json({ error: 'logId obrigatório' }, { status: 400 });
        }

        const log = await prisma.auditLog.findUnique({ where: { id: logId } });
        if (!log) {
            return NextResponse.json({ error: 'Log não encontrado' }, { status: 404 });
        }

        // Generate report ID
        const reportId = `NCFN-RPT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const now = new Date();

        // Build text report (PDF generation would require @react-pdf/renderer which may not be installed)
        const report = {
            reportId,
            generatedAt: now.toISOString(),
            auditLog: {
                id: log.id,
                actionType: log.actionType,
                providedHash: log.providedHash,
                calculatedHash: log.calculatedHash,
                isMatch: log.isMatch,
                ipAddress: log.ipAddress,
                createdAt: log.createdAt,
            },
            verdict: log.isMatch
                ? 'CONFORME — A assinatura diverge em 0 bytes. O arquivo testado é uma cópia idêntica.'
                : 'CRÍTICO: DESCONFORMIDADE — A assinatura testada não corresponde à evidência custodiada.',
            operator: session?.user?.email || 'Anônimo',
        };

        // Return JSON report (frontend renders as PDF or displays)
        return NextResponse.json({ success: true, report });

    } catch (error) {
        console.error('Audit report error:', error);
        return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 });
    }
}
