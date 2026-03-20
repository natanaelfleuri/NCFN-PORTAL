// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/vitrine/public — list all active vitrine entries (no auth needed)
// Returns: id, recipientName, filename (without folder path), publishedAt, downloadCount
// Does NOT return folder, passwordHash, or any sensitive info
export async function GET() {
  const entries = await prisma.vitrinePublish.findMany({
    where: { active: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      recipientName: true,
      filename: true,
      publishedAt: true,
      downloadCount: true,
    },
  });
  return NextResponse.json(entries);
}
