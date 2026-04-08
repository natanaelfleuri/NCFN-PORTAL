// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession, getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

async function adminGuard() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== "admin") return null;
  return dbUser;
}

export async function POST(req: NextRequest) {
  const user = await adminGuard();
  if (!user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!checkRateLimit(`vault-custody:${user.email}`, 20, 60_000)) {
    return NextResponse.json({ error: "Limite de requisições atingido. Aguarde 1 minuto." }, { status: 429 });
  }

  const body = await req.json();
  const { action, folder, filename } = body;

  if (!folder || !filename) {
    return NextResponse.json({ error: "folder e filename obrigatorios" }, { status: 400 });
  }

  try {
    switch (action) {
      case "get": {
        const state = await prisma.fileCustodyState.findUnique({
          where: { folder_filename: { folder, filename } },
        });
        return NextResponse.json({ state });
      }

      case "create": {
        const existing = await prisma.fileCustodyState.findUnique({
          where: { folder_filename: { folder, filename } },
        });
        if (existing) return NextResponse.json({ state: existing });
        const state = await prisma.fileCustodyState.create({
          data: { folder, filename, custodyStartedAt: new Date() },
        });
        return NextResponse.json({ state });
      }

      case "set_initial_report": {
        const { reportId } = body;
        const state = await prisma.fileCustodyState.update({
          where: { folder_filename: { folder, filename } },
          data: {
            initialReportId: reportId,
            initialReportAt: new Date(),
          },
        });
        return NextResponse.json({ state });
      }

      case "mark_intermediary_done": {
        const { reportId } = body;
        const state = await prisma.fileCustodyState.update({
          where: { folder_filename: { folder, filename } },
          data: {
            intermediaryReportId: reportId || undefined,
            intermediaryReportAt: new Date(),
            intermediaryReportDone: true,
          },
        });
        return NextResponse.json({ state });
      }

      case "mark_encrypted": {
        const state = await prisma.fileCustodyState.update({
          where: { folder_filename: { folder, filename } },
          data: { encryptedAt: new Date() },
        });
        return NextResponse.json({ state });
      }

      case "mark_final_done": {
        const { reportId } = body;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 60 * 1000); // +5h
        const state = await prisma.fileCustodyState.update({
          where: { folder_filename: { folder, filename } },
          data: {
            finalReportId: reportId || undefined,
            finalReportAt: now,
            finalReportExpiresAt: expiresAt,
          },
        });
        return NextResponse.json({ state });
      }

      case "mark_manual_done": {
        const { reportId } = body;
        const state = await prisma.fileCustodyState.update({
          where: { folder_filename: { folder, filename } },
          data: {
            manualReportId: reportId || undefined,
            manualReportDone: true,
          },
        });
        return NextResponse.json({ state });
      }

      default:
        return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
