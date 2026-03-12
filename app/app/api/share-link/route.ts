// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from '@/lib/prisma';
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email || token.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { folder, filename, expiresInHours, maxViews } = await req.json();

        if (!folder || !filename) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Generate a random token
        const shareToken = crypto.randomBytes(32).toString('hex');

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 24));

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
        const url = new URL(`/shared/${shareToken}`, req.url).href;

        return NextResponse.json({ url, token: shareToken });

    } catch (e) {
        console.error("[SHARE_API_ERROR]", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
