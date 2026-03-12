import crypto from 'crypto';
import { prisma } from './prisma';

export function sha256Buffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function requestRFC3161(hash: string): Promise<string | null> {
  try {
    const hashBuf = Buffer.from(hash, 'hex');
    // ASN.1 TimeStampReq v1, SHA-256 OID, certReq=true
    const tsq = Buffer.concat([
      Buffer.from('30390201013031300d060960864801650304020105000420', 'hex'),
      hashBuf,
      Buffer.from('0101ff', 'hex'),
    ]);
    const tsaUrl = process.env.FREETSA_URL || 'https://freetsa.org/tsr';
    const res = await fetch(tsaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/timestamp-query' },
      body: tsq,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString('base64');
  } catch { return null; }
}

export async function stampAndSave(
  hash: string,
  meta: { filename?: string; folder?: string; captureId?: string }
): Promise<string | null> {
  const existing = await prisma.timestampRecord.findUnique({ where: { sha256: hash } });
  if (existing) return existing.tsrBase64;

  const tsrBase64 = await requestRFC3161(hash);
  if (!tsrBase64) return null;

  await prisma.timestampRecord.create({
    data: { sha256: hash, tsrBase64, ...meta },
  });
  return tsrBase64;
}
