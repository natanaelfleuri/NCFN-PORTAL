// @ts-nocheck
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';

const STORE_FILE = path.resolve('/arquivos', 'doc.json');

interface Folder { id: string; name: string; createdAt: string; }
interface Note {
  id: string; title: string; content: string;
  folderId?: string | null;
  createdAt: string; updatedAt: string;
  pinned?: boolean; color?: string | null;
}
interface Store { folders: Folder[]; notes: Note[]; }

async function adminGuard() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

async function readStore(): Promise<Store> {
  await fs.ensureDir(path.dirname(STORE_FILE));
  if (!fs.existsSync(STORE_FILE)) return buildSeed();
  try {
    const raw = await fs.readJson(STORE_FILE);
    if (Array.isArray(raw)) return { folders: [], notes: raw };
    return { folders: raw.folders ?? [], notes: raw.notes ?? [] };
  } catch { return buildSeed(); }
}

async function writeStore(store: Store) {
  await fs.ensureDir(path.dirname(STORE_FILE));
  await fs.writeJson(STORE_FILE, store, { spaces: 2 });
}

// ── Seed ─────────────────────────────────────────────────────────────────────
function buildSeed(): Store {
  const now = new Date().toISOString();
  const f = (name: string) => ({ id: randomUUID(), name, createdAt: now });
  const n = (title: string, content: string, folderId: string, color?: string): Note => ({
    id: randomUUID(), title, content, folderId, createdAt: now, updatedAt: now, pinned: false, color: color ?? null,
  });

  const fVisao      = f('Visão Geral');
  const fCofre      = f('Cofre Forense');
  const fAuth       = f('Autenticação & Segurança');
  const fModulos    = f('Módulos e Features');
  const fInfra      = f('Infraestrutura');
  const fSOPs       = f('Procedimentos Operacionais');

  const folders = [fVisao, fCofre, fAuth, fModulos, fInfra, fSOPs];

  const notes: Note[] = [

    // ── Visão Geral ──────────────────────────────────────────────────────────
    n('O que é o NCFN', `# NCFN — Nexus Cyber Forensic Network

## Missão

O **NCFN** é uma plataforma de segurança cibernética e perícia forense digital **auto-hospedada**. Projetada para uso por equipes de peritos em investigações digitais, com conformidade a padrões internacionais de cadeia de custódia.

## Módulos principais

| Módulo | Função |
|--------|--------|
| **Cofre Forense** | Custódia de evidências digitais com cadeia de posse completa |
| **Laudos Forenses** | Geração tipada de relatórios periciais com timestamp RFC 3161 |
| **Auditor** | Verificação de integridade de hashes e monitoramento |
| **Chat IA** | Assistente forense (Claude, Gemini, Ollama local) |
| **OSINT** | Coleta de inteligência de fontes abertas |
| **Vitrine** | Compartilhamento controlado de evidências públicas |

## Princípios de operação

| Princípio | Descrição |
|-----------|-----------|
| **Imutabilidade** | Logs append-only, hashes SHA-256 verificáveis |
| **Rastreabilidade** | Cada ação registra operador, IP, timestamp UTC |
| **Soberania** | 100% auto-hospedado, sem dependência de nuvem pública |
| **Conformidade** | ISO/IEC 27037, RFC 3161, ABNT NBR |

## Versão atual

- **v5.0** (2026-03-25)
- Fases concluídas: 0–6, v9, v11 (Fases A–D)
- Próximas pendências: Fase 7 (k3s/infra), Fase 8 (UX SSE)
`, fVisao.id, '#00f3ff'),

    n('Stack Técnica', `# Stack Técnica

## Camadas do sistema

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (Edge/Node) |
| **Banco** | PostgreSQL (Prisma ORM) — container \`ncfn_postgres\` |
| **Auth** | NextAuth.js v4 — JWT com role, TOTP, WebAuthn (simplewebauthn v8) |
| **Storage** | Volume Docker \`./COFRE_NCFN\` montado em \`/COFRE_NCFN\` |
| **Infra** | Docker Compose, Caddy (reverse proxy), Cloudflare Tunnel |
| **IA Local** | Ollama — modelo \`mistral\`, exposto em \`host.docker.internal:11434\` |

## Estrutura de diretórios

\`\`\`
/home/roaaxxz/docker/portal_ncfn/
├── docker-compose.yml    ← orquestração dos serviços
├── Caddyfile             ← reverse proxy
├── cloudflared/          ← config Cloudflare Tunnel
├── app/                  ← código Next.js
│   ├── app/
│   │   ├── admin/        ← painel admin (role=admin)
│   │   ├── api/          ← API routes
│   │   └── components/   ← componentes globais
│   ├── lib/
│   │   ├── auth.ts       ← getSession, getDbUser
│   │   ├── authOptions.ts← NextAuth config
│   │   ├── prisma.ts     ← singleton Prisma client
│   │   └── timestamp.ts  ← RFC 3161 TSA
│   └── prisma/
│       └── schema.prisma ← 23+ modelos de dados
├── COFRE_NCFN/           ← arquivos custodiados
└── arquivos/             ← uploads gerais / notas
\`\`\`

## Convenções de código

\`\`\`typescript
// @ts-nocheck                          ← SEMPRE no topo de rotas API
export const dynamic = "force-dynamic"; ← SEMPRE após o nocheck

// Auth padrão em toda rota protegida:
const session = await getSession();
if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
const dbUser = await getDbUser(session.user.email);
if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
\`\`\`
`, fVisao.id),

    // ── Cofre Forense ────────────────────────────────────────────────────────
    n('Ciclo de Vida de Custódia', `# Ciclo de Vida de Custódia Forense

## Visão geral do ciclo

\`\`\`
UPLOAD → [T0 criado] → RELATÓRIO INICIAL (auto)
                     ↓
              CRIPTOGRAFIA AES-256 (obrigatória)
                     ↓
            RELATÓRIO INTERMEDIÁRIO (≥ 2h após T0)
                     ↓
            RELATÓRIO FINAL (≥ 48h após intermediário)
                     ↓
            LAUDO MANUAL (opcional, após final concluído)
\`\`\`

## Modelo FileCustodyState

Cada arquivo no cofre tem um registro \`FileCustodyState\` que rastreia:

| Campo | Descrição |
|-------|-----------|
| \`t0\` | Momento de ingresso na custódia |
| \`encryptedAt\` | Timestamp da criptografia AES-256 |
| \`initialReportId\` | ID do LaudoForense tipo \`inicial\` |
| \`initialReportAt\` | Timestamp do relatório inicial |
| \`intermediaryReportAt\` | Timestamp do relatório intermediário |
| \`finalReportAt\` | Timestamp do relatório final |
| \`manualReportId\` | ID do LaudoForense tipo \`manual\` |
| \`manualReportDone\` | Flag de conclusão do laudo manual |

## Temporizadores

- **Relatório Intermediário**: disponível 2h após T0
- **Relatório Final**: disponível 48h após intermediário
- **Botão Final expira**: sem limite (permanente)

## Visibilidade em /admin/laudo-forense

- **Primeiras 48h após Final**: todos os relatórios visíveis
- **Após 48h**: apenas Final + Manual visíveis
- **Botão de impressão**: Manual > Final > Intermediário (Inicial = nunca)
`, fCofre.id, '#bc13fe'),

    n('Relatórios: Tipos e Fluxo', `# Tipos de Relatório Forense

## Hierarquia

### 📄 Relatório Inicial (auto)
- Gerado **automaticamente** ao criar T0
- Conteúdo: metadados do arquivo, hashes SHA-256/SHA-1/MD5, cabeçalho hex, EXIF
- **Sem impressão** (somente visualização digital)

### 📋 Relatório Intermediário (manual)
- Disponível ≥ 2h após T0
- Conteúdo: **tudo do Inicial** + achados do perito (conformidades/inconformidades)
- **Com impressão** enquanto Final não existir

### 📊 Relatório Final (manual)
- Disponível ≥ 48h após Intermediário
- Conteúdo: **tudo do Intermediário** + conclusões finais + gráfico de linha da custódia
- **Único com impressão** após gerado

### 🔬 Laudo Manual (nova leitura)
- Pode ser gerado **uma única vez** após o Final estar concluído
- Relê o arquivo com todos os dados anteriores
- Passa a ser o **principal** (substitui Final para impressão)

## Cumulative structure

\`\`\`
INICIAL = metadados + hashes + hex + EXIF
INTERMEDIÁRIO = INICIAL + achados perito
FINAL = INTERMEDIÁRIO + conclusão + timeline graph
MANUAL = FINAL + nova leitura do arquivo
\`\`\`

## Links nos PDFs

Todos os hashes (SHA-256, SHA-1, MD5) nos PDFs são **links clicáveis** que abrem \`/auditor?q=<hash>\`. O cabeçalho hexadecimal leva para \`/auditor?hex=<valor>\`.
`, fCofre.id),

    n('Criptografia e Integridade', `# Criptografia e Verificação de Integridade

## AES-256-CBC

Cada ativo forense é encriptado com:
- **Algoritmo**: AES-256-CBC (FIPS 197)
- **Chave**: derivada da senha do operador + salt único
- **IV**: gerado aleatoriamente por operação

\`\`\`
Arquivo original → AES-256-CBC(senha+salt) → arquivo.enc
\`\`\`

## Hashes calculados

| Algoritmo | Bits | Uso |
|-----------|------|-----|
| **SHA-256** | 256 | Principal — identificação forense |
| **SHA-1** | 160 | Compatibilidade com sistemas legados |
| **MD5** | 128 | Verificação rápida / referência |

## RFC 3161 — Carimbo Temporal

Cada pacote forense recebe um carimbo temporal certificado por TSA externa:
- Vincula o hash SHA-256 a um instante cronológico imutável
- Impossível alegar que o arquivo foi alterado após o registro
- Conforme RFC 3161 e padrões de admissibilidade judicial

## Detecção de Malware

Upload bloqueia automaticamente arquivos com assinatura:
- \`MZ\` / \`PE\` — executáveis Windows
- \`ELF\` — executáveis Linux
- \`Mach-O\` — executáveis macOS
- \`#!\` (shebang) — scripts shell

## Limpeza de Metadados (EXIF)

Upload → \`exiftool -all= -overwrite_original\` → arquivo sem metadados → log de auditoria
`, fCofre.id),

    // ── Autenticação ─────────────────────────────────────────────────────────
    n('NextAuth, TOTP e WebAuthn', `# Sistema de Autenticação

## Camadas de segurança

\`\`\`
1. Senha (bcrypt) + email
2. TOTP (Google Authenticator) — segunda etapa
3. WebAuthn — biometria (fingerprint/FaceID)
4. IP Binding /24 — sessão vinculada à sub-rede
\`\`\`

## NextAuth v4 (JWT)

Configurado em \`app/lib/authOptions.ts\`:
- **Provider**: Credentials (email + senha)
- **Session**: JWT com campos \`role\`, \`totpEnabled\`, \`loginIp\`
- **Callbacks**: \`jwt\` e \`session\` enriquecem o token com dados do banco

## TOTP

- Compatível com Google Authenticator / Authy
- Secret armazenado encriptado no banco
- Fluxo: login com senha → verificação TOTP → sessão criada
- Re-verificação a cada sessão (pendente implementação)

## WebAuthn (simplewebauthn v8)

- **RP ID**: \`ncfn.net\`
- **RP Name**: \`NCFN Portal\`
- Suporta fingerprint, FaceID, chaves de segurança físicas
- Dispositivos registrados em tabela \`WebAuthnCredential\`

## IP Binding

O middleware verifica se o IP da requisição está na mesma sub-rede /24 do IP de login. Se divergir, sessão encerrada e admin notificado.

## DEV_BYPASS

\`\`\`env
DEV_BYPASS=true  ← bypassa auth em desenvolvimento local
\`\`\`
`, fAuth.id),

    n('Roles e Permissões', `# Roles e Permissões

## Roles disponíveis

| Role | Acesso | Descrição |
|------|--------|-----------|
| \`admin\` | Total | Acesso a todos os módulos e APIs |
| \`user\` | Limitado | Acesso ao vault público e vitrine |
| \`guest\` | Mínimo | Somente visualização pública |

## Proteção de rotas

### Middleware (\`app/middleware.ts\`)
Intercepta todas as rotas protegidas antes do handler:
- Verifica JWT válido
- Verifica role ≥ mínimo exigido pela rota
- Verifica IP binding /24

### API Routes
Cada rota protegida usa o padrão:
\`\`\`typescript
const session = await getSession();
if (!session?.user?.email) return 401;
const dbUser = await getDbUser(session.user.email);
if (dbUser.role !== 'admin') return 403;
\`\`\`

## Rate Limiting

Implementado em \`app/lib/rateLimit.ts\` (sliding window in-memory):
- Por IP + endpoint
- Configurável por rota
- Resposta 429 com \`Retry-After\` header
`, fAuth.id),

    n('Rate Limiting e Canary', `# Rate Limiting e Armadilhas Canary

## Rate Limiting

**Arquivo**: \`app/lib/rateLimit.ts\`
**Algoritmo**: Sliding window in-memory

\`\`\`typescript
import { checkRateLimit } from '@/lib/rateLimit';

const allowed = checkRateLimit(ip, 'endpoint-name', {
  windowMs: 60_000, // 1 minuto
  maxRequests: 10,
});
if (!allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
\`\`\`

**Pendente**: aplicar em \`/api/vault/upload\` e \`/api/vault/capture\` ([6.1])

## Canary Tokens

**Arquivo**: \`app/lib/canaryAlert.ts\`
**Função**: envia email de alerta quando arquivo-armadilha é acessado

### Como funciona
1. Arquivo especial colocado em pasta monitorada
2. Qualquer acesso dispara \`canaryAlert(ip, filename, email)\`
3. Email enviado via nodemailer para admin
4. Log registrado com dados do acesso

### Configuração (env)
\`\`\`env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ncfn@ncfn.net
SMTP_PASS=app-password-here
\`\`\`

### Módulo ARMADILHA DIGITAL
Localizado em \`/admin/canary\` — gerencia os arquivos-armadilha e visualiza alertas disparados.
`, fAuth.id),

    // ── Módulos ──────────────────────────────────────────────────────────────
    n('Chat IA — Claude, Gemini, Ollama', `# Chat IA Forense

## Provedores disponíveis

| Provedor | Modelo padrão | Tipo |
|----------|--------------|------|
| **Claude** (Anthropic) | claude-sonnet-4-6 | API externa |
| **Gemini** (Google) | gemini-2.0-flash | API externa |
| **Sansão** (Ollama local) | mistral | Local no host |

## Arquitetura

- **Streaming SSE**: respostas em tempo real via Server-Sent Events
- **Histórico persistido**: mensagens salvas no banco PostgreSQL
- **Streaming simultâneo**: pode consultar múltiplos provedores ao mesmo tempo

## Endpoint

\`\`\`
POST /api/chat
Content-Type: application/json

{ "message": "...", "provider": "claude|gemini|ollama", "conversationId": "..." }
\`\`\`

## Configuração Ollama

\`\`\`env
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=mistral
OLLAMA_VISION_MODEL=llava  ← para análise de imagens
\`\`\`

## Uso forense

O Chat IA pode ser usado para:
- Análise de logs e artefatos forenses
- Geração de templates de laudos
- Consultas sobre padrões de malware
- Interpretação de metadados e hashes
`, fModulos.id),

    n('Auditor e Verificação de Hash', `# Módulo Auditor

## Funções principais

### 1. Verificação de hash de arquivos custodiados
- Campo de entrada para SHA-256, SHA-1 ou MD5
- Compara com todos os arquivos no cofre
- Se encontrado: exibe detalhes do arquivo, pasta, data de ingresso
- Se não encontrado: oferece botão "CARREGAR EVIDÊNCIA DIGITAL"

### 2. Inspeção de cabeçalho hexadecimal
- Entrada do cabeçalho hex do arquivo
- Identifica o tipo de arquivo pelos magic bytes
- Exemplos: \`MZ\` = PE executable, \`FFD8FF\` = JPEG, \`89504E47\` = PNG

### 3. Links nos PDFs
Todos os relatórios forenses têm links nos hashes:
- \`/auditor?q=<sha256>\` → pré-preenche campo e dispara busca
- \`/auditor?hex=<header>\` → pré-preenche campo hex e dispara busca

## URL params

\`\`\`
/auditor?q=sha256hexvalue    ← busca por hash
/auditor?hex=ffd8ff          ← busca por cabeçalho hex
\`\`\`

## Monitoramento interno

O Auditor também exibe:
- Logs de sessão recentes
- Alertas canary disparados
- Status do sistema em tempo real
`, fModulos.id),

    n('OSINT e Captura Web', `# OSINT e Captura Forense Web

## Módulo Captura Web (/admin/captura-web)

Preserva páginas digitais com valor probatório:

| Artefato | Descrição |
|----------|-----------|
| **Screenshot** | Imagem full-page em alta resolução |
| **PDF** | Página renderizada como PDF |
| **HTML/DOM** | Código-fonte completo |
| **HAR** | Tráfego de rede capturado |
| **Certificado SSL** | Dados TLS/HTTPS da página |
| **WHOIS** | Registro do domínio |
| **RFC 3161** | Carimbo temporal certificado |

Todo o bundle é custodiado automaticamente no Cofre.

## OSINT Desktop (/admin/investigar)

Desktop Ubuntu/XFCE via noVNC no browser:
- **Sherlock** — busca de usuários em redes sociais
- **theHarvester** — coleta de emails e subdomínios
- **nmap** — varredura de portas e serviços
- **recon-ng** — framework de reconhecimento

\`\`\`env
# Ativar: docker compose --profile osint up -d
OSINT_DESKTOP_PASSWORD=SenhaForte@2026
\`\`\`

## Varredura OSINT (/admin/varreduras)

Interface web para executar ferramentas OSINT sem precisar do desktop:
- Entrada de alvo (IP, domínio, email)
- Seleção de ferramenta
- Output em tempo real via SSE
`, fModulos.id),

    // ── Infraestrutura ───────────────────────────────────────────────────────
    n('Docker e Containers', `# Infraestrutura Docker

## Serviços ativos (padrão)

| Container | Porta | Função |
|-----------|-------|--------|
| \`portal_ncfn_dev\` | 3002→3000 | App Next.js |
| \`caddy_ncfn\` | 80 | Reverse proxy |
| \`ncfn_cloudflared\` | host | Tunnel CF → localhost:3002 |
| \`ncfn_ttyd\` | 7681 | Terminal web |
| \`ncfn_web_check\` | 3005 | Web-check OSINT |
| \`ncfn_postgres\` | 5432 | PostgreSQL |

## Docker profiles (ativar conforme necessário)

\`\`\`bash
docker compose --profile postgres up -d   # PostgreSQL
docker compose --profile whisper up -d   # Whisper ASR (~1.5GB RAM)
docker compose --profile rag up -d       # ChromaDB
docker compose --profile osint up -d     # OSINT Desktop (~2-4GB RAM)
docker compose --profile cache up -d     # Redis
\`\`\`

## Comandos essenciais

\`\`\`bash
# Rebuild do portal após mudanças de código
docker compose up -d --build portal

# Ver logs em tempo real
docker logs portal_ncfn_dev -f --tail 50

# Migração de schema
docker exec portal_ncfn_dev npx prisma migrate deploy

# Reload do Caddy
docker exec caddy_ncfn caddy reload --config /etc/caddy/Caddyfile
\`\`\`

## Volumes persistentes

| Volume | Caminho host | Conteúdo |
|--------|-------------|----------|
| \`./COFRE_NCFN\` | \`/COFRE_NCFN\` | Evidências custodiadas |
| \`./arquivos\` | \`/arquivos\` | Uploads gerais, notas, JSON |
| \`./app/prisma/dev.db\` | \`/app/prisma/dev.db\` | SQLite (dev) |
`, fInfra.id),

    n('Caddy e Cloudflare Tunnel', `# Caddy e Cloudflare Tunnel

## Arquitetura de rede

\`\`\`
Internet
   ↓ (HTTPS/TLS 1.3)
Cloudflare Edge
   ↓ (WireGuard/QUIC)
cloudflared (container host network)
   ↓ (HTTP/2 → localhost:3002)
Caddy (proxy reverso, porta 80)
   ↓ (HTTP interno)
Next.js App (porta 3000)
\`\`\`

## Por que Cloudflare Tunnel?

- Sem porta pública exposta (sem 443 aberto no firewall)
- TLS gerenciado pela Cloudflare Edge
- DDoS protection nativo
- IP real do visitante em header \`CF-Connecting-IP\`

## Caddyfile

Arquivo em \`/home/roaaxxz/docker/portal_ncfn/Caddyfile\`.

Após editar:
\`\`\`bash
docker exec caddy_ncfn caddy reload --config /etc/caddy/Caddyfile
# Se inode stale:
docker restart caddy_ncfn
\`\`\`

## Cloudflare config

Arquivo em \`./cloudflared/config.yml\`:
\`\`\`yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json
ingress:
  - hostname: ncfn.net
    service: http://localhost:3002
  - service: http_status:404
\`\`\`

## Nota sobre Caddy + ACME

Caddy tenta Let's Encrypt ALPN (inofensivo com CF tunnel que já tem TLS). \`unhealthy\` no healthcheck é esperado.
`, fInfra.id),

    n('PostgreSQL e Prisma', `# PostgreSQL e Prisma ORM

## Configuração

\`\`\`env
DATABASE_URL=postgresql://ncfn:ncfn2026@ncfn_postgres:5432/ncfn_db
\`\`\`

## Singleton Prisma

**Nunca instanciar PrismaClient diretamente.** Usar sempre:
\`\`\`typescript
import { prisma } from '@/lib/prisma';
\`\`\`

## Modelos principais (schema.prisma)

| Modelo | Descrição |
|--------|-----------|
| \`User\` | Usuários com role, TOTP, WebAuthn |
| \`Session\` | Sessões ativas com IP binding |
| \`VaultFile\` | Metadados dos arquivos no cofre |
| \`Pericia\` | Perícias forenses realizadas |
| \`LaudoForense\` | Laudos tipados (inicial/intermediário/final/manual) |
| \`FileCustodyState\` | Estado do ciclo de vida de custódia |
| \`WebAuthnCredential\` | Dispositivos biométricos registrados |
| \`ChatMessage\` | Histórico de chat IA |
| \`AuditLog\` | Log de auditoria imutável |

## Migrations

\`\`\`bash
# Desenvolvimento (cria migration)
docker exec portal_ncfn_dev npx prisma migrate dev --name descricao

# Produção (aplica migrations pendentes)
docker exec portal_ncfn_dev npx prisma migrate deploy

# Mudanças aditivas sem reset (ex: nova coluna nullable)
docker exec portal_ncfn_dev npx prisma db push
\`\`\`

> ⚠️ \`migrate dev\` pode detectar drift e pedir reset. Use \`db push\` para mudanças aditivas em desenvolvimento.
`, fInfra.id),

    // ── SOPs ─────────────────────────────────────────────────────────────────
    n('SOP: Ingresso de Evidências', `# SOP — Procedimento de Ingresso de Evidências

## Objetivo

Garantir que evidências digitais sejam ingressadas no cofre com cadeia de custódia completa e matematicamente verificável.

## Pré-requisitos

- [ ] Acesso ao portal com role \`admin\`
- [ ] TOTP verificado na sessão
- [ ] Arquivo original (cópia forense bit-a-bit, se possível)

## Procedimento

### 1. Acesso ao Vault
Navegar para \`/vault\` → selecionar a pasta de destino adequada:

| Pasta | Uso |
|-------|-----|
| \`0_NCFN-ULTRASECRETOS\` | Dados de alto sigilo |
| \`1_NCFN-PROVAS-SENSÍVEIS\` | Evidências sensíveis |
| \`2_NCFN-ELEMENTOS-DE-PROVA\` | Elementos de prova gerais |
| \`7_NCFN-CAPTURAS-WEB_OSINT\` | Capturas web/OSINT |

### 2. Upload do Arquivo
- Arrastar arquivo para a zona de upload ou clicar em "Selecionar Arquivo"
- O sistema verifica magic bytes (rejeita executáveis automaticamente)
- Confirmar formulário de custódia (nome do caso, operador, descrição)

### 3. Criptografia (obrigatória)
- Modal de senha AES-256 aparece automaticamente após o upload
- Definir senha forte e memorizá-la (não há recuperação)
- O sistema gera automaticamente o **Relatório Inicial**

### 4. Verificação pós-ingresso
- Confirmar que T0 foi registrado
- Confirmar que SHA-256, SHA-1 e MD5 foram calculados
- Confirmar que Relatório Inicial está disponível em \`/admin/laudo-forense\`

## Pós-ingresso

- Aguardar ≥ 2h para gerar Relatório Intermediário
- Documentar achados na seção de conformidades/inconformidades
`, fSOPs.id, '#22c55e'),

    n('SOP: Geração de Laudos', `# SOP — Procedimento de Geração de Laudos

## Ciclo de laudos

\`\`\`
T0 (upload) → Inicial (auto) → Intermediário (≥2h) → Final (≥48h após inter.) → Manual (opcional)
\`\`\`

## Relatório Inicial
- **Automático**: gerado no momento do upload e criptografia
- **Não requer intervenção do perito**
- Conteúdo: hashes, metadados, EXIF, cabeçalho hex

## Relatório Intermediário

### Quando gerar
- Mínimo 2h após T0
- Após análise detalhada do arquivo pelo perito

### O que documentar
- [ ] Conformidades encontradas
- [ ] Inconformidades e anomalias
- [ ] Metadados suspeitos ou relevantes
- [ ] Correlações com outros casos

### Procedimento
1. Acessar \`/vault\` → arquivo custodiado
2. Clicar em "RELATÓRIO INTERMEDIÁRIO"
3. O PDF é gerado e disponibilizado em \`/admin/laudo-forense\`

## Relatório Final

### Quando gerar
- Mínimo 48h após Relatório Intermediário
- Após conclusão completa da análise

### O que documentar
- [ ] Conclusões definitivas
- [ ] Parecer técnico-jurídico
- [ ] Recomendações
- [ ] Referências a normas e padrões

## Laudo Manual (Nova Leitura)

- Somente após Final concluído
- Apenas **um** laudo manual por arquivo
- Usado para re-análise com novos dados ou contestação
`, fSOPs.id),

    n('SOP: Coleta OSINT', `# SOP — Coleta OSINT e Preservação de Evidências Web

## Pré-requisitos

- [ ] Alvo identificado (URL, domínio, IP, email, username)
- [ ] Justificativa legal documentada
- [ ] Acesso ao módulo \`/admin/captura-web\`

## Coleta de Página Web

### 1. Captura Forense Web
Acessar \`/admin/captura-web\` e inserir URL alvo.

O sistema captura automaticamente:
- Screenshot full-page
- PDF renderizado
- HTML/DOM completo
- Tráfego HAR
- Certificado SSL
- WHOIS do domínio
- Carimbo RFC 3161

### 2. Custódia automática
Todos os artefatos são ingressados automaticamente na pasta \`7_NCFN-CAPTURAS-WEB_OSINT\`.

### 3. Documentar contexto
Após captura, gerar Relatório Inicial documentando:
- URL capturada
- Data/hora UTC
- IP do servidor alvo
- Motivo da coleta

## Coleta OSINT (theHarvester, Sherlock, etc.)

### 1. Acessar OSINT Desktop
\`/admin/investigar\` → Ubuntu/XFCE via browser

### 2. Documentar antes de iniciar
Criar nota em \`/admin/links-uteis\` com:
- Alvo da investigação
- Ferramentas utilizadas
- Hash do arquivo de resultados (antes de qualquer edição)

### 3. Exportar e custodiar resultados
\`\`\`bash
# Exemplo com theHarvester
theHarvester -d exemplo.com.br -b all -f resultados.html
# Upload do resultados.html para o Cofre Forense
\`\`\`

## Boas práticas

> ⚠️ **Nunca editar** o arquivo após calcular o hash inicial.
> Qualquer modificação invalida a cadeia de custódia.

- Registrar todas as etapas com timestamp
- Manter VPN ou ambiente isolado para coletas sensíveis
- Documentar o método exato (ferramenta, versão, parâmetros)
`, fSOPs.id),
  ];

  return { folders, notes };
}

