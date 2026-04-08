// @ts-nocheck
export const dynamic = 'force-dynamic';

import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import os from 'os';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return new Response('data: {"error":"Unauthorized"}\n\ndata: [DONE]\n\n', { headers: sseHeaders() });
  }
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') {
    return new Response('data: {"error":"Admin only"}\n\ndata: [DONE]\n\n', { headers: sseHeaders() });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  let closed = false;

  const send = async (data: object) => {
    if (closed) return;
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      closed = true;
    }
  };

  const getStats = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeSessions, pendingFeatures, todayLogs, monitoredEvents, recentActivity, canaryAlerts] =
      await Promise.all([
        prisma.session.count({ where: { expires: { gte: now } } }),
        prisma.pendingFeature.count({ where: { status: 'pending' } }),
        prisma.guestAccessLog.count({ where: { loginAt: { gte: todayStart } } }),
        prisma.vaultAccessLog.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.vaultAccessLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { filePath: true, action: true, userEmail: true, isCanary: true, createdAt: true },
        }),
        prisma.vaultAccessLog.count({ where: { isCanary: true, createdAt: { gte: todayStart } } }),
      ]);

    return {
      type: 'stats',
      activeSessions,
      pendingFeatures,
      todayLogs,
      monitoredEvents,
      canaryAlerts,
      recentActivity: recentActivity.map(a => ({
        filePath: a.filePath,
        action: a.action,
        userEmail: a.userEmail,
        isCanary: a.isCanary,
        ts: a.createdAt,
      })),
      memUsedPct: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      cpuLoad: parseFloat(os.loadavg()[0].toFixed(2)),
      ts: Date.now(),
    };
  };

  (async () => {
    try {
      await send(await getStats());

      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        try {
          await send(await getStats());
        } catch {
          closed = true;
          clearInterval(interval);
        }
      }, 10_000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        writer.close().catch(() => {});
      });
    } catch (e: any) {
      await send({ type: 'error', message: e?.message });
      writer.close().catch(() => {});
    }
  })();

  return new Response(readable, { headers: sseHeaders() });
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}
