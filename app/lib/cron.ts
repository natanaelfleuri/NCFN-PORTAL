import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Pasta alvo principal para varreduras de alta prioridade
const TARGET_FOLDER = '2_OSINT';
const ROOT_ARCHIVES = path.join(process.cwd(), '../COFRE_NCFN');

// Função auxiliar para re-calcular Hashes
async function hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

// -------------------------------------------------------------
// BOT AUDITOR SÊNIOR (Roda todo dia às 03:00 AM)
// Para testes rápidos, está configurado para "*/5 * * * *" (a cada 5 mins)
// -------------------------------------------------------------
cron.schedule('0 3 * * *', async () => {
    console.log('[BOT AUDITOR] Iniciando Varredura de Integridade Forense...');
    try {
        const targetPath = path.join(ROOT_ARCHIVES, TARGET_FOLDER);
        const hashListPath = path.join(targetPath, '_Lista_de_Hashes_SHA256.txt');

        if (!fs.existsSync(targetPath)) return;
        if (!fs.existsSync(hashListPath)) {
            console.log('[BOT AUDITOR] Nenhuma lista de Hash encontrada para auditar.');
            return;
        }

        const logLines = (await fs.readFile(hashListPath, 'utf8')).split('\n').filter(l => l.trim() !== '');

        // Parsear a lista. Cada linha tem: [DATA] Arquivo: X | Tamanho: Y | SHA-256: HASH
        const hashDb = new Map<string, string>();
        for (const line of logLines) {
            const fileNameMatch = line.match(/ARQUIVO:\s(.*?)\s\|/i);
            const hashMatch = line.match(/SHA-256:\s([a-f0-9]{64})/i);
            if (fileNameMatch && hashMatch) {
                const fName = fileNameMatch[1].trim();
                const fHash = hashMatch[1].trim();
                // O último log de um mesmo arquivo sobrescreve, caso ele tenha sido re-enviado
                hashDb.set(fName, fHash);
            }
        }

        let alertas = 0;
        const arquivosAtuais = await fs.readdir(targetPath);

        for (const file of arquivosAtuais) {
            // Pular subpastas e listas de hash
            const fullPath = path.join(targetPath, file);
            if ((await fs.stat(fullPath)).isDirectory() || file.startsWith('_')) continue;

            const expectedHash = hashDb.get(file);
            if (expectedHash) {
                const currentHash = await hashFile(fullPath);
                if (currentHash !== expectedHash) {
                    console.error(`[ALERTA VERMELHO] Arquivo Corrompido ou Adulterado: ${file}`);
                    alertas++;

                    const reportPath = path.join(targetPath, `_ALERTA_CORRUPCAO_${file}.txt`);
                    const report = `
=========================================================
# RELATÓRIO DE INCIDENTE AUTOMATIZADO (BOT AUDITOR) #
=========================================================
SISTEMA: Cérebro Digital NCFN
EVENTO: Violação de Integridade Criptográfica
ARQUIVO AFETADO: ${file}

O Sistema verificou uma divergência de segurança inaceitável
durante a varredura noturna.

- Hash Original (Depositado):   ${expectedHash}
- Hash Corrompido (Encontrado): ${currentHash}

DIAGNÓSTICO: Possível ataque de Ransomware encriptando a 
mídia sem alterar a extensão, Bit-Rot (Degradação de Disco)
ou Modificação de Perfil não autorizada!
=========================================================
`;
                    if (!fs.existsSync(reportPath)) {
                        await fs.writeFile(reportPath, report, 'utf8');
                    }
                }
            }
        }

        console.log(`[BOT AUDITOR] Varredura Concluída. Alertas Disparados: ${alertas}`);
    } catch (e) {
        console.error('[BOT AUDITOR ERRO]', e);
    }
});

// -------------------------------------------------------------
// PROTOCOLO DEAD MAN'S SWITCH (Herança Automática Sênior)
// Roda semanalmente aos Domingos à Noite
// -------------------------------------------------------------
cron.schedule('0 0 * * 0', async () => {
    console.log('[DEAD MAN SWITCH] Verificando Pulso de Vida do Administrador...');
    try {
        const lastSeenPath = path.join(ROOT_ARCHIVES, '_LAST_SEEN_ADMIN.txt');
        if (!fs.existsSync(lastSeenPath)) {
            await fs.writeFile(lastSeenPath, new Date().toISOString(), 'utf8');
            return;
        }

        const lastSeenDate = new Date(await fs.readFile(lastSeenPath, 'utf8'));
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastSeenDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 180) { // 6 Meses de Inatividade Real
            console.error('[ALERTA FINAL] Admin ausente por mais de 180 dias. INICIANDO PROTOCOLO DE HERANÇA!');
            const herancaPath = path.join(ROOT_ARCHIVES, '_HERANCA_DIGITAL_ATIVADA.txt');

            if (!fs.existsSync(herancaPath)) {
                await fs.writeFile(herancaPath, `
=========================================================
# PROTOCOLO DE HERANÇA DIGITAL ACIONADO AUTOMATICAMENTE #
=========================================================
O Cérebro Digital não registrou atividades primárias 
(Gestos Sênior) pelo Master Vault há mais de 180 dias.

As travas de segurança Nível 3 foram transpostas.
Este alerta indica que o sistema engatilharia o disparo
automático de chaves GPG e Links aos Herdeiros listados.

MÓDULO: Dead Man's Switch (NCFN Sec)
=========================================================
                `, 'utf8');
            }
        }
    } catch (e) {
        console.error('[DEAD MAN ERRO]', e);
    }
});
// -------------------------------------------------------------
// LIMPEZA AUTOMÁTICA DA LIXEIRA (Roda todo dia às 04:00 AM)
// Exclui permanentemente arquivos após 10 dias
// -------------------------------------------------------------
cron.schedule('0 4 * * *', async () => {
    console.log('[LIXEIRA] Iniciando limpeza automática...');
    const prisma = new PrismaClient();
    const TRASH_DIR = path.join(ROOT_ARCHIVES, 'lixeira');

    try {
        const dezDiasAtras = new Date();
        dezDiasAtras.setDate(dezDiasAtras.getDate() - 10);

        const itemsParaExcluir = await prisma.trashItem.findMany({
            where: { deletedAt: { lt: dezDiasAtras } }
        });

        for (const item of itemsParaExcluir) {
            const filePath = path.join(TRASH_DIR, item.filename);
            if (fs.existsSync(filePath)) {
                await fs.remove(filePath);
            }
            await prisma.trashItem.delete({ where: { id: item.id } });
            console.log(`[LIXEIRA] Arquivo expirado removido: ${item.originalPath}`);
        }

        console.log(`[LIXEIRA] Limpeza concluída. ${itemsParaExcluir.length} itens removidos.`);
    } catch (e) {
        console.error('[LIXEIRA ERRO]', e);
    } finally {
        await prisma.$disconnect();
    }
});
