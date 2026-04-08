// @ts-nocheck
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession, getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { email, name, password, role = "user" } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "email e password são obrigatórios" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
  }
  const emailLower = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
  }

  const validRoles = ["admin", "user", "guest"];
  const safeRole = validRoles.includes(role) ? role : "user";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: emailLower,
      name: name?.trim() || emailLower,
      role: safeRole,
      passwordHash,
      lastSeenAt: new Date(),
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, user });
}

// Listar usuários (admin)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true, email: true, name: true, role: true,
      lastSeenAt: true, totpEnabled: true,
      passwordHash: false,
    },
  });

  return NextResponse.json({ users });
}

// Atualizar ou remover usuário (admin)
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id, name, role, password } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const data: any = {};
  if (name) data.name = name.trim();
  if (role && ["admin", "user", "guest"].includes(role)) data.role = role;
  if (password) {
    if (password.length < 6) return NextResponse.json({ error: "Senha muito curta" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  // Não pode se deletar
  if (dbUser.id === id) {
    return NextResponse.json({ error: "Não é possível remover sua própria conta" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
