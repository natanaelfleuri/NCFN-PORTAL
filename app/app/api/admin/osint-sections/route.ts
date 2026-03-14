// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "admin") return null;
  return token;
}

// GET — list all sections
export async function GET(req: NextRequest) {
  const token = await requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sections = await prisma.osintSection.findMany({
    orderBy: { order: "asc" },
    select: { id: true, slug: true, title: true, icon: true, order: true, content: true, updatedAt: true },
  });
  return NextResponse.json({ sections });
}

// POST — create section
export async function POST(req: NextRequest) {
  const token = await requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, title, icon, content, order } = await req.json();
  if (!slug || !title || !content) {
    return NextResponse.json({ error: "slug, title e content são obrigatórios" }, { status: 400 });
  }

  const section = await prisma.osintSection.create({
    data: { slug, title, icon: icon || "BookOpen", content, order: order ?? 0 },
  });
  return NextResponse.json({ section }, { status: 201 });
}

// PUT — update section
export async function PUT(req: NextRequest) {
  const token = await requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, slug, title, icon, content, order } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const section = await prisma.osintSection.update({
    where: { id },
    data: { ...(slug && { slug }), ...(title && { title }), ...(icon && { icon }), ...(content && { content }), ...(order !== undefined && { order }) },
  });
  return NextResponse.json({ section });
}

// DELETE — delete section
export async function DELETE(req: NextRequest) {
  const token = await requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.osintSection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
