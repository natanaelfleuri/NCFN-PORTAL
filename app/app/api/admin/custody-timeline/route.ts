// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const states = await prisma.fileCustodyState.findMany({
    orderBy: { custodyStartedAt: 'desc' },
    take: 200,
  });

  // Fetch laudo references for initial and final reports
  const reportIds = states
    .flatMap(s => [s.initialReportId, s.finalReportId])
    .filter(Boolean) as string[];

  const laudos = reportIds.length > 0
    ? await prisma.laudoForense.findMany({
        where: { id: { in: reportIds } },
        select: { id: true, titulo: true, reportType: true, createdAt: true },
      })
    : [];

  const laudoMap = Object.fromEntries(laudos.map(l => [l.id, l]));

  const entries = states.map(s => ({
    ...s,
    initialReport: s.initialReportId ? laudoMap[s.initialReportId] : null,
    finalReport: s.finalReportId ? laudoMap[s.finalReportId] : null,
  }));

  return NextResponse.json({ entries });
}
