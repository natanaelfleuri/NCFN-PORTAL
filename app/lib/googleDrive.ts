// @ts-nocheck
/**
 * Google Drive — Portal NCFN
 *
 * Backup permanente de arquivos no GDrive via Service Account.
 * Ao contrário do Nextcloud, o GDrive NUNCA é auto-deletado —
 * serve como arquivo imutável de longo prazo.
 *
 * Setup:
 *   1. GCP Console → IAM → Service Accounts → criar conta → criar chave JSON
 *   2. GDrive → criar pasta "NCFN Vault Backup" → compartilhar com o email da service account
 *   3. Copiar ID da pasta (URL: drive.google.com/drive/folders/<FOLDER_ID>)
 *   4. Adicionar ao .env:
 *        GDRIVE_SERVICE_ACCOUNT_JSON=<JSON completo da chave em uma linha>
 *        GDRIVE_FOLDER_ID=<ID da pasta>
 *        GDRIVE_ENCRYPT_BACKUP=true   (opcional: cifrar antes do upload)
 *
 * Sobre GDrive como storage primário:
 *   Tecnicamente possível via Rclone FUSE mount, mas NÃO recomendado para uso
 *   forense: latência alta em cada leitura/escrita, rate limit 750 GB/dia,
 *   sem acesso offline. Mantenha local como primário.
 */
import { google } from 'googleapis';
import { Readable } from 'stream';

type DriveClient = ReturnType<typeof google.drive>;

let _driveCache: DriveClient | null = null;

function getDriveClient(): DriveClient | null {
  if (_driveCache) return _driveCache;

  const raw = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const credentials = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    _driveCache = google.drive({ version: 'v3', auth });
    return _driveCache;
  } catch (e) {
    console.error('[GDrive] Erro ao inicializar service account:', e);
    return null;
  }
}

/** Upload de arquivo para o GDrive */
export async function driveUpload(
  filename:   string,
  content:    Buffer,
  mimeType  = 'application/octet-stream',
  folderId?: string,
): Promise<{ ok: boolean; fileId?: string; error?: string }> {
  const drive    = getDriveClient();
  if (!drive) return { ok: false, error: 'GDRIVE_SERVICE_ACCOUNT_JSON não configurado' };

  const parentId = folderId ?? process.env.GDRIVE_FOLDER_ID;

  try {
    const meta: any = { name: filename };
    if (parentId) meta.parents = [parentId];

    const res = await drive.files.create({
      requestBody: meta,
      media: {
        mimeType,
        body: Readable.from(content),
      },
      fields: 'id,name,size',
    });

    console.log(`[GDrive] Uploaded: ${filename} → fileId=${res.data.id}`);
    return { ok: true, fileId: res.data.id ?? undefined };
  } catch (e: any) {
    console.error('[GDrive] Upload failed:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Busca arquivos pelo nome exato na pasta configurada.
 * Útil para verificar se um arquivo já existe antes de re-upload.
 */
export async function driveFindByName(
  filename:  string,
  folderId?: string,
): Promise<string | null> {
  const drive    = getDriveClient();
  if (!drive) return null;

  const parentId = folderId ?? process.env.GDRIVE_FOLDER_ID;
  try {
    let query = `name='${filename.replace(/'/g, "\\'")}' and trashed=false`;
    if (parentId) query += ` and '${parentId}' in parents`;

    const res = await drive.files.list({ q: query, fields: 'files(id,name)', pageSize: 1 });
    return res.data.files?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Exclui um arquivo do GDrive pelo fileId */
export async function driveDelete(fileId: string): Promise<boolean> {
  const drive = getDriveClient();
  if (!drive) return false;

  try {
    await drive.files.delete({ fileId });
    console.log(`[GDrive] Deleted: ${fileId}`);
    return true;
  } catch (e: any) {
    console.error('[GDrive] Delete failed:', e.message);
    return false;
  }
}

/** Download de arquivo pelo fileId */
export async function driveDownload(fileId: string): Promise<Buffer | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );
    return Buffer.from(res.data as ArrayBuffer);
  } catch (e: any) {
    console.error('[GDrive] Download failed:', e.message);
    return null;
  }
}

/** Lista arquivos na pasta configurada */
export async function driveList(folderId?: string): Promise<{
  id: string; name: string; size?: number; createdTime?: string;
}[]> {
  const drive    = getDriveClient();
  if (!drive) return [];

  const parentId = folderId ?? process.env.GDRIVE_FOLDER_ID;
  try {
    const query = parentId
      ? `'${parentId}' in parents and trashed=false`
      : 'trashed=false';

    const res = await drive.files.list({
      q: query,
      fields: 'files(id,name,size,createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100,
    });
    return (res.data.files ?? []).map(f => ({
      id:          f.id ?? '',
      name:        f.name ?? '',
      size:        f.size ? parseInt(f.size) : undefined,
      createdTime: f.createdTime ?? undefined,
    }));
  } catch (e: any) {
    console.error('[GDrive] List failed:', e.message);
    return [];
  }
}

/** Testa conectividade e retorna info da service account */
export async function drivePing(): Promise<{
  ok: boolean; email?: string; storageUsed?: string; error?: string;
}> {
  const drive = getDriveClient();
  if (!drive) return { ok: false, error: 'GDRIVE_SERVICE_ACCOUNT_JSON não configurado' };

  try {
    const res = await drive.about.get({ fields: 'user,storageQuota' });
    const quota = res.data.storageQuota;
    const usedGB = quota?.usage
      ? (parseInt(quota.usage) / 1e9).toFixed(2) + ' GB'
      : undefined;

    return {
      ok:          true,
      email:       res.data.user?.emailAddress ?? undefined,
      storageUsed: usedGB,
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/** Verifica se o GDrive está configurado */
export function isDriveConfigured(): boolean {
  return !!process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
}
