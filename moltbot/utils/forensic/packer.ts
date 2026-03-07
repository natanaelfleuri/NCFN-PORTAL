import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

/**
 * Forensic Evidence Packer
 * Implements the digital chain of custody as per the GAECO forensic workflow.
 * Packages: Original File + Technical Report + AES-256 Encrypted Copy
 */
export class ForensicPacker {
  private adminPassword = process.env.ADMIN_FORENSIC_PWD || 'NCFN_FORENSIC_2026';

  /**
   * Calculates SHA-256 hash of a buffer
   */
  public calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Encrypts a buffer using AES-256-CBC
   */
  public encryptBuffer(buffer: Buffer): { encrypted: Buffer; iv: string } {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.adminPassword, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return { 
      encrypted, 
      iv: iv.toString('hex') 
    };
  }

  /**
   * Generates the Technical Forensic Report content
   */
  public generateReportContent(metadata: any, hashes: { original: string; aes: string; report: string }): string {
    const now = new Date().toISOString();
    return `
# RELATÓRIO TÉCNICO PERICIAL - NCFN PORTAL
Data/Hora: ${now}
ID da Investigação: ${metadata.investigationId || 'N/A'}

## 1. MATERIALIDADE DA PROVA
- URL: ${metadata.url || 'Captura Local'}
- IP de Origem: ${metadata.ip || 'N/A'}
- Hash (SHA-256) Arquivo Original: ${hashes.original}
- Hash (SHA-256) Cópia Criptografada (AES): ${hashes.aes}

## 2. CADEIA DE CUSTÓDIA
Este arquivo foi processado automaticamente pelo Moltbot e armazenado em ambiente seguro.
A integridade da prova é garantida pela conferência dos hashes acima citados.

## 3. AUDITABILIDADE
O arquivo .aes incluído no pacote pode ser descriptografado apenas pela autoridade competente 
utilizando a chave mestra do portal NCFN.

Hash de Integridade do Relatório: ${hashes.report}
--------------------------------------------------
PORTAL NCFN - MONITORAMENTO E INTELIGÊNCIA
    `.trim();
  }

  /**
   * Creates the forensic package directory structure
   */
  public async createPackage(targetPath: string, fileName: string, fileBuffer: Buffer, metadata: any) {
    const packageDir = path.join(targetPath, `forensic_${Date.now()}`);
    await fs.ensureDir(packageDir);

    // 1. Save Original
    const originalPath = path.join(packageDir, fileName);
    await fs.writeFile(originalPath, fileBuffer);
    const originalHash = this.calculateHash(fileBuffer);

    // 2. Encrypt & Save AES Copy
    const { encrypted, iv } = this.encryptBuffer(fileBuffer);
    const aesFileName = `${fileName}.aes`;
    const aesPath = path.join(packageDir, aesFileName);
    // Store IV at the beginning of the file for later decryption
    await fs.writeFile(aesPath, Buffer.concat([Buffer.from(iv, 'hex'), encrypted]));
    const aesHash = this.calculateHash(encrypted);

    // 3. Generate & Save Report (Temporary simple TXT version, will evolve to PDF)
    const reportFileName = 'relatorio_pericial.txt';
    const reportPathCheck = path.join(packageDir, reportFileName);
    
    // Placeholder report to get its own hash
    const partialReport = this.generateReportContent(metadata, { original: originalHash, aes: aesHash, report: 'PENDING' });
    const reportHash = this.calculateHash(Buffer.from(partialReport));
    
    const finalReport = this.generateReportContent(metadata, { original: originalHash, aes: aesHash, report: reportHash });
    await fs.writeFile(reportPathCheck, finalReport);

    console.log(`[ForensicPacker] Package created at: ${packageDir}`);
    return {
      packageDir,
      hashes: { original: originalHash, aes: aesHash, report: reportHash }
    };
  }
}
