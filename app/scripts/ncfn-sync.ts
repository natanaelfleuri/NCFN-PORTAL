import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load .env relative to scripts directory (../.env)
dotenv.config({ path: path.join(__dirname, '../.env') });

const COFRE_DIR = path.resolve(__dirname, '../../COFRE_NCFN');
const INDEX_PATH = path.join(COFRE_DIR, 'index.json');
const SIG_PATH = path.join(COFRE_DIR, 'index.sig');
const SECRET = process.env.NCFN_FORENSIC_SECRET || 'fallback-secret-for-dev';

interface IndexEntry {
  id: string;
  title: string;
  category: string;
  original_hash: string;
  current_hash: string;
  timestamp: string;
}

function getSha256(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function signData(data: string) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

async function run() {
  console.log('Iniciando sincronização forense do COFRE_NCFN...');
  
  if (!fs.existsSync(COFRE_DIR)) {
    console.error('Diretório COFRE_NCFN não encontrado!');
    process.exit(1);
  }

  let index: Record<string, IndexEntry> = {};
  
  if (fs.existsSync(INDEX_PATH) && fs.existsSync(SIG_PATH)) {
    const rawIndex = fs.readFileSync(INDEX_PATH, 'utf-8');
    const existingSig = fs.readFileSync(SIG_PATH, 'utf-8');
    const expectedSig = signData(rawIndex);
    
    if (existingSig !== expectedSig) {
      console.error('[ALERTA] Assinatura do index.json é inválida! Possível adulteração externa.');
      process.exit(1);
    }
    try {
      index = JSON.parse(rawIndex);
    } catch(e) {
      console.error('Falha ao parsear index.json');
      process.exit(1);
    }
  }

  const items = fs.readdirSync(COFRE_DIR);
  const categories = items.filter(d => {
    const stat = fs.statSync(path.join(COFRE_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
  });
  
  let changes = 0;
  
  for (const cat of categories) {
    const catPath = path.join(COFRE_DIR, cat);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.md') && !f.startsWith('.'));
    
    for (const file of files) {
      const filePath = path.join(catPath, file);
      const relativePath = `${cat}/${file}`;
      
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(rawContent);
      const contentHash = getSha256(parsed.content);
      const frontmatterHash = parsed.data.hash_original;
      
      const entry = index[relativePath];
      
      if (entry) {
        if (entry.current_hash !== contentHash) {
          console.log(`Detectada alteração em: ${relativePath}`);
          if (frontmatterHash !== entry.original_hash) {
            console.error(`[ALERTA DE VIOLAÇÃO DE PROVA] O arquivo ${relativePath} foi modificado, mas o hash_original não confere com a custódia!`);
            process.exit(1);
          }
          entry.current_hash = contentHash;
          entry.timestamp = parsed.data.date || new Date().toISOString();
          changes++;
        }
      } else {
        console.log(`Novo arquivo detectado: ${relativePath}`);
        if (!frontmatterHash) {
          parsed.data.hash_original = contentHash;
          const newContent = matter.stringify(parsed.content, parsed.data);
          fs.writeFileSync(filePath, newContent);
        } else if (frontmatterHash !== contentHash) {
          console.error(`[ALERTA] Arquivo novo ${relativePath} possui um hash_original que não bate com seu conteúdo!`);
          process.exit(1);
        }
        
        index[relativePath] = {
          id: parsed.data.id || crypto.randomUUID(),
          title: parsed.data.title || file.replace('.md', ''),
          category: cat,
          original_hash: parsed.data.hash_original || contentHash,
          current_hash: contentHash,
          timestamp: parsed.data.date || new Date().toISOString()
        };
        changes++;
      }
    }
  }

  for (const relPath of Object.keys(index)) {
    const checkPath = path.join(COFRE_DIR, relPath);
    if (!fs.existsSync(checkPath)) {
       console.log(`Arquivo removido: ${relPath}`);
       delete index[relPath];
       changes++;
    }
  }

  if (changes > 0) {
    const outJson = JSON.stringify(index, null, 2);
    fs.writeFileSync(INDEX_PATH, outJson);
    fs.writeFileSync(SIG_PATH, signData(outJson));
    console.log(`Índice atualizado com sucesso. Assinatura HMAC gerada.`);
    
    // Check if git is initialized
    try {
      execSync('git status', { cwd: COFRE_DIR, stdio: 'ignore' });
    } catch {
      console.log('Inicializando repositório git no COFRE...');
      execSync('git init', { cwd: COFRE_DIR });
    }

    try {
      execSync(`git add .`, { cwd: COFRE_DIR });
      execSync(`git commit -m "NCFN-SYNC | Custódia Automática: ${changes} alterações detectadas"`, { cwd: COFRE_DIR });
      console.log('✅ Commit de custódia realizado com sucesso no Git interno.');
    } catch (e: any) {
      console.log('ℹ️ Operação git executada (pode não haver novas modificações detectadas pelo git).');
    }
  } else {
    console.log('Nenhuma alteração detectada. Cofre totalmente íntegro.');
  }
}

run().catch(err => {
  console.error('Erro catastrófico no sync:', err);
  process.exit(1);
});
