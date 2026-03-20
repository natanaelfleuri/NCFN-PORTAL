// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const dbUser = await getDbUser(session.user.email);
        if (!dbUser || dbUser.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { folder, filename, expiresInHours, maxViews } = await req.json();

        if (!folder || !filename) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Generate a random token
        const shareToken = crypto.randomBytes(32).toString('hex');

        const hours = expiresInHours || 24;
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

        const _link = await prisma.sharedLink.create({
            data: {
                token: shareToken,
                folder,
                filename,
                expiresAt,
                maxViews: maxViews || null
            }
        });

        // Provide the absolute URL to access it
        const base = process.env.NEXTAUTH_URL || 'https://ncfn.net';
        const url = `${base}/shared/${shareToken}`;

        return NextResponse.json({ url, token: shareToken });

    } catch (e) {
        console.error("[SHARE_API_ERROR]", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
