// @ts-nocheck
/**
 * PGP Signing — Portal NCFN
 *
 * Assina emails e documentos com chave OpenPGP.
 * A chave privada é carregada do ambiente (PGP_PRIVATE_KEY_ARMOR).
 *
 * Compatível com:
 *   - Nextcloud Mail (verifica assinatura automaticamente)
 *   - Mailcow (exibe badge "PGP Signed" no webmail)
 *   - Qualquer cliente com suporte a OpenPGP/GPG
 *
 * Para gerar a chave: bash mailcow/generate-pgp.sh
 */
import * as openpgp from 'openpgp';

let _privateKey: openpgp.PrivateKey | null = null;

/** Carrega e cacheia a chave privada do ambiente */
async function getPrivateKey(): Promise<openpgp.PrivateKey | null> {
  if (_privateKey) return _privateKey;

  const armoredKey  = process.env.PGP_PRIVATE_KEY_ARMOR;
  const passphrase  = process.env.PGP_PASSPHRASE;

  if (!armoredKey) return null;

  try {
    const privateKey = await openpgp.readPrivateKey({ armoredKey });
    _privateKey = passphrase
      ? await openpgp.decryptKey({ privateKey, passphrase })
      : privateKey;
    return _privateKey;
  } catch (e) {
    console.error('[PGP] Erro ao carregar chave privada:', e);
    return null;
  }
}

/** Assina texto em claro (cleartext signature) */
export async function pgpSignCleartext(text: string): Promise<string | null> {
  const privateKey = await getPrivateKey();
  if (!privateKey) return null;

  try {
    const message = await openpgp.createCleartextMessage({ text });
    return await openpgp.sign({ message, signingKeys: privateKey });
  } catch (e) {
    console.error('[PGP] Erro ao assinar:', e);
    return null;
  }
}

/** Assina mensagem binária e retorna assinatura detachada (Base64) */
export async function pgpSignDetached(data: Buffer): Promise<string | null> {
  const privateKey = await getPrivateKey();
  if (!privateKey) return null;

  try {
    const message = await openpgp.createMessage({ binary: data });
    const sig = await openpgp.sign({
      message,
      signingKeys: privateKey,
      detached: true,
      format: 'armored',
    });
    return sig as string;
  } catch (e) {
    console.error('[PGP] Erro ao assinar (detached):', e);
    return null;
  }
}

/** Cifra + assina para um destinatário */
export async function pgpEncryptSign(
  text: string,
  recipientPublicKeyArmored: string,
): Promise<string | null> {
  const privateKey = await getPrivateKey();
  if (!privateKey) return null;

  try {
    const recipientKey = await openpgp.readKey({ armoredKey: recipientPublicKeyArmored });
    const message = await openpgp.createMessage({ text });
    return await openpgp.encrypt({
      message,
      encryptionKeys: recipientKey,
      signingKeys: privateKey,
    });
  } catch (e) {
    console.error('[PGP] Erro ao cifrar:', e);
    return null;
  }
}

/** Retorna chave pública armored para compartilhamento */
export async function getPgpPublicKeyArmored(): Promise<string | null> {
  const privateKey = await getPrivateKey();
  if (!privateKey) return null;
  return privateKey.toPublic().armor();
}

/** Verifica se PGP está configurado */
export function isPgpConfigured(): boolean {
  return !!(process.env.PGP_PRIVATE_KEY_ARMOR);
}

/**
 * Gera bloco de rodapé PGP para emails HTML
 * Inclui fingerprint, link para chave pública e instrução de verificação
 */
export function pgpEmailFooter(signedText?: string): string {
  const fingerprint = process.env.PGP_KEY_FINGERPRINT ?? '';
  const email       = process.env.PGP_KEY_EMAIL ?? 'noreply@ncfn.net';
  const short       = fingerprint ? fingerprint.slice(-16).toUpperCase().match(/.{4}/g)?.join(' ') : '';

  return `
<div style="margin-top:24px;padding:12px 16px;background:#0a0a0a;border:1px solid #1a2a1a;border-radius:6px;font-family:monospace;font-size:10px;color:#3a5a3a">
  <div style="color:#4a8a4a;font-weight:bold;margin-bottom:6px">── OpenPGP Signature ──</div>
  <div>Key: <span style="color:#5aaa5a">&lt;${email}&gt;</span></div>
  ${short ? `<div>Fingerprint: <span style="color:#5aaa5a">${short}</span></div>` : ''}
  <div style="margin-top:4px;color:#2a4a2a">
    Verificar: <a href="https://keys.openpgp.org/search?q=${encodeURIComponent(email)}" style="color:#3a6a3a">keys.openpgp.org</a>
  </div>
  ${signedText ? `<details style="margin-top:6px"><summary style="cursor:pointer;color:#3a5a3a">Ver assinatura PGP</summary><pre style="margin:6px 0 0;font-size:9px;overflow:auto;color:#2a4a2a">${signedText.replace(/</g,'&lt;')}</pre></details>` : ''}
</div>`;
}
