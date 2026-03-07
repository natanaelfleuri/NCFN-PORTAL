// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();

        if (token.role === 'admin') {
            await prisma.user.update({
                where: { email: token.email },
                data: { policyAcceptedAt: now }
            });
        } else {
            await prisma.guestEmail.update({
                where: { email: token.email },
                data: { policyAcceptedAt: now }
            });
        }

        console.log(`[POLICY] Usuário ${token.email} aceitou as políticas em ${now.toISOString()}`);
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("[POLICY_ACCEPT_ERROR]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
