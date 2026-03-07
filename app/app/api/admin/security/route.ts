// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email || token.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: token.email } });

        return NextResponse.json({
            deadManSwitchDays: user?.deadManSwitchDays || 0,
            deadManTriggerAction: user?.deadManTriggerAction || 'LOCKDOWN'
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email || token.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { deadManSwitchDays, deadManTriggerAction } = await req.json();

        await prisma.user.update({
            where: { email: token.email },
            data: {
                deadManSwitchDays: parseInt(deadManSwitchDays) === 0 ? null : parseInt(deadManSwitchDays),
                deadManTriggerAction
            }
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
