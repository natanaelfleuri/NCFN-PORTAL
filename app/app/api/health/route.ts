import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health check endpoint — usado pelo Caddy e Docker healthcheck
// Não requer autenticação
export async function GET() {
    return NextResponse.json(
        {
            status: "ok",
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || "2.0",
        },
        { status: 200 }
    );
}
