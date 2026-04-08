/**
 * Internxt Drive integration — acesso direto ao diretório montado
 * O Internxt Drive desktop app sincroniza automaticamente os arquivos gravados aqui.
 * Volume montado em: /internxt-drive (via docker-compose)
 */
import { mkdirSync, writeFileSync, unlinkSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';

const INTERNXT_MOUNT = process.env.INTERNXT_MOUNT || '/internxt-drive';
const INTERNXT_DIR   = process.env.INTERNXT_DIR   || 'NCFN-Custodia';

function getCustodiaDir(): string {
  return path.join(INTERNXT_MOUNT, INTERNXT_DIR);
}

export async function uploadToInternxt(
  fileName: string,
  buffer: Buffer
): Promise<{ path: string; url: string }> {
  const custodiaDir = getCustodiaDir();

  // Cria o diretório se não existir
  mkdirSync(custodiaDir, { recursive: true });

  const filePath = path.join(custodiaDir, fileName);
  writeFileSync(filePath, buffer);

  return {
    path: filePath,
    url:  `internxt://NCFN-Custodia/${fileName}`,
  };
}

export async function deleteFromInternxt(filePath: string): Promise<void> {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // ignora — arquivo pode já ter sido removido
  }
}

export async function testInternxtConnection(): Promise<boolean> {
  try {
    const mountExists = existsSync(INTERNXT_MOUNT);
    if (!mountExists) return false;
    // Testa se consegue criar o diretório de custódia
    mkdirSync(getCustodiaDir(), { recursive: true });
    return true;
  } catch {
    return false;
  }
}
