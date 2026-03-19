// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const VAULT_DIR = path.join(process.cwd(), '../COFRE_NCFN');

// GET /api/vitrine/files?email=visitor@email.com
// Returns public files visible to this email (respects FileViewer restrictions)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });

  // All public files from DB
  const publicFiles = await prisma.fileStatus.findMany({ where: { isPublic: true } });

  // All viewer rules for public files (non-expired)
  const now = new Date();
  const viewers = await prisma.fileViewer.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  // Build a set of "folder/filename" that have at least one viewer rule
  const restrictedKeys = new Set<string>();
  const allowedKeys = new Set<string>(); // this email is allowed
  for (const v of viewers) {
    const key = `${v.folder}/${v.filename}`;
    restrictedKeys.add(key);
    if (v.email === email) allowedKeys.add(key);
  }

  // Filter: unrestricted files OR files where this email is allowed
  const accessible = publicFiles.filter(f => {
    const key = `${f.folder}/${f.filename}`;
    if (!restrictedKeys.has(key)) return true; // no restrictions → visible to all
    return allowedKeys.has(key);
  });

  // Enrich with file metadata
  const result = [];
  for (const f of accessible) {
    const filePath = path.join(VAULT_DIR, f.folder, f.filename);
    try {
      const stat = fs.statSync(filePath);
      const buf = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      result.push({
        folder: f.folder,
        filename: f.filename,
        isPublic: true,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        hash,
      });
    } catch {
      // file may not exist on disk, skip
    }
  }

  return NextResponse.json(result);
}
