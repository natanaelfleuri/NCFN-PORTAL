// @ts-nocheck
/**
 * VaultCrypto — Portal NCFN
 *
 * Criptografia AES-256-GCM para backups no Nextcloud.
 * O servidor Nextcloud NUNCA vê o plaintext (E2EE real).
 *
 * Layout do blob criptografado:
 *   [IV  — 12 bytes] [AuthTag — 16 bytes] [Ciphertext — N bytes]
 *
 * Para gerar a chave:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Adicionar ao .env:
 *   VAULT_ENCRYPTION_KEY=<64 hex chars ou 44 base64 chars>
 */
import crypto from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const IV_LEN     = 12;  // 96-bit IV (recomendado para GCM)
const TAG_LEN    = 16;  // 128-bit auth tag

/** Deriva a chave de 32 bytes do env var */
function getKey(): Buffer {
  const k = process.env.VAULT_ENCRYPTION_KEY;
  if (!k) throw new Error('[VaultCrypto] VAULT_ENCRYPTION_KEY não configurada');
  if (k.length === 64) return Buffer.from(k, 'hex');       // hex 64 chars → 32 bytes
  return Buffer.from(k, 'base64').subarray(0, 32);          // base64 → 32 bytes
}

/**
 * Cifra um Buffer com AES-256-GCM.
 * Retorna: IV (12) + AuthTag (16) + Ciphertext
 */
export function encryptBuffer(data: Buffer): Buffer {
  const key    = getKey();
  const iv     = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag       = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decifra um Buffer cifrado por encryptBuffer.
 * Lança erro se a autenticação falhar (integridade comprometida).
 */
export function decryptBuffer(data: Buffer): Buffer {
  const key       = getKey();
  const iv        = data.subarray(0, IV_LEN);
  const tag       = data.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = data.subarray(IV_LEN + TAG_LEN);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/** Verifica se a chave está configurada */
export function isEncryptionConfigured(): boolean {
  return !!process.env.VAULT_ENCRYPTION_KEY;
}

/** Retorna os primeiros 8 bytes do IV como hex (fingerprint do blob) */
export function blobFingerprint(encryptedBlob: Buffer): string {
  return encryptedBlob.subarray(0, IV_LEN).toString('hex').slice(0, 16).toUpperCase();
}
