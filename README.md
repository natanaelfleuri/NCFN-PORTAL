# Portal NCFN — Nexus Cyber Forensic Network

Sistema de gestão, custódia e verificação de evidências digitais com capacidades forenses avançadas.

---

## Funcionalidades

### Custódia e Integridade
- Upload seguro com SHA-256 automático e carimbo temporal RFC 3161 (FreeTSA)
- Verificação de integridade de arquivos (auditor público, sem necessidade de login)
- Lixeira com recuperação e registros de exclusão
- Links de compartilhamento com expiração configurável
- Relatório PDF de inventário de pasta (hash + metadados)

### Captura Web Forense (Fase 1)
- Screenshot full-page, PDF renderizado e DOM snapshot via Playwright
- Coleta automática: SSL/TLS, WHOIS, headers HTTP, geolocalização IP
- HAR de tráfego de rede
- Certidão de Captura Forense em PDF com QR Code de verificação
- RFC 3161 para cada conjunto de artefatos

### Perícia Automática de Arquivos (Fase 2)
- Extração de metadados com ExifTool (GPS, autoria, datas ocultas, dispositivo)
- Hashes SHA-256, SHA-1 e MD5 simultâneos
- Detecção de tipo real do arquivo
- Achados forenses automáticos destacados

### Carimbo Temporal (Fase 3)
- Integração RFC 3161 com FreeTSA.org
- Geração de TSR (Token de Carimbo Temporal)
- Verificação pública de timestamp por hash

### Convidados e Controle de Acesso (Fase 4)
- Gestão de e-mails convidados com ativação/desativação
- Log de acessos por convidado (IP, data, user-agent)
- Aceitação de política de privacidade obrigatória antes de acesso
- TOTP/Autenticação em dois fatores para admin
- Integração com Kasm Workspaces (desktop forense remoto)

### OSINT e Inteligência (Fase 5)
- Varredura automática com Sherlock, theHarvester e Nmap (via container isolado)
- Análise de relatório com IA local (Ollama/Mistral)
- Keywords configuráveis com agendamento por cron
- Resultados armazenados com hash SHA-256 para integridade

### IA e Laudo Forense (Fase 6)
- Geração de laudo técnico-jurídico via Ollama (metodologia, achados, conclusão)
- Exportação do laudo em PDF forense (pdf-lib)
- Configuração de modelos de IA por admin
- RAG/ChromaDB para busca semântica em textos jurídicos (perfil `rag`)
- Rate limiting na geração de IA (5 laudos/hora por admin)

### Segurança
- Autenticação Google OAuth via NextAuth.js com JWT
- Binding de sessão por subnet /24
- Dead Man's Switch com LOCKDOWN ou DELETE_ALL configurável
- Arquivos canary com alerta por e-mail (Nodemailer)
- Rate limiting por sliding window em memória
- Cron protegido exclusivamente por Bearer token (sem query param)
- Auditor de hashes totalmente público e sem senha

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM |
| Banco de Dados | SQLite (dev) → PostgreSQL (prod planejado) |
| Auth | NextAuth.js v4 (Google OAuth, JWT) |
| PDF | pdf-lib |
| Mapas | Leaflet + react-leaflet |
| Gráficos | Recharts |
| Captcha | Cloudflare Turnstile |
| IA | Ollama (Mistral/LLaVA), ChromaDB (RAG) |
| ASR | Whisper (perfil opcional) |
| Captura | Playwright (Chromium headless) |
| Forense | ExifTool, OpenSSL, WHOIS, Nmap |
| Infraestrutura | Docker, Docker Compose, Caddy |
| Ambiente Forense | Kasm Workspaces (perfil opcional, requer 16 GB RAM) |

---

## Instalação

### Pré-requisitos
- Docker e Docker Compose v2+
- Git

### Instalação Rápida

```bash
git clone https://github.com/natanaelfleuri/NCFN-PORTAL.git
cd NCFN-PORTAL

# Configurar variáveis de ambiente
cp .env.example app/.env
nano app/.env   # preencher todos os valores obrigatórios

# Subir (desenvolvimento)
docker compose up --build -d

# Subir (produção)
docker compose -f docker-compose.prod.yml up --build -d
```

O portal estará em `http://localhost:3000` (dev) ou via Caddy em produção.

### Perfis Docker Opcionais

```bash
# + Whisper ASR (transcrição de áudio forense)
docker compose --profile whisper up -d

# + ChromaDB RAG (busca semântica em textos jurídicos)
docker compose --profile rag up -d

# + Kasm Workspaces (desktop forense remoto — requer ~16 GB RAM)
docker compose --profile kasm up -d
```

---

## Variáveis de Ambiente

Copie `.env.example` para `app/.env` e preencha. As principais:

