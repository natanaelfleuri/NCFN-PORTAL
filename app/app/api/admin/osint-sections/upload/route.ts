// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = "/arquivos/osint-investigacoes";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investigations = await prisma.osintInvestigation.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ investigations });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const notes = formData.get("notes") as string | null;

  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  if (!file.name.endsWith(".zip")) {
    return NextResponse.json({ error: "Apenas arquivos .zip são aceitos" }, { status: 400 });
  }

  const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 500 MB)" }, { status: 400 });
  }

  // Ensure upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const storedFilename = `${timestamp}_${safeName}`;
  const storedPath = path.join(UPLOAD_DIR, storedFilename);

  fs.writeFileSync(storedPath, buffer);

  const record = await prisma.osintInvestigation.create({
    data: {
      filename: file.name,
      size: file.size,
      sha256,
      storedPath: storedFilename,
      notes: notes || null,
      uploadedBy: (token as any).email || "admin",
    },
  });

  return NextResponse.json({ ok: true, id: record.id, sha256 }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const record = await prisma.osintInvestigation.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const fullPath = path.join(UPLOAD_DIR, record.storedPath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  await prisma.osintInvestigation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
