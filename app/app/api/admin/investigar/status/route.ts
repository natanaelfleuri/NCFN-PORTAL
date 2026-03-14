// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { exec } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";
const execAsync = promisify(exec);

// GET /api/admin/investigar/status — verifica se ncfn-osint-cli existe
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || token.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { stdout } = await execAsync(
      `docker image inspect ncfn-osint-cli --format "{{.Id}}" 2>/dev/null || echo "missing"`,
      { timeout: 5000 }
    );
    const ready = stdout.trim() !== "missing" && stdout.trim() !== "";
    return NextResponse.json({ ready });
  } catch {
    return NextResponse.json({ ready: false });
  }
}

// DELETE /api/admin/investigar/status — remove imagem
export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || token.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    await execAsync(`docker rmi ncfn-osint-cli 2>/dev/null || true`, { timeout: 10000 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/admin/investigar/status — dispara build da imagem
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || token.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    // Build em background — não aguarda conclusão
    execAsync(
      `docker build -f /app/scripts/Dockerfile.osint-cli -t ncfn-osint-cli /app > /tmp/osint-build.log 2>&1`,
      { timeout: 300000 }
    ).catch(() => {});
    return NextResponse.json({ ok: true, message: "Build iniciado. Aguarde ~2 minutos." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