| Variável | Descrição |
|----------|-----------|
| `NEXTAUTH_SECRET` | JWT secret — gerar: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth no Google Cloud Console |
| `ADMIN_EMAIL` | E-mail do administrador principal |
| `CRON_SECRET` | Secret para jobs agendados — gerar: `openssl rand -hex 24` |
| `MASTER_UNLOCK_KEY` | Chave para desbloquear Dead Man's Switch manualmente |
| `OLLAMA_URL` | URL do serviço Ollama (ex: `http://host.docker.internal:11434`) |
| `SMTP_HOST/PORT/USER/PASS` | SMTP para alertas canary por e-mail |
| `DEV_BYPASS` | `true` apenas em desenvolvimento — **NUNCA em produção** |

Veja `.env.example` para a lista completa.

---

## Deploy na VPS

```bash
# 1. Hardening inicial (apenas na primeira vez, como root)
sudo bash scripts/setup-vps.sh

# 2. Rolling deploy sem downtime
bash scripts/ncfn-deploy.sh

# 3. Ajuste de permissões do vault
bash scripts/fix-permissions.sh
```

---

## Estrutura do Projeto

```
portal_ncfn/
├── app/                          # Aplicação Next.js
│   ├── app/
│   │   ├── admin/                # Páginas administrativas
│   │   │   ├── captura-web/      # Captura forense da web
│   │   │   ├── canary/           # Arquivos canary rastreáveis
│   │   │   ├── forensics/        # Investigações forenses
│   │   │   ├── laudo-forense/    # Laudos técnico-jurídicos com IA
│   │   │   ├── pericia-arquivo/  # Perícia automatizada de arquivos
│   │   │   └── ...
│   │   ├── api/                  # API Routes
│   │   │   ├── admin/            # Endpoints administrativos
│   │   │   ├── cron/             # Jobs agendados (OSINT, Dead Man's Switch)
│   │   │   ├── capture/          # Captura web forense
│   │   │   ├── timestamp/        # RFC 3161
│   │   │   └── ...
│   │   ├── auditor/              # Auditor público de hashes (sem login)
│   │   ├── vault/                # Vault de arquivos criptografados
│   │   └── verify/               # Verificação pública de hash/timestamp
│   ├── lib/
│   │   ├── auth.ts               # DEV_BYPASS + getSession/getDbUser
│   │   ├── authOptions.ts        # Configuração NextAuth
│   │   ├── prisma.ts             # Singleton PrismaClient
│   │   ├── rateLimit.ts          # Rate limiting sliding window
│   │   ├── timestamp.ts          # RFC 3161 TSA
│   │   └── canaryAlert.ts        # Alertas canary por e-mail
│   └── prisma/
│       └── schema.prisma         # 19 modelos de dados
├── scripts/                      # Scripts de deploy e setup VPS
├── docker-compose.yml            # Ambiente de desenvolvimento
├── docker-compose.prod.yml       # Produção (VPS)
├── Caddyfile                     # Configuração Caddy / TLS automático
└── .env.example                  # Template de variáveis de ambiente
```

---

## Modelos de Dados (Prisma — 19 modelos)

| Modelo | Finalidade |
|--------|-----------|
| User | Conta do administrador + Dead Man's Switch |
| GuestEmail | Whitelist de convidados |
| GuestAccessLog | Log de acessos de convidados (IP, UA, data) |
| FileStatus | Metadados e cadeia de custódia de arquivos |
| TrashItem | Lixeira com auditoria de exclusão |
| SharedLink | Links temporários com expiração |
| TimestampRecord | Carimbos RFC 3161 armazenados |
| WebCapture | Capturas forenses da web (screenshot, PDF, DOM, HAR) |
| ForensicInvestigation | Registros de investigação forense |
| OsintKeyword | Keywords OSINT monitoradas |
| OsintScheduledScan | Resultados de varreduras agendadas |
| InvestigationTarget | Alvos de investigação (URLs, IPs) |
| LaudoForense | Laudos técnico-jurídicos gerados por IA |
| CanaryFile | Arquivos canary com rastreamento de acesso |
| BurnToken | Tokens de destruição segura de arquivos |
| UserAiConfig | Chaves e modelos de IA por usuário |

---

## Segurança

- Nenhuma credencial ou dado sensível é versionado
- `.env` e `COFRE_NCFN/` estão no `.gitignore`
- Vault processado em memória RAM (sem persistência de conteúdo na auditoria pública)
- Sessões vinculadas a subnet /24 (binding de IP)
- Rate limiting em todas as operações custosas
- Cron autenticado por Bearer token exclusivamente

---

## Licença

Uso interno — NCFN Team. Não redistribuir sem autorização.
