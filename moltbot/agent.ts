import { chromium, Page } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ollama } from 'ollama';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { ForensicPacker } from './utils/forensic/packer';

const forensicPacker = new ForensicPacker();
const __filename = fileURLToPath(import.meta.url);
dotenv.config();

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const modelGemini = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); 
const ollama = new Ollama({ host: process.env.OLLAMA_URL || 'http://localhost:11434' });

const STORAGE_PATH = process.env.OSINT_STORAGE_PATH || '/home/roaaxxz/docker/portal_ncfn/2_OSINT';
fs.ensureDirSync(STORAGE_PATH);

interface ForensicEvidence {
  path: string;
  hash: string;
  description: string;
}

async function getFileHash(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function compressImage(buffer: Buffer) {
  return await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside' }) // Optimized for Gemini 1.5 Pro vision tokens
    .jpeg({ quality: 60, progressive: true }) // Higher compression for cost saving
    .toBuffer();
}

async function isAlreadyAnalyzed(hash: string) {
  const existing = await prisma.moltbotLog.findFirst({
    where: { sha256Hash: hash, status: 'success' }
  });
  return existing;
}

async function sendEmailNotification(subject: string, content: string, attachments: any[] = []) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: '"NCFN Intel Agent" <intel@ncfn.net>',
      to: 'fleuriengenharia@gmail.com',
      subject,
      text: content,
      html: content.replace(/\n/g, '<br>'),
      attachments,
    });
    console.log(`[Moltbot] Email sent: ${subject}`);
  } catch (error) {
    console.error('[Moltbot] Email failed:', error);
  }
}

async function logForensicAction(taskName: string, status: string, logText: string, screenshotPath?: string, costBRL: number = 0) {
  const hash = crypto.createHash('sha256').update(logText + (screenshotPath || '')).digest('hex');
  await prisma.moltbotLog.create({
    data: {
      taskName,
      status,
      logText,
      screenshotPath,
      sha256Hash: hash,
      costBRL,
    }
  });
  
  await prisma.moltbotConfig.update({
    where: { id: 'default' },
    data: { 
      currentUsageBRL: { increment: costBRL },
      lastScanAt: new Date(),
    }
  });
}

const CRIMINAL_DICTIONARY = {
  NARCOTRAFICO: ['pó', 'giz', 'branca', 'escama', 'balança', 'kilo', 'prensa', 'tele', 'delivery', 'vibe', 'skunk', 'gelo', 'flor'],
  ARMAS: ['peça', 'ferro', 'oitão', 'glock', 'fuzil', '7.62', '5.56', 'munição', 'pente', 'carregador', 'raspada'],
  ESTELIONATO: ['info', 'log', 'trampo', 'esquema', 'pix', 'laranja', 'conta', 'checker', 'db', 'painel', 'central'],
  FACCOES: ['comando', 'cv', 'pcc', 'tdr', '13', '1533', 'conselho', 'irmandade', 'disciplina']
};

async function checkHighGravity(text: string) {
  const gravityTerms = ['fuzil', '7.62', 'criança', 'novinha', 'morto', 'execução', 'bomba'];
  return gravityTerms.some(term => text.toLowerCase().includes(term));
}

async function perform360Audit() {
  console.log('[Moltbot] Initiating 360º Security Audit...');
  
  // Verify API Keys
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing!');
  if (process.env.GEMINI_API_KEY.length < 20) throw new Error('GEMINI_API_KEY is too short, potential leak or invalid key!');

  // Check Storage Permissions
  try {
    const testFile = path.join(STORAGE_PATH, '.audit_test');
    await fs.writeFile(testFile, 'audit_ok');
    await fs.remove(testFile);
  } catch (err) {
    throw new Error(`Storage Audit Failed: No write permission in ${STORAGE_PATH}`);
  }

  // Check Ollama Health
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const res = await fetch(`${ollamaUrl}/api/tags`);
    if (!res.ok) throw new Error('Ollama service unreachable');
  } catch {
     console.warn('[Moltbot] OSINT-Audit: Ollama offline, proceeding with Gemini fallback mode.');
  }

  console.log('[Moltbot] 360º Audit Successful.');
}

async function extractIdentifiers(text: string) {
  const identifiers = {
    usernames: Array.from(new Set(text.match(/@[\w.-]+/g) || [])),
    whatsapp: Array.from(new Set(text.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?\d{4}[-\s]?\d{4})/g) || [])),
    pix: Array.from(new Set(text.match(/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])),
    telegram: Array.from(new Set(text.match(/t\.me\/[\w_]+/g) || []))
  };
  return identifiers;
}

