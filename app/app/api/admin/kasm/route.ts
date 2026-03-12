// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);
const CONTAINER = 'ncfn_osint';

async function authAdmin() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const user = await getDbUser(session.user.email);
  if (!user || user.role !== 'admin') return null;
  return { session, user };
}

async function getContainerStatus(): Promise<'running' | 'stopped' | 'missing'> {
  try {
    const { stdout } = await execAsync(
      `docker inspect --format "{{.State.Status}}" ${CONTAINER}`,
      { timeout: 5000 }
    );
    const status = stdout.trim();
    return status === 'running' ? 'running' : 'stopped';
  } catch {
    return 'missing';
  }
}

// ─── GET — status do ambiente OSINT ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await authAdmin();
  if (!auth) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  const url = (process.env.OSINT_DESKTOP_URL || '').replace(/\/$/, '');
  const containerStatus = await getContainerStatus();

  if (!url) {
    return NextResponse.json({
      configured: false,
      containerStatus,
      message: 'OSINT_DESKTOP_URL não configurada.',
    });
  }

  // Se container está rodando, verifica se responde HTTP
  let online = false;
  if (containerStatus === 'running') {
    try {
      const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(4000) });
      online = res.status < 500;
    } catch {
      online = false;
    }
  }

  return NextResponse.json({
    configured: true,
    online,
    containerStatus,
    desktopUrl: url,
  });
}

// ─── POST — ligar / desligar container ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authAdmin();
  if (!auth) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  const { action } = await req.json();

  if (action === 'start') {
    const status = await getContainerStatus();

    if (status === 'missing') {
      return NextResponse.json({
        error: 'Container não encontrado. Execute uma vez: docker compose --profile osint up -d',
        hint: 'missing',
      }, { status: 404 });
    }

    if (status === 'running') {
      return NextResponse.json({ ok: true, message: 'Container já está rodando.' });
    }

    try {
      await execAsync(`docker start ${CONTAINER}`, { timeout: 15000 });
      return NextResponse.json({ ok: true, message: 'Container iniciado.' });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'stop') {
    const status = await getContainerStatus();

    if (status === 'missing' || status === 'stopped') {
      return NextResponse.json({ ok: true, message: 'Container já está parado.' });
    }

    try {
      await execAsync(`docker stop ${CONTAINER}`, { timeout: 20000 });
      return NextResponse.json({ ok: true, message: 'Container parado.' });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'action inválida' }, { status: 400 });
}
