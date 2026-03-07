// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

// ─── GET /api/admin/custodian ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || token.role !== "admin") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // "manual" | "auto" | null (all)
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  // Manual investigations
  let manualItems: any[] = [];
  let manualTotal = 0;
  if (!type || type === "manual") {
    [manualItems, manualTotal] = await Promise.all([
      prisma.forensicInvestigation.findMany({
        orderBy: { createdAt: "desc" },
        skip: type === "manual" ? skip : 0,
        take: type === "manual" ? limit : 100,
        select: {
          id: true, target: true, tool: true, sha256Hash: true,
          operatorEmail: true, aiReport: true, rawOutput: true,
          command: true, createdAt: true,
        },
      }),
      prisma.forensicInvestigation.count(),
    ]);
  }

  // Automated scans
  let autoItems: any[] = [];
  let autoTotal = 0;
  if (!type || type === "auto") {
    [autoItems, autoTotal] = await Promise.all([
      prisma.osintScheduledScan.findMany({
        orderBy: { createdAt: "desc" },
        skip: type === "auto" ? skip : 0,
        take: type === "auto" ? limit : 100,
        include: { keyword: { select: { keyword: true, category: true, legalRef: true } } },
      }),
      prisma.osintScheduledScan.count(),
    ]);
  }

  // Normalize to unified evidence format
  const evidences = [
    ...manualItems.map((i) => ({
      id: i.id,
      type: "manual" as const,
      target: i.target,
      tool: i.tool,
      sha256Hash: i.sha256Hash,
      operatorEmail: i.operatorEmail,
      triggeredBy: i.operatorEmail,
      category: "Investigação Manual",
      legalRef: null,
      hasAiReport: !!i.aiReport,
      aiReportPreview: i.aiReport?.slice(0, 300),
      highGravity: i.aiReport ? ["fuzil", "7.62", "criança", "morto", "execução", "bomba", "facção", "cv", "pcc"].some(term => i.aiReport.toLowerCase().includes(term)) : false,
      rawOutputSize: i.rawOutput?.length || 0,
      createdAt: i.createdAt,
      // Generate a verification hash of the record itself
      recordIntegrityHash: createHash("sha256")
        .update(`${i.id}:${i.sha256Hash}:${i.createdAt}`)
        .digest("hex")
        .slice(0, 16),
    })),
    ...autoItems.map((i) => ({
      id: i.id,
      type: "auto" as const,
      target: i.target,
      tool: i.tool,
      sha256Hash: i.sha256Hash,
      operatorEmail: "sistema-automatico",
      triggeredBy: i.triggeredBy,
      category: i.keyword?.category || "OSINT Agendado",
      legalRef: i.keyword?.legalRef,
      status: i.status,
      durationSecs: i.durationSecs,
      hasAiReport: !!i.aiReport,
      aiReportPreview: i.aiReport?.slice(0, 300),
      highGravity: i.aiReport ? ["fuzil", "7.62", "criança", "morto", "execução", "bomba", "facção", "cv", "pcc"].some(term => i.aiReport.toLowerCase().includes(term)) : false,
      rawOutputSize: i.rawOutput?.length || 0,
      createdAt: i.createdAt,
      recordIntegrityHash: createHash("sha256")
        .update(`${i.id}:${i.sha256Hash}:${i.createdAt}`)
        .digest("hex")
        .slice(0, 16),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Stats
  const stats = {
    totalManual: manualTotal,
    totalAuto: autoTotal,
    totalEvidences: manualTotal + autoTotal,
    page,
    limit,
  };

  return NextResponse.json({ ok: true, stats, evidences: type ? evidences : evidences.slice(skip, skip + limit) });
}

// ─── GET /api/admin/custodian/[id] — Full evidence ────────────────────────
// We handle detail via search param for simplicity
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || token.role !== "admin") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { id, type } = body;

  if (!id || !type) {
    return NextResponse.json({ error: "id e type são obrigatórios." }, { status: 400 });
  }

  if (type === "manual") {
    const item = await prisma.forensicInvestigation.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Evidência não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, evidence: item });
  }

  if (type === "auto") {
    const item = await prisma.osintScheduledScan.findUnique({
      where: { id },
      include: { keyword: true },
    });
    if (!item) return NextResponse.json({ error: "Evidência não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, evidence: item });
  }

  return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
}