async function runDeepScan() {
  await perform360Audit();

  const config = await prisma.moltbotConfig.findUnique({ where: { id: 'default' } });
  if (!config) return;

  if (config.currentUsageBRL >= config.dailyQuotaBRL) {
    await sendEmailNotification(
      '[NCFN-INTEL] ALERTA: Cota Diária Atingida',
      `O sistema atingiu o limite de R$ ${config.dailyQuotaBRL.toFixed(2)}. Varredura interrompida.`
    );
    return;
  }

  // Target extraction logic
  const targets = await prisma.osintKeyword?.findMany({ where: { active: true } }) || [{ keyword: 'ncfn.org.br' }];
  const evidences: ForensicEvidence[] = [];
  let totalCost = 0;

  console.log(`[Moltbot] Starting Operation Ciber-Gaeco Intel Extraction...`);
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (const target of targets) {
      const url = target.keyword.startsWith('http') ? target.keyword : `https://google.com/search?q=${encodeURIComponent(target.keyword)}`;
      console.log(`[Moltbot] Analyzing: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        
        // Materiality: Screenshot
        const rawScreenshot = await page.screenshot({ fullPage: true });
        const compressed = await compressImage(rawScreenshot);
        const hash = await getFileHash(compressed);
        
        // Visual Cache Check
        const cachedAnalysis = await isAlreadyAnalyzed(hash);
        let technicalAnalysis = '';
        
        if (cachedAnalysis) {
          console.log(`[Moltbot] Visual Cache Hit for ${hash}. Skipping Gemini.`);
          technicalAnalysis = cachedAnalysis.logText;
        } else {
          // Vision Analysis with Gemini 1.5 Pro (ONLY for visual materiality)
          const visionResult = await modelGemini.generateContent([
            "AUDITORIA VISUAL CIBER-GAECO:\n" +
            "1. Detecte logotipos de facções (PCC, CV, etc), armas, entorpecentes ou ostentação de valores.\n" +
            "2. Identifique elementos biométricos (rostos) e metadados visuais.\n" +
            "3. Avalie o risco de materialidade criminal puramente visual.\n" +
            "ESTE RELATÓRIO SERÁ PROCESSADO POR OUTRA IA PARA ENQUADRAMENTO LEGAL.",
            { inlineData: { data: compressed.toString('base64'), mimeType: 'image/jpeg' } }
          ]);
          technicalAnalysis = visionResult.response.text();
          totalCost += 0.005; // Gemini 1.5 Pro Vision price estimate
        }

        const filename = `evidence_${Date.now()}_${hash.slice(0, 10)}.jpg`;
        const filePath = path.join(STORAGE_PATH, filename);
        await fs.writeFile(filePath, compressed);

        // Deep Text & Legal Analysis with Ollama (Local/No Cost)
        const pageText = await page.innerText('body');
        
        let finalReport = '';
        try {
          const ollamaResult = await ollama.chat({
            model: process.env.OLLAMA_MODEL || 'llama3:8b',
            messages: [{ 
              role: 'user', 
              content: `VOCÊ É UM ANALISTA FORENSE DO GAECO.
              DADOS VISUAIS (GEMINI): ${technicalAnalysis}
              TEXTO DA PÁGINA: ${pageText.slice(0, 6000)}
              DICIONÁRIO CRIMINAL: ${JSON.stringify(CRIMINAL_DICTIONARY)}
              
              TAREFAS:
              1. Cruze os dados visuais com o texto.
              2. Mapeie gírias do dicionário.
              3. Enquadre no Código Penal Brasileiro ou Lei de Drogas (11.343/06).
              4. Extraia chaves PIX, @ de redes sociais e telefones.
              
              FORMATE COMO LAUDO PERICIAL.` 
            }],
          });
          finalReport = ollamaResult.message.content;
        } catch (err) {
          console.warn('[Moltbot] Ollama failed, using Gemini analysis as base.');
          finalReport = technicalAnalysis;
        }

        const identifiers = await extractIdentifiers(finalReport + " " + pageText);
        const isHighGravity = await checkHighGravity(finalReport);

        if (isHighGravity) {
          await sendEmailNotification(
            `[FLASH-ALERT] ALTA GRAVIDADE DETECTADA: ${url}`,
            `MATERIALIDADE DE ALTO RISCO DETECTADA.\n\nAlvo: ${url}\nResumo:\n${finalReport}\n\nIdentificadores:\n${JSON.stringify(identifiers, null, 2)}`
          );
        }

        evidences.push({
          path: filePath,
          hash: hash,
          description: `**ALVO: ${url}**\n\n${finalReport}\n\n**FORENSIC DATA EXTRACTION:**\n- Usuários: ${identifiers.usernames.join(', ')}\n- WhatsApp: ${identifiers.whatsapp.join(', ')}\n- Pix: ${identifiers.pix.join(', ')}\n- Telegram: ${identifiers.telegram.join(', ')}`
        });

        // Log for Visual Cache
        if (!cachedAnalysis) {
          await logForensicAction(`Auto-Audit: ${url}`, 'success', technicalAnalysis, filePath, 0.005);
        }

      } catch (err: any) {
        console.error(`[Moltbot] Failed target ${url}:`, err.message);
        continue;
      }
    }

    // Compile Standardized Forensic Report
    const reportDateStr = new Date().toISOString().split('T')[0];
    const reportTime = new Date().toLocaleTimeString('pt-BR');
    const filenameReport = `RELATORIO AUTOMÁTICO DE RASTREAMENTO DE CRIMES E INTELIGENCIA POLICIAL - ${reportDateStr}.md`;
    
    let reportMd = `# CIBER-GAECO Intel Extraction Report\n`;
    reportMd += `## CADERNO DE INTELIGÊNCIA FORENSE - OPERAÇÃO OPENCLAW\n\n`;
    reportMd += `- **Data/Hora**: ${reportDateStr} ${reportTime}\n`;
    reportMd += `- **Finalidade**: Produção de Materialidade Digital Blindada\n`;
    reportMd += `- **Protocolo**: 360º Audit Integrity Validated\n\n`;
    reportMd += `--- \n\n`;
    
    evidences.forEach((ev, idx) => {
      reportMd += `### PROVA DIGITAL #${idx + 1}\n`;
      reportMd += `- **Hash SHA-256 (Cadeia de Custódia)**: \`${ev.hash}\`\n`;
      reportMd += `- **Evidência Física (Arquivo)**: ${path.basename(ev.path)}\n\n`;
      reportMd += `#### ANÁLISE TÉCNICA:\n${ev.description}\n\n`;
      reportMd += `---\n\n`;
    });

    const reportPath = path.join(STORAGE_PATH, filenameReport);
    await fs.writeFile(reportPath, reportMd);
    
    // Final Hash of the entire report for integrity
    const finalBuffer = await fs.readFile(reportPath);
    const finalHash = await getFileHash(finalBuffer);
    await fs.appendFile(reportPath, `\n\n**INTEGRIDADE DO RELATÓRIO (SHA-256):** ${finalHash}\n`);

    await sendEmailNotification(
      `[OP-OPENCLAW] Inteligência Criminal Digital - [${reportDateStr}]`,
      `Segue anexo o Relatório de Inteligência consolidado da Operação OpenClaw.\n` +
      `Integridade garantida por SHA-256: ${finalHash}\n` +
      `Total de evicências processadas: ${evidences.length}`,
      [{ filename: filenameReport.replace('.md', '.pdf.md'), path: reportPath }]
    );

    await logForensicAction('Ciber-Gaeco Intel Extractor', 'success', `Relatório GAECO gerado com ${evidences.length} evidências.`, reportPath, totalCost);

  } catch (error: any) {
    console.error('[Moltbot] Operation Error:', error);
    await logForensicAction('Ciber-Gaeco Intel Extractor', 'failure', `Erro Crítico: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function startScheduler() {
  console.log('[Moltbot] OpenClaw Intel Mode Active.');
  
  // Update schedule: Saturdays at 02:00 AM
  cron.schedule('0 2 * * 6', async () => {
    console.log('[Moltbot] Triggering scheduled Saturday scan (02:00 AM)...');
    await runDeepScan();
  });

  // Daily reset
  cron.schedule('0 0 * * *', async () => {
    await prisma.moltbotConfig.update({
      where: { id: 'default' },
      data: { currentUsageBRL: 0.0 }
    });
  });

  // Pulse
  setInterval(() => console.log(`[Moltbot] System Online: ${new Date().toISOString()}`), 3600000);
}

if (process.argv[1] === __filename) {
  if (process.argv[2] === '--service') {
    startScheduler().catch(console.error);
  } else {
    runDeepScan().catch(console.error);
  }
}
