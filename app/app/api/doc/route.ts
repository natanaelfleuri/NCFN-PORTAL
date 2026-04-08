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

O **NCFN** é uma plataforma de segurança cibernética e perícia forense digital **auto-hospedada**. Projetada para equipes de peritos em investigações digitais, com conformidade a padrões internacionais de cadeia de custódia.

## Módulos operacionais (v15)

| Módulo | Rota | Função |
|--------|------|--------|
| **Vault Forense** | \`/vault\` | Custódia de evidências com ciclo completo (T0 → Laudo) |
| **Laudos Forenses** | \`/admin/laudo-forense\` | Relatórios periciais com timestamp RFC 3161 |
| **Cloud Custody** | *(integrado ao Vault)* | Backup imutável na Cloudflare R2 |
| **Timeline de Custódia** | \`/admin/timeline\` | Histórico cronológico de todos os ativos |
| **Análise Forense** | \`/analise\` | Fluxo guiado: upload → encriptação → perícia → laudo |
| **Captura Web** | \`/admin/captura-web\` | Preservação forense de páginas da web |
| **Auditor** | \`/auditor\` | Verificação de hashes e integridade |
| **Convidados** | \`/admin/convidados\` | Acesso temporário controlado ao portal |
| **Usuários** | \`/admin/usuarios\` | Gestão de contas e permissões |
| **Vitrine** | \`/vitrine\` | Compartilhamento público controlado de evidências |
| **Guia / Docs** | \`/doc\` | Documentação interna (este módulo) |

## Princípios de operação

| Princípio | Descrição |
|-----------|-----------|
| **Imutabilidade** | Logs append-only, hashes SHA-256 verificáveis |
| **Rastreabilidade** | Cada ação registra operador, IP e timestamp UTC |
| **Soberania** | Auto-hospedado na VPS NCFN, sem dependência de nuvem pública |
| **Conformidade** | ISO/IEC 27037, RFC 3161, ABNT NBR |

## Versão atual

- **v15** (2026-04-07)
- Infraestrutura migrada para **k3s** (Kubernetes leve)
- Auth via **Cloudflare Access + GitHub OAuth**
- Cloud Custody com **Cloudflare R2**
- Banco: **SQLite** (Prisma ORM)
`, fVisao.id, '#00f3ff'),

    n('Stack Técnica', `# Stack Técnica

## Camadas do sistema

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (Node.js) |
| **Banco** | SQLite — \`/app/prisma/dev.db\` (Prisma ORM) |
| **Auth primária** | Cloudflare Access + GitHub OAuth |
| **Auth de sessão** | NextAuth.js v4 — JWT com role, TOTP, WebAuthn |
| **Storage local** | \`/COFRE_NCFN/\` (evidências) + \`/arquivos/\` (uploads) |
| **Storage nuvem** | Cloudflare R2 (Cloud Custody) |
| **Infra** | k3s (Kubernetes leve) na VPS \`163.245.218.241\` |
| **Proxy** | Caddy 2 (hostNetwork no k3s) |
| **Túnel** | Cloudflare Tunnel (sem porta pública exposta) |

## Arquitetura de deploy

\`\`\`
PC Local (roaaxxz-Nitro)          VPS (163.245.218.241)
├── Código fonte (git)    →push→   ├── /root/docker/portal_ncfn/
├── Claude Code (dev)              ├── k3s cluster
└── SEGUNDO CEREBRO                │   ├── pod/portal   (Next.js)
    (ncfn.ncfn.net)                │   ├── pod/caddy    (proxy)
                                   │   └── pod/cloudflared (tunnel)
                                   └── GitHub ← origem do código
\`\`\`

## Estrutura de diretórios (VPS)

\`\`\`
/root/docker/portal_ncfn/
├── app/                    ← código Next.js
│   ├── app/
│   │   ├── admin/          ← painel admin (role=admin)
│   │   ├── api/            ← API routes
│   │   └── components/     ← componentes globais
│   ├── lib/
│   │   ├── auth.ts         ← getSession, getDbUser
│   │   ├── authOptions.ts  ← NextAuth config + CF Access provider
│   │   ├── cfAccess.ts     ← verificação JWT Cloudflare Access
│   │   ├── prisma.ts       ← singleton Prisma client
│   │   ├── r2.ts           ← Cloudflare R2 client
│   │   └── timestamp.ts    ← RFC 3161 TSA
│   └── prisma/
│       └── schema.prisma   ← modelos SQLite
├── k8s/                    ← manifests Kubernetes
│   ├── deployment-portal.yaml
│   ├── deployment-caddy.yaml
│   ├── deployment-cloudflared.yaml
│   └── configmap-caddy.yaml
├── data/
│   ├── db/                 ← SQLite + schema (PVC montado em /app/prisma)
│   └── caddy/              ← certs TLS Caddy
├── COFRE_NCFN/             ← evidências custodiadas (PVC)
└── arquivos/               ← uploads gerais, notas doc.json

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
              CRIPTOGRAFIA AES-256 (original preservado em .originals/)
                     ↓
            RELATÓRIO INTERMEDIÁRIO (≥ 2h após T0)
                     ↓
            RELATÓRIO FINAL (≥ 48h após intermediário)
                     ↓
            LAUDO MANUAL (opcional, após final concluído)
                     ↓
            CLOUD CUSTODY R2 (opcional, a qualquer momento)
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

- **Relatório Intermediário**: disponível ≥ 2h após T0
- **Relatório Final**: disponível ≥ 48h após intermediário
- **Laudo Manual**: disponível após Final concluído (sem limite de tempo)

## Visibilidade em /admin/laudo-forense

- **Primeiras 48h após Final**: todos os relatórios visíveis
- **Após 48h**: apenas Final + Manual visíveis
- **Botão de impressão**: Manual > Final > Intermediário (Inicial = nunca imprime)

## Zonas do Vault (12 zonas + BURN)

| Zona | Nome | Uso |
|------|------|-----|
| \`0\` | Ultrasecretos | Dados de alto sigilo |
| \`1\` | Provas Sensíveis | Evidências sensíveis |
| \`2\` | Elementos de Prova | Provas gerais |
| \`3\` | Documentos Gerente | Docs internos |
| \`4\` | Processos / Contratos | Documentação jurídica |
| \`5\` | Governos / Empresas | Dados institucionais |
| \`6\` | Fornecidos s/ Registro | Material sem cadeia de coleta |
| \`7\` | Capturas Web / OSINT | Auto-populada pela captura web |
| \`8\` | Vídeos | Material audiovisual |
| \`9\` | Perfis Criminais | Dossiês de investigados |
| \`10\` | Áudio | Gravações e interceptações |
| \`12\` | Metadados Limpos | Arquivos sem EXIF |
| \`100\` | BURN / Imutabilidade | Eliminação permanente certificada |
`, fCofre.id, '#bc13fe'),

    n('Relatórios: Tipos e Fluxo', `# Tipos de Relatório Forense

## Hierarquia

### 📄 Relatório Inicial (automático)
- Gerado **automaticamente** ao criar T0 (upload + criptografia)
- Conteúdo: metadados do arquivo, hashes SHA-256/SHA-1/MD5, cabeçalho hex, EXIF
- **Sem impressão** — somente visualização digital

### 📋 Relatório Intermediário (manual)
- Disponível ≥ 2h após T0
- Conteúdo: **tudo do Inicial** + achados do perito (conformidades/inconformidades)
- **Com impressão** enquanto Final não existir

### 📊 Relatório Final (manual)
- Disponível ≥ 48h após Intermediário
- Conteúdo: **tudo do Intermediário** + conclusões finais + gráfico de timeline da custódia
- **Único com impressão** após gerado

### 🔬 Laudo Manual (nova leitura)
- Pode ser gerado **uma única vez** após o Final estar concluído
- Relê o arquivo com todos os dados anteriores
- Passa a ser o **principal** para impressão (substitui Final)

## Estrutura cumulativa

\`\`\`
INICIAL       = metadados + hashes + hex + EXIF
INTERMEDIÁRIO = INICIAL + achados do perito
FINAL         = INTERMEDIÁRIO + conclusões + gráfico timeline
MANUAL        = FINAL + nova leitura do arquivo
\`\`\`

## Links nos PDFs

Todos os hashes nos PDFs são **links clicáveis**:
- SHA-256/SHA-1/MD5 → \`/auditor?q=<hash>\`
- Cabeçalho hex → \`/auditor?hex=<valor>\`
`, fCofre.id),

    n('Criptografia e Integridade', `# Criptografia e Verificação de Integridade

## AES-256-CBC

Cada ativo forense é encriptado com:
- **Algoritmo**: AES-256-CBC (FIPS 197)
- **Chave**: derivada da senha do operador + salt único
- **IV**: gerado aleatoriamente por operação
- **Original**: preservado em \`_zona/.originals/arquivo\` antes da criptografia

\`\`\`
Arquivo original → cópia para .originals/ → AES-256-CBC → arquivo.enc (substitui)
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

## Cloud Custody R2

Ativo encriptado + metadados enviados ao **Cloudflare R2**:
- Gera URL imutável de acesso
- Registra o estado no modelo \`CloudCustody\` do banco
- Verificável independentemente do servidor NCFN

## Detecção de Malware no Upload

Upload bloqueia automaticamente arquivos com assinatura:
- \`MZ\` / \`PE\` — executáveis Windows
- \`ELF\` — executáveis Linux
- \`Mach-O\` — executáveis macOS
- \`#!\` (shebang) — scripts shell
`, fCofre.id),

    // ── Autenticação ─────────────────────────────────────────────────────────
    n('Cloudflare Access e NextAuth', `# Sistema de Autenticação

## Fluxo de autenticação (v15)

\`\`\`
1. Usuário acessa ncfn.net
2. Cloudflare Access intercepta → GitHub OAuth
3. CF Access define cookie CF_Authorization (JWT)
4. Portal lê JWT em /api/cf-check
5. NextAuth cria sessão com role=admin
6. Redirect para /admin
\`\`\`

## Cloudflare Access

- **Identity Provider**: GitHub OAuth
- **Proteção**: site inteiro (ncfn.net)
- **JWT**: verificado em \`app/lib/cfAccess.ts\`
- **Team domain**: \`ncfn.cloudflareaccess.com\`
- **Nota**: verificação de assinatura usa fallback decode-only (pod sem egress internet)

## NextAuth v4 (JWT de sessão)

Configurado em \`app/lib/authOptions.ts\`:
- **Provider**: \`cloudflare-access\` (auto-login via JWT) + \`credentials\` (fallback admin)
- **Session**: JWT com campos \`role\`, \`totpEnabled\`, \`loginIp\`
- **Callbacks**: \`jwt\` e \`session\` enriquecem o token com dados do banco

## TOTP (segundo fator)

- Compatível com Google Authenticator / Authy
- Secret armazenado encriptado no banco
- Fluxo: CF Access → sessão criada → TOTP verificado em \`/verify-totp\`

## WebAuthn (biometria)

- **RP ID**: \`ncfn.net\`
- Suporta fingerprint, FaceID, chaves de segurança físicas
- Dispositivos gerenciados em \`/profile\` → WebAuthn Devices
- Tabela: \`WebAuthnCredential\` no banco

## IP Binding /24

O middleware verifica se o IP da requisição está na mesma sub-rede /24 do IP de login. Divergência encerra a sessão.
`, fAuth.id),

    n('Roles, Permissões e Rate Limiting', `# Roles, Permissões e Rate Limiting

## Roles disponíveis

| Role | Acesso | Descrição |
|------|--------|-----------|
| \`admin\` | Total | Todos os módulos e APIs |
| \`user\` | Limitado | Vault público e vitrine |
| \`guest\` | Mínimo | Somente visualização pública |

## Proteção de rotas

### Middleware (\`app/middleware.ts\`)
Intercepta todas as rotas antes do handler:
- Verifica JWT NextAuth válido
- Verifica role ≥ mínimo exigido pela rota
- Verifica IP binding /24

### API Routes — padrão obrigatório
\`\`\`typescript
const session = await getSession();
if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
const dbUser = await getDbUser(session.user.email);
if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
\`\`\`

## Rate Limiting

**Arquivo**: \`app/lib/rateLimit.ts\` — sliding window in-memory

\`\`\`typescript
import { checkRateLimit } from '@/lib/rateLimit';
const allowed = checkRateLimit(ip, 'endpoint-name', { windowMs: 60_000, maxRequests: 10 });
if (!allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
\`\`\`

## Armadilhas Canary

**Arquivo**: \`app/lib/canaryAlert.ts\`

1. Arquivo-armadilha colocado em pasta monitorada do Vault
2. Qualquer acesso dispara email de alerta para o admin
3. Log registrado com IP, timestamp e nome do arquivo
4. Gerenciado em \`/admin/canary\`

\`\`\`env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ncfn@ncfn.net
SMTP_PASS=<app-password>
\`\`\`
`, fAuth.id),

    // ── Módulos ──────────────────────────────────────────────────────────────
    n('Auditor e Verificação de Hash', `# Módulo Auditor (/auditor)

## Funções principais

### 1. Verificação de hash
- Entrada: SHA-256, SHA-1 ou MD5
- Compara contra todos os arquivos custodiados no Vault
- **Encontrado**: exibe pasta, data de ingresso, operador e estado da custódia
- **Não encontrado**: botão "CARREGAR EVIDÊNCIA DIGITAL"

### 2. Inspeção de magic bytes (cabeçalho hex)
- Identifica o tipo real do arquivo pelos primeiros bytes
- Exemplos: \`FFD8FF\` = JPEG, \`89504E47\` = PNG, \`25504446\` = PDF, \`4D5A\` = EXE

### 3. Links automáticos nos PDFs forenses
\`\`\`
/auditor?q=<sha256>   ← busca por hash (pré-preenche e dispara)
/auditor?hex=<header> ← busca por cabeçalho hex
\`\`\`

## Acesso público

O Auditor é acessível publicamente sem login — qualquer pessoa com o hash pode verificar a autenticidade de um arquivo custodiado pelo NCFN.
`, fModulos.id),

    n('Captura Forense Web', `# Captura Forense Web (/admin/captura-web)

## O que é

Preserva páginas da web com valor probatório de forma forense, com todos os artefatos em um único pacote custodiado.

## Artefatos capturados

| Artefato | Descrição |
|----------|-----------|
| **Screenshot** | Imagem full-page em alta resolução |
| **PDF** | Página renderizada como PDF imprimível |
| **HTML/DOM** | Código-fonte completo da página |
| **HAR** | Tráfego de rede (headers, requests, responses) |
| **Certificado SSL** | Dados TLS/HTTPS do servidor |
| **WHOIS** | Registro do domínio |
| **Carimbo RFC 3161** | Timestamp certificado vinculado ao bundle |

## Fluxo

1. Inserir URL alvo em \`/admin/captura-web\`
2. Sistema renderiza com Playwright (headless)
3. Todos os artefatos são agrupados e custodiados na zona **7 · Capturas Web/OSINT**
4. Hash SHA-256 do bundle é calculado e carimbado com RFC 3161

## Módulo de Preview

Endpoint \`/api/capture/preview\` oferece pré-visualização antes da captura definitiva.
`, fModulos.id),

    n('Cloud Custody R2', `# Cloud Custody — Cloudflare R2

## O que é

Extensão da cadeia de custódia para a nuvem. Permite enviar um ativo forense encriptado para o **Cloudflare R2** (object storage imutável), gerando uma URL de custódia verificável independentemente do servidor NCFN.

## Fluxo

\`\`\`
Arquivo .enc no Vault
  ↓ Operador clica "CLOUD CUSTODY"
  ↓ /api/vault/r2-presign  → URL de upload assinada
  ↓ Upload do arquivo para R2
  ↓ /api/vault/r2-confirm  → registra no banco (modelo CloudCustody)
  ↓ /api/vault/cloud-custody → retorna estado atual
\`\`\`

## Modelo CloudCustody (banco)

| Campo | Descrição |
|-------|-----------|
| \`fileKey\` | Chave do objeto no R2 |
| \`r2Url\` | URL pública de acesso |
| \`uploadedAt\` | Timestamp do upload |
| \`sha256\` | Hash do arquivo enviado |
| \`uploadedBy\` | Email do operador |

## Configuração (env)

\`\`\`env
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret>
R2_BUCKET_NAME=ncfn-custody
R2_PUBLIC_URL=https://r2.ncfn.net
\`\`\`

## Estado de custódia

O endpoint \`/api/vault/custody-state\` retorna o estado completo de um arquivo, incluindo se está na nuvem e qual a URL de custódia.
`, fModulos.id),

    n('Timeline, Notificações e Convidados', `# Módulos de Gestão e Colaboração

## Timeline de Custódia (/admin/timeline)

Visualização cronológica de **todos os eventos** de custódia do Vault:
- Cada ação (upload, encriptação, perícia, cloud custody) aparece na linha do tempo
- Filtros por operador, zona e tipo de evento
- Exportável como relatório

**Endpoint**: \`/api/admin/custody-timeline\`

---

## Notificações em Tempo Real

Sistema de notificações via **SSE (Server-Sent Events)**:
- Alerta de novos eventos críticos no Vault
- Notificação de perícias concluídas
- Alerta de acessos suspeitos (canary)
- Sino na nav (\`NotificationBell\`) com badge de não-lidos

**Endpoints**:
- \`/api/admin/sse\` — stream SSE de eventos
- \`/api/admin/notifications\` — listar notificações

---

## Convidados (/admin/convidados)

Gerencia acesso temporário ao portal NCFN:

| Tipo | Acesso | Duração |
|------|--------|---------|
| **Referral Premium** | Cria conta própria, sem Vault | 72h |
| **Acesso ao Cofre** | Read-only em pastas autorizadas | 72h |

**Fluxo**:
1. Admin gera token de convite em \`/admin/convidados\`
2. Token compartilhado via canal seguro
3. Convidado acessa \`/convidados/verify?token=<token>\`
4. Cadastra-se em \`/convidados/register\`
5. Todas as ações do convidado são logadas

**Endpoints**: \`/api/admin/convidados\`, \`/api/convidados/register\`, \`/api/convidados/verify\`
`, fModulos.id),

    n('Vitrine e Compartilhamento', `# Vitrine Pública (/vitrine)

## O que é

Repositório público de evidências forenses **explicitamente autorizadas** pelo protocolo NCFN para compartilhamento com terceiros.

> Nenhum arquivo chega à Vitrine automaticamente — o admin deve marcar explicitamente no Vault.

## Fluxo de publicação

1. No Vault, selecionar arquivo custodiado
2. Clicar em **"DISPONIBILIZAR ATIVO"**
3. Sistema cria \`VitrinePublish\` no banco com código de acesso de **6 dígitos**
4. Código é entregue ao destinatário pelo operador NCFN

## Download pelo destinatário

1. Acessar \`/vitrine\`
2. Inserir código de 6 dígitos
3. Download de pacote ZIP certificado contendo:
   - Arquivo original
   - Certificado de autenticidade (PDF com hash SHA-256)
   - Guia de verificação de integridade

## Módulo admin

Em \`/vitrine\` com login admin é possível:
- Ver todos os arquivos publicados
- Revogar publicações
- Ver estatísticas de download

**Endpoint**: \`/api/vitrine/public\`, \`/api/vitrine\`
`, fModulos.id),

    // ── Infraestrutura ───────────────────────────────────────────────────────
    n('k3s — Kubernetes na VPS', `# Infraestrutura k3s

## O que é k3s

Distribuição leve do Kubernetes para single-node. Substitui o Docker Compose em produção desde v15.

## Cluster NCFN

**VPS**: \`root@163.245.218.241\`
**Namespace**: \`ncfn\`

### Pods em execução

| Pod | Imagem | Função |
|-----|--------|--------|
| \`portal-*\` | \`ncfn/portal:latest\` | App Next.js (porta 3000) |
| \`caddy-*\` | \`caddy:2-alpine\` | Reverse proxy (host 80/443) |
| \`cloudflared-*\` | \`cloudflare/cloudflared\` | Tunnel CF → localhost:80 |

### Volumes (PVCs hostPath)

| PVC | Caminho no host | Conteúdo |
|-----|----------------|----------|
| \`ncfn-db-pvc\` | \`data/db/\` | SQLite + schema Prisma |
| \`ncfn-cofre-pvc\` | \`COFRE_NCFN/\` | Evidências custodiadas |
| \`ncfn-arquivos-pvc\` | \`arquivos/\` | Uploads e doc.json |
| \`ncfn-caddy-data-pvc\` | \`data/caddy/\` | Certificados TLS |

## Comandos essenciais

\`\`\`bash
# Ver status dos pods
kubectl get pods -n ncfn

# Ver logs do portal
kubectl logs -n ncfn deploy/portal -f --tail=50

# Rollout restart (após novo deploy)
kubectl rollout restart deployment/portal -n ncfn
kubectl rollout status deployment/portal -n ncfn

# Sincronizar schema Prisma
kubectl exec -n ncfn deploy/portal -- npx prisma db push --skip-generate

# Acessar pod do portal
kubectl exec -it -n ncfn deploy/portal -- sh
\`\`\`

## Ciclo de deploy

\`\`\`bash
# No PC local:
git push origin main

# Na VPS:
git pull origin main
docker build -t ncfn/portal:latest ./app
docker save ncfn/portal:latest | k3s ctr images import -
k3s ctr images rm ncfn/portal:latest
k3s ctr images tag docker.io/ncfn/portal:latest ncfn/portal:latest
kubectl rollout restart deployment/portal -n ncfn
\`\`\`
`, fInfra.id),

    n('Cloudflare Access e Tunnel', `# Cloudflare Access e Tunnel

## Arquitetura de rede

\`\`\`
Usuário (browser)
   ↓ HTTPS / TLS 1.3
Cloudflare Edge
   ↓ GitHub OAuth (CF Access)
   ↓ JWT CF_Authorization
   ↓ WireGuard / QUIC
cloudflared (pod k3s, ncfn namespace)
   ↓ HTTP → localhost:80
Caddy (pod k3s, hostNetwork)
   ↓ HTTP → portal-svc.ncfn:3000
Next.js Portal (pod k3s)
\`\`\`

## Cloudflare Access

- **Proteção**: site inteiro \`ncfn.net\`
- **Identity Provider**: GitHub OAuth
- **JWT**: cookie \`CF_Authorization\` + header \`Cf-Access-Jwt-Assertion\`
- **Team domain**: \`ncfn.cloudflareaccess.com\`
- **Zero Trust dashboard**: \`one.dash.cloudflare.com\`

## Cloudflare Tunnel

- **Tunnel NCFN**: ID \`c8a8d957\` → site principal \`ncfn.net\`
- **Tunnel SEGUNDO CEREBRO**: ID \`281ba086\` → \`ncfn.ncfn.net\` (PC local)
- **Token**: armazenado no secret k8s \`ncfn-cf-token\`

## Caddy (k3s)

Configurado via ConfigMap \`caddy-config\` no namespace ncfn:
- Headers de segurança (HSTS, CSP, X-Frame-Options)
- Bloqueio de paths sensíveis (.env, .git, .db)
- Bloqueio de user-agents de scanners (sqlmap, nikto, nmap)
- Reverse proxy para \`portal-svc.ncfn.svc.cluster.local:3000\`
`, fInfra.id),

    n('Banco de Dados SQLite e Prisma', `# SQLite e Prisma ORM

## Configuração

\`\`\`env
DATABASE_URL=file:./dev.db
\`\`\`

O arquivo \`dev.db\` está em \`/app/prisma/dev.db\` dentro do pod, montado via PVC do host em \`/root/docker/portal_ncfn/data/db/dev.db\`.

## Singleton Prisma

**Nunca instanciar PrismaClient diretamente.** Usar sempre:
\`\`\`typescript
import { prisma } from '@/lib/prisma';
\`\`\`

## Modelos principais (schema.prisma)

| Modelo | Descrição |
|--------|-----------|
| \`User\` | Usuários com role, TOTP, WebAuthn |
| \`FileCustodyState\` | Ciclo de vida de cada ativo do Vault |
| \`LaudoForense\` | Laudos tipados (inicial/intermediário/final/manual) |
| \`CloudCustody\` | Registros de custódia na nuvem R2 |
| \`WebAuthnCredential\` | Dispositivos biométricos registrados |
| \`Convidado\` | Tokens de acesso temporário |
| \`AuditLog\` | Log imutável de auditoria |
| \`VitrinePublish\` | Evidências publicadas na vitrine |
| \`ChatSession\` + \`ChatMessage\` | Histórico de chat IA |

## Schema no PVC

O schema \`schema.prisma\` é copiado para \`data/db/\` para ficar disponível no PVC montado em \`/app/prisma\`. Após mudanças no schema:

\`\`\`bash
# Na VPS — copiar schema para o PVC:
cp /root/docker/portal_ncfn/app/prisma/schema.prisma /root/docker/portal_ncfn/data/db/

# Sincronizar com o banco:
kubectl exec -n ncfn deploy/portal -- npx prisma db push --skip-generate
\`\`\`
`, fInfra.id),

    // ── SOPs ─────────────────────────────────────────────────────────────────
    n('SOP: Ingresso de Evidências', `# SOP — Procedimento de Ingresso de Evidências

## Objetivo

Garantir que evidências digitais sejam ingressadas no Vault com cadeia de custódia completa e matematicamente verificável.

## Pré-requisitos

- [ ] Autenticado no portal via Cloudflare Access (GitHub OAuth)
- [ ] Sessão com role \`admin\` ativa
- [ ] Arquivo original disponível (cópia forense bit-a-bit, se possível)

## Procedimento

### 1. Escolher a zona correta no Vault

| Zona | Uso recomendado |
|------|----------------|
| \`0 · Ultrasecretos\` | Dados de alto sigilo, acesso restrito |
| \`1 · Provas Sensíveis\` | Evidências sensíveis ao caso |
| \`2 · Elementos de Prova\` | Provas gerais do caso |
| \`7 · Capturas Web/OSINT\` | Capturas web e coletas OSINT |

### 2. Upload do Arquivo
- Arrastar arquivo para a zona ou clicar em "Selecionar Arquivo"
- Sistema verifica magic bytes — rejeita executáveis automaticamente
- Preencher formulário de custódia: nome do caso, operador, descrição

### 3. Criptografia (obrigatória)
- Clicar em "CRIPTOGRAFAR" após upload
- O original é preservado em \`.originals/\` automaticamente
- Definir senha AES-256 forte — **não há recuperação da senha**
- Sistema gera **Relatório Inicial** automaticamente

### 4. Verificação pós-ingresso
- [ ] T0 registrado no FileCustodyState
- [ ] SHA-256, SHA-1 e MD5 calculados e exibidos
- [ ] Relatório Inicial disponível em \`/admin/laudo-forense\`

### 5. (Opcional) Cloud Custody
- Clicar em "CLOUD CUSTODY" para enviar cópia ao R2
- Gera URL imutável de custódia verificável externamente
`, fSOPs.id, '#22c55e'),

    n('SOP: Geração de Laudos', `# SOP — Geração de Laudos Forenses

## Ciclo completo

\`\`\`
T0 (upload) → Inicial (auto) → Intermediário (≥2h) → Final (≥48h após inter.) → Manual (opcional)
\`\`\`

## Relatório Inicial
- **Automático** — não requer ação do perito
- Gerado no momento do upload + criptografia
- Conteúdo: hashes, metadados, EXIF, cabeçalho hex

## Relatório Intermediário

**Quando gerar**: mínimo 2h após T0, após análise inicial do arquivo

**O que documentar**:
- [ ] Conformidades encontradas no arquivo
- [ ] Inconformidades e anomalias detectadas
- [ ] Metadados suspeitos ou relevantes
- [ ] Correlações com outros casos ou evidências

**Procedimento**:
1. Vault → selecionar arquivo custodiado
2. Clicar "RELATÓRIO INTERMEDIÁRIO"
3. PDF disponibilizado em \`/admin/laudo-forense\`

## Relatório Final

**Quando gerar**: mínimo 48h após Intermediário, análise concluída

**O que documentar**:
- [ ] Conclusões definitivas da perícia
- [ ] Parecer técnico-jurídico
- [ ] Recomendações de providências
- [ ] Referências às normas: ISO/IEC 27037, RFC 3161

## Laudo Manual (Nova Leitura)

- Somente após Final concluído
- **Apenas um** por arquivo — escolha cuidadosamente o momento
- Usado para re-análise com novos dados, ou para atender requisição judicial
- Passa a ser o documento **principal** para impressão

## Impressão e exportação

\`/admin/laudo-forense\` → selecionar arquivo → botão Imprimir
Ordem de prioridade: Manual > Final > Intermediário (Inicial nunca imprime)
`, fSOPs.id),

    n('SOP: Captura Web Forense', `# SOP — Captura Forense de Páginas Web

## Objetivo

Preservar conteúdo de páginas web com valor probatório, com todos os artefatos custodiados e carimbados temporalmente.

## Pré-requisitos

- [ ] URL alvo identificada e documentada
- [ ] Justificativa legal registrada
- [ ] Acesso ao módulo \`/admin/captura-web\`

## Procedimento

### 1. Captura

1. Acessar \`/admin/captura-web\`
2. Inserir URL alvo no campo de entrada
3. (Opcional) Usar **Preview** para validar antes de capturar
4. Clicar em "CAPTURAR"

O sistema captura automaticamente:
- Screenshot full-page
- PDF renderizado
- HTML/DOM completo
- Tráfego HAR
- Certificado SSL
- WHOIS do domínio
- Carimbo RFC 3161

### 2. Custódia automática

Todos os artefatos são custodiados na zona **7 · Capturas Web/OSINT**.

### 3. Documentar contexto

Após captura, registrar no Relatório Intermediário:
- URL capturada e data/hora UTC
- IP do servidor alvo
- Propósito da coleta
- Relevância para o caso

## Boas práticas

> ⚠️ **Nunca** editar ou alterar arquivos após o hash inicial ser calculado.
> Qualquer modificação invalida a cadeia de custódia.

- Capturar na data mais próxima possível do evento investigado
- Registrar todas as etapas com timestamp
- Documentar o método exato e a versão da ferramenta
`, fSOPs.id),

    n('SOP: Acesso de Convidados', `# SOP — Gestão de Acesso de Convidados

## Quando usar

Para dar acesso temporário (72h) ao portal a terceiros:
- Peritos externos colaborando no caso
- Clientes que precisam visualizar evidências
- Auditores externos revisando a cadeia de custódia

## Tipos de convite

| Tipo | O que o convidado pode fazer |
|------|------------------------------|
| **Referral Premium** | Criar conta própria, sem acesso ao Vault |
| **Acesso ao Cofre** | Visualizar (read-only) pastas autorizadas |

## Procedimento — Geração de Convite

1. Acessar \`/admin/convidados\`
2. Clicar em "Novo Convite"
3. Selecionar tipo (Referral ou Cofre)
4. Para Cofre: selecionar quais zonas o convidado pode ver
5. Copiar o link gerado
6. Compartilhar via canal seguro (sinal, email criptografado, presencialmente)

## Procedimento — Uso pelo Convidado

1. Acessar o link recebido
2. Verificar token em \`/convidados/verify\`
3. Cadastrar-se em \`/convidados/register\`
4. Acesso concedido conforme permissões definidas

## Revogação

- Acessar \`/admin/convidados\`
- Clicar no ícone de exclusão ao lado do convidado
- Acesso encerrado imediatamente

## Monitoramento

Todas as ações do convidado são registradas em \`AuditLog\` com:
- Email do convidado
- Ação realizada
- IP e timestamp UTC
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
