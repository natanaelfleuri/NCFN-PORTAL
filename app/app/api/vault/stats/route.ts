// @ts-nocheck
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const VAULT_DIR = path.join(process.cwd(), '../COFRE_NCFN');

function getDirSizeAndCount(dirPath: string): { size: number; count: number } {
  let size = 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('_')) continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = getDirSizeAndCount(fullPath);
        size += sub.size;
        count += sub.count;
      } else if (entry.isFile()) {
        try {
          size += fs.statSync(fullPath).size;
          count++;
        } catch {}
      }
    }
  } catch {}
  return { size, count };
}

export async function GET() {
  try {
    const { size, count } = getDirSizeAndCount(VAULT_DIR);
    return NextResponse.json({ size, count });
  } catch (err) {
    return NextResponse.json({ size: 0, count: 0 });
  }
}
