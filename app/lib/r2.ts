// Cloudflare R2 — S3-compatible client
// Usado para upload de arquivos grandes (>50MB) que não cabem na memória do Next.js
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 não configurado: defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY no .env');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'ncfn-vault';

// URL assinada para o browser fazer PUT diretamente no R2 (sem passar pelo Next.js)
export async function createPresignedPutUrl(key: string, contentType: string, contentLength: number): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

// URL assinada para download/visualização temporária (15 minutos)
export async function createPresignedGetUrl(key: string): Promise<string> {
  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: 900 });
}

// Stream do arquivo para processar hash sem carregar na memória
export async function getR2ObjectStream(key: string) {
  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  const response = await client.send(command);
  return response.Body;
}

// Verifica se o objeto existe no R2
export async function r2ObjectExists(key: string): Promise<boolean> {
  try {
    const client = getR2Client();
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}
