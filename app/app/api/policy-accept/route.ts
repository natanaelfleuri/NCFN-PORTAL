// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();

        if (token.role === 'admin') {
            await prisma.user.upsert({
                where: { email: token.email },
                update: { policyAcceptedAt: now, lastSeenAt: now },
                create: { email: token.email, policyAcceptedAt: now, lastSeenAt: now },
            });
        } else {
            await prisma.guestEmail.upsert({
                where: { email: token.email },
                update: { policyAcceptedAt: now },
                create: { email: token.email, policyAcceptedAt: now },
            });
        }

        console.log(`[POLICY] Usuário ${token.email} aceitou as políticas em ${now.toISOString()}`);
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("[POLICY_ACCEPT_ERROR]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
