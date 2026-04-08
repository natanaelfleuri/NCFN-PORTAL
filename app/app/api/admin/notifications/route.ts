// @ts-nocheck
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getDbUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      // Send initial heartbeat
      send({ type: 'heartbeat', time: new Date().toISOString() });

      let running = true;

      // Cleanup on abort
      req.signal.addEventListener('abort', () => {
        running = false;
        try { controller.close(); } catch {}
      });

      while (running) {
        await new Promise(r => setTimeout(r, 8000));
        if (!running) break;

        try {
          const now = new Date();
          const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
          const thirtySecAgo = new Date(now.getTime() - 30 * 1000);

          // Canary alerts in last 5 minutes
          const canaryAlerts = await prisma.vaultAccessLog.findMany({
            where: {
              isCanary: true,
              createdAt: { gte: fiveMinAgo },
            },
            orderBy: { createdAt: 'desc' },
          }).catch(() => []);

          for (const alert of canaryAlerts) {
            send({
              type: 'canary',
              file: alert.filePath,
              ip: alert.ip || 'desconhecido',
              time: alert.createdAt.toISOString(),
              action: alert.action,
            });
          }

          // New vault events in last 30 seconds (last 3, non-canary)
          const vaultEvents = await prisma.vaultAccessLog.findMany({
            where: {
              isCanary: false,
              createdAt: { gte: thirtySecAgo },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          }).catch(() => []);

          for (const evt of vaultEvents) {
            send({
              type: 'vault_event',
              file: evt.filePath,
              action: evt.action,
              ip: evt.ip || 'desconhecido',
              time: evt.createdAt.toISOString(),
            });
          }

          // New pending features in last 5 minutes
          const newFeatures = await prisma.pendingFeature.findMany({
            where: {
              createdAt: { gte: fiveMinAgo },
              status: 'pending',
            },
            orderBy: { createdAt: 'desc' },
          }).catch(() => []);

          for (const feat of newFeatures) {
            send({
              type: 'new_feature',
              title: feat.title,
              priority: feat.priority,
              addedBy: feat.addedBy,
              time: feat.createdAt.toISOString(),
            });
          }

          // Heartbeat
          send({ type: 'heartbeat', time: now.toISOString() });
        } catch (e) {
          send({ type: 'heartbeat', time: new Date().toISOString() });
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