// ── Handlers ─────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });
    const store = await readStore();
    // Persist seed if first time
    if (!fs.existsSync(STORE_FILE)) await writeStore(store);
    return NextResponse.json(store);
  } catch (error) {
    console.error('[doc GET]', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const body = await req.json();
    const store = await readStore();
    const now = new Date().toISOString();

    if (body.type === 'folder') {
      const name = body.name?.trim();
      if (!name) return new NextResponse('Nome obrigatório', { status: 400 });
      const folder: Folder = { id: randomUUID(), name, createdAt: now };
      store.folders.push(folder);
      await writeStore(store);
      return NextResponse.json(folder, { status: 201 });
    }

    const { id, title, content, folderId } = body;
    if (!title?.trim()) return new NextResponse('Título obrigatório', { status: 400 });

    if (id) {
      const idx = store.notes.findIndex(n => n.id === id);
      if (idx === -1) return new NextResponse('Nota não encontrada', { status: 404 });
      store.notes[idx] = {
        ...store.notes[idx],
        title: title.trim(),
        content: content ?? '',
        folderId: folderId !== undefined ? (folderId ?? null) : store.notes[idx].folderId,
        pinned: body.pinned !== undefined ? body.pinned : store.notes[idx].pinned,
        color: body.color !== undefined ? body.color : store.notes[idx].color,
        updatedAt: now,
      };
      await writeStore(store);
      return NextResponse.json(store.notes[idx]);
    }

    const note: Note = {
      id: randomUUID(), title: title.trim(), content: content ?? '',
      folderId: folderId ?? null, createdAt: now, updatedAt: now,
    };
    store.notes.unshift(note);
    await writeStore(store);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('[doc POST]', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });
    const body = await req.json();
    const store = await readStore();
    const now = new Date().toISOString();

    if (body.type === 'rename-folder') {
      const idx = store.folders.findIndex(f => f.id === body.id);
      if (idx === -1) return new NextResponse('Pasta não encontrada', { status: 404 });
      store.folders[idx] = { ...store.folders[idx], name: body.name.trim() };
      await writeStore(store);
      return NextResponse.json(store.folders[idx]);
    }

    if (body.type === 'patch-note') {
      const { id, ...fields } = body;
      const idx = store.notes.findIndex(n => n.id === id);
      if (idx === -1) return new NextResponse('Nota não encontrada', { status: 404 });
      const allowed = ['pinned', 'color', 'folderId'];
      const patch: Partial<Note> = {};
      for (const k of allowed) { if (k in fields) (patch as any)[k] = fields[k]; }
      store.notes[idx] = { ...store.notes[idx], ...patch, updatedAt: now };
      await writeStore(store);
      return NextResponse.json(store.notes[idx]);
    }

    return new NextResponse('Tipo não reconhecido', { status: 400 });
  } catch (error) {
    console.error('[doc PATCH]', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    if (!id) return new NextResponse('id obrigatório', { status: 400 });

    const store = await readStore();

    if (type === 'folder') {
      store.folders = store.folders.filter(f => f.id !== id);
      store.notes = store.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n);
      await writeStore(store);
      return NextResponse.json({ success: true });
    }

    const before = store.notes.length;
    store.notes = store.notes.filter(n => n.id !== id);
    if (store.notes.length === before) return new NextResponse('Nota não encontrada', { status: 404 });
    await writeStore(store);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[doc DELETE]', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
