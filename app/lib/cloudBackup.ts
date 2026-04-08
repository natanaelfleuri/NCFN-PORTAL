// @ts-nocheck
/**
 * CloudBackup — Portal NCFN
 *
 * Orquestra o backup em dois destinos:
 *
 *   NCFN (local) ──► Nextcloud (E2EE encrypted .enc)   [ativo; auto-deletado junto com NCFN]
 *                └──► Google Drive (original ou criptografado)  [arquivo permanente; nunca auto-deletado]
 *
 * Uso:
 *   backupToCloud(relPath, buffer, filename)   → faz upload para NC (cifrado) + GDrive
 *   deleteFromCloud(relPath)                   → deleta apenas do NC (GDrive preservado)
 *   backupStatus()                             → status de ambos os backends
 *
 * Variáveis de ambiente necessárias:
 *   VAULT_ENCRYPTION_KEY     — chave AES-256 para NC E2EE
 *   NEXTCLOUD_URL / _USER / _APP_PASSWORD — Nextcloud WebDAV
 *   GDRIVE_SERVICE_ACCOUNT_JSON           — service account GCP
 *   GDRIVE_FOLDER_ID                      — pasta destino no Drive
 *   GDRIVE_ENCRYPT_BACKUP=true            — cifrar também no GDrive (opcional)
 */
import { encryptBuffer, isEncryptionConfigured } from './vaultCrypto';
import { ncUploadWithDirs, ncDelete, ncPing } from './nextcloud';
import { driveUpload as gdriveUpload, isDriveConfigured as isDrive, drivePing as gdrivePing } from './googleDrive';

const NC_VAULT_BASE = 'NCFN-NextCloud/Cofre';

/* ── Helpers ────────────────────────────────────────────────────────── */

function ncPathFor(relPath: string): string {
  return `${NC_VAULT_BASE}/${relPath}.enc`;
}

function gdriveName(relPath: string, encrypted: boolean): string {
  // Preserva a hierarquia de pasta como prefixo no nome do arquivo GDrive
  const safe = relPath.replace(/\//g, '__');
  return encrypted ? `${safe}.enc` : safe;
}

/* ── Upload ─────────────────────────────────────────────────────────── */

/**
 * Faz backup do arquivo para Nextcloud (E2EE) e Google Drive.
 * Seguro para fire-and-forget — captura todos os erros internamente.
 *
 * @param relPath   Caminho relativo dentro do COFRE_NCFN (ex: "01_EVIDENCIAS/foto.jpg")
 * @param buffer    Conteúdo original (plaintext)
 * @param filename  Nome do arquivo para o GDrive (sem path)
 */
export async function backupToCloud(
  relPath:  string,
  buffer:   Buffer,
  filename: string,
): Promise<{ nc: boolean; gdrive: boolean }> {
  const results = { nc: false, gdrive: false };

  // ── Nextcloud: E2EE (cifrar antes de enviar) ──────────────────────
  if (isEncryptionConfigured()) {
    try {
      const encrypted = encryptBuffer(buffer);
      const ncPath    = ncPathFor(relPath);
      results.nc      = await ncUploadWithDirs(ncPath, encrypted, 'application/octet-stream');
      console.log(`[CloudBackup] NC E2EE ${results.nc ? '✓' : '✗'}: ${ncPath}`);
    } catch (e) {
      console.error('[CloudBackup] NC upload error:', e);
    }
  } else {
    console.warn('[CloudBackup] VAULT_ENCRYPTION_KEY ausente — NC backup pulado (não armazenar plaintext no NC)');
  }

  // ── Google Drive: arquivo original ou cifrado ─────────────────────
  if (isDrive()) {
    try {
      const encryptForDrive = process.env.GDRIVE_ENCRYPT_BACKUP === 'true' && isEncryptionConfigured();
      const uploadBuffer    = encryptForDrive ? encryptBuffer(buffer) : buffer;
      const name            = gdriveName(relPath, encryptForDrive);

      const { ok, fileId } = await gdriveUpload(name, uploadBuffer);
      results.gdrive = ok;
      console.log(`[CloudBackup] GDrive ${ok ? '✓' : '✗'}: ${name}${fileId ? ` (${fileId})` : ''}`);
    } catch (e) {
      console.error('[CloudBackup] GDrive upload error:', e);
    }
  }

  return results;
}

/* ── Delete (NC only) ───────────────────────────────────────────────── */

/**
 * Deleta o arquivo do Nextcloud.
 * O Google Drive NÃO é afetado — mantém cópia como arquivo permanente.
 *
 * @param relPath  Mesmo relPath usado em backupToCloud
 */
export async function deleteFromCloud(relPath: string): Promise<void> {
  const ncPath = ncPathFor(relPath);
  try {
    const ok = await ncDelete(ncPath);
    console.log(`[CloudBackup] NC delete ${ok ? '✓' : '✗'}: ${ncPath}`);
  } catch (e) {
    console.error('[CloudBackup] NC delete error:', e);
  }
  // GDrive: intencionalmente não deletado (arquivo permanente)
}

/* ── Status ─────────────────────────────────────────────────────────── */

export async function backupStatus(): Promise<{
  nc:      { configured: boolean; ok?: boolean; user?: string; encrypted: boolean };
  gdrive:  { configured: boolean; ok?: boolean; email?: string; storageUsed?: string };
  encryption: boolean;
}> {
  const [ncStatus, driveStatus] = await Promise.allSettled([
    ncPing(),
    gdrivePing(),
  ]);

  const nc = ncStatus.status === 'fulfilled' ? ncStatus.value : { ok: false };
  const gd = driveStatus.status === 'fulfilled' ? driveStatus.value : { ok: false };

  return {
    nc: {
      configured: !!(process.env.NEXTCLOUD_URL && process.env.NEXTCLOUD_USER && process.env.NEXTCLOUD_APP_PASSWORD),
      ok:        nc.ok,
      user:      nc.user,
      encrypted: isEncryptionConfigured(),
    },
    gdrive: {
      configured: isDrive(),
      ok:         gd.ok,
      email:      (gd as any).email,
      storageUsed: (gd as any).storageUsed,
    },
    encryption: isEncryptionConfigured(),
  };
}
