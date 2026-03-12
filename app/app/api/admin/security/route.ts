// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await getDbUser(session.user.email);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const postUser = await getDbUser(session.user.email);
        if (!postUser || postUser.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { deadManSwitchDays, deadManTriggerAction } = await req.json();

        await prisma.user.update({
            where: { email: session.user.email },
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
