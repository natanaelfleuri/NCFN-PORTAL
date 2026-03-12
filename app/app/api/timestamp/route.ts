export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { stampAndSave } from '@/lib/timestamp';

export async function POST(req: NextRequest) {
  try {
    const { hash, filename, folder, captureId } = await req.json();

    if (!hash || typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
      return NextResponse.json({ error: 'Hash SHA-256 inválido' }, { status: 400 });
    }

    const tsrBase64 = await stampAndSave(hash, { filename, folder, captureId });

    if (!tsrBase64) {
      return NextResponse.json({ error: 'TSA indisponível. Tente novamente.' }, { status: 503 });
    }

    return NextResponse.json({ success: true, timestampResponseBase64: tsrBase64 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao gerar timestamp', details: (error as Error).message },
      { status: 500 }
    );
  }
}
