# CHECKLIST PORTAL NCFN — Estruturação v3.0
> Última atualização: 2026-03-11
> Retomar aqui se os créditos acabarem. Verificar o que está ✅ e continuar pelo próximo ⬜.

---

## DIAGNÓSTICO DA VPS (2026-03-11)
- CPU: AMD EPYC 7763 (1 vCore alocado)
- RAM: 3.8GB total | ~2.1GB disponível
- Disco: 77GB | 57GB livres
- Containers ativos: portal_ncfn (3000), caddy_ncfn (80/443), obsidian_server, cloudflared
- **Limitação:** Sem capacidade para Ollama + Kasm simultaneamente (usar apenas Ollama versão rápida commenos contexto e verificar possibildiade de deletar kasm sem afetar o projeto). Upgrade para 8GB recomendado.
- **Ollama:** Manter no host local por enquanto (host.docker.internal:11434)

---

## FASE 0 — CORREÇÕES CRÍTICAS DE BUGS
> Status geral: Em andamento

- [x] **[0.1]** Diagnosticar todos os bugs existentes (relatório completo gerado)
- [x] **[0.2]** VPS verificada e documentada
- [x] **[0.3]** Criar `app/lib/prisma.ts` — singleton PrismaClient (evitar múltiplas conexões)
- [x] **[0.4]** Atualizar TODAS as rotas para importar de `@/lib/prisma` em vez de `new PrismaClient()`
  - Rotas a atualizar: upload, encrypt, decrypt, forensics, vault/view, vault/burn, vault/index,
    quota, admin/ia-config, admin/guests, admin/investigar, admin/logs, admin/custodian,
    admin/security, cron/dead-mans-switch, cron/osint-scan, share-link, dead-man-switch,
    generate-report, verify-hash, hash, trash, files, download, policy-accept, auth, edit-markdown
- [x] **[0.5]** Adicionar autenticação (getServerSession) em `/api/encrypt/route.ts`
- [x] **[0.6]** Adicionar autenticação (getServerSession) em `/api/decrypt/route.ts`
- [x] **[0.7]** Adicionar autenticação (role: admin) em `/api/forensics/route.ts`
- [x] **[0.8]** Unificar path do lockfile Dead Man Switch → `../arquivos/_SYSTEM_LOCKOUT` em ambos
- [x] **[0.9]** Remover bypass hardcoded `ncfn_internal_cron_bypass` de `cron/dead-mans-switch`
- [x] **[0.10]** `NEXTAUTH_URL` agora dinâmico via `${NEXTAUTH_URL:-http://localhost:3002}`
- [x] **[0.11]** `docker-compose.yml` porta 3000→3002 + volume COFRE_NCFN + env_file
- [x] **[0.12]** Criar `.claudeignore` e `.env.example`
- [x] **[0.13]** Testar build e acesso em `localhost:3002` ✅ CONCLUÍDO
- [x] **[0.14]** Criar `app/lib/auth.ts` — wrapper `getSession()` + `getDbUser()` com DEV_BYPASS
- [x] **[0.15]** Aplicar `getDbUser()` em TODAS as rotas (vault/index, vault/view, vault/burn, encrypt, decrypt, forensics, capture, upload, quota, admin/security, trash)
- [x] **[0.16]** DEV_BYPASS funcional — site 100% acessível em localhost:3002 sem login

---

## FASE 1 — CAPTURA WEB FORENSE
> Prioridade máxima — feature mais impactante

- [x] **[1.1]** Instalar dependências: `playwright`, `qrcode`, `axios` adicionados ao `package.json`
- [x] **[1.2]** Criar `app/app/api/capture/route.ts` — motor de captura com Playwright
  - Screenshot PNG (full page)
  - PDF renderizado
  - DOM snapshot (HTML completo)
  - HAR file (network requests)
  - Headers HTTP do servidor alvo
  - Dados SSL (certificado, validade, fingerprint)
  - WHOIS do domínio
  - Geolocalização do IP do servidor
  - SHA-256 de cada artefato
  - RFC 3161 timestamp (FreeTSA.org)
  - Geração de certidão PDF
  - Ingestão automática no vault (pasta `capturas_web`)
- [x] **[1.3]** Criar `app/app/admin/captura-web/page.tsx` — interface completa com progresso por etapa
- [x] **[1.4]** Adicionar link "Captura Web" na navegação (ícone Camera, cor cyan)
- [x] **[1.5]** Criar modelo Prisma `WebCapture` no schema
- [x] **[1.6]** Certidão de Captura PDF automática (pdf-lib) — gerada na API
  - UUID da operação, URL, data/hora UTC+BRT, IP servidor, SSL info, WHOIS, hashes, operador

---

## FASE 2 — PERÍCIA AUTOMÁTICA DE ARQUIVOS
> Perito digital embutido

- [x] **[2.1]** ExifTool v13.03 instalado via `apk add exiftool` no container (docker-compose command)
- [x] **[2.2]** Criar `app/app/api/pericia/route.ts`
  - Extração de metadados com ExifTool (autor, GPS, software, datas ocultas, dispositivo, serial)
  - Hashes SHA256 + SHA1 + MD5
  - Detecção de tipo real via comando `file`
  - Achados forenses automáticos (GPS, autoria, software, datas, dispositivo)
- [x] **[2.3]** Criar `app/app/admin/pericia-arquivo/page.tsx`
  - Seletor de arquivo do vault (pastas 01-09)
  - Laudo completo com todos os metadados ExifTool
  - Achados forenses destacados
  - Cópia de hashes com 1 clique
- [x] **[2.4]** Adicionar "Perícia" na navegação (ícone ScanSearch, cor emerald)
- [x] **[2.5]** Criar `/api/vault/browse` — lista todos arquivos reais das pastas 01-09 do COFRE_NCFN
- [x] **[2.6]** Criar `/api/vault/file` — serve arquivos do vault com Content-Type correto (imagens, PDFs, vídeos)
- [x] **[2.7]** Reescrever `/vault/page.tsx` — preview de imagens, PDFs, vídeos, áudios, lightbox, download

---

## FASE 3 — CADEIA DE CUSTÓDIA REFORÇADA
> Validade jurídica máxima

- [x] **[3.1]** Implementar RFC 3161 Timestamp
  - `lib/timestamp.ts` — stampAndSave() com FreeTSA.org real (ASN.1 SHA-256 correto)
  - `model TimestampRecord` no Prisma — armazena sha256 + TSR base64
  - `/api/timestamp` — salva no DB ao gerar
  - Auto-aplicado em uploads (background) e capturas web
- [x] **[3.2]** Implementar QR Code de verificação pública
  - QR code PNG embutido no PDF da certidão de captura (qrcode → pdf-lib embedPng)
  - QR aponta para `/verify?id=UUID` da captura
  - `/api/verify` — lookup real no DB (por hash ou por capture ID)
  - `/verify/page.tsx` — chama API real, suporta hash e capture ID
- [ ] **[3.3]** Implementar OpenTimestamps (âncora Bitcoin) — opcional/fase avançada
- [x] **[3.4]** Watermark digital invisível em PDFs baixados
  - `/api/vault/file` — pdf-lib injeta author/creator/keywords com userId + timestamp

---

## FASE 4 — OSINT VIA SESSÃO VIRTUALIZADA
> CSI Linux via Kasm Workspaces (nova VPS 16GB)

- [x] **[4.1]** `/api/admin/kasm/route.ts` — proxy completo para Kasm API
  - GET: status + listagem de sessões ativas
  - POST action=create: provisiona container CSI Linux
  - POST action=destroy: encerra sessão
  - POST action=list_images: lista imagens disponíveis
  - Auto-detecta imagem CSI Linux se KASM_IMAGE_ID não definida
- [x] **[4.2]** `/admin/investigar/page.tsx` — viewer Kasm full-screen
  - Estado "não configurado": guia de instalação com comandos
  - Estado "offline": reconexão automática
  - Iframe full-screen com CSI Linux session
  - Botões: iniciar / encerrar / tela cheia / abrir em nova aba
  - Lista sessões ativas já existentes no Kasm
- [x] **[4.3]** `docker-compose.yml` — profiles para ativar quando pronto
  - profile `kasm`: kasmweb/kasm:1.16.0 (requer 16GB VPS)
  - profile `osint`: smicallef/spiderfoot (leve, 200+ módulos)
  - Ativar: `docker compose --profile kasm up -d`
- [x] **[4.4]** `.env.example` atualizado com KASM_URL, API_KEY, API_SECRET
- **PENDENTE HARDWARE:** Configurar KASM_URL após instalar Kasm na VPS 16GB
  - Instalar: `curl -O .../kasm_release_1.16.0.tar.gz && bash install.sh`
  - Pull CSI Linux: `docker pull kasmweb/csi-linux:1.16.0`

---

## FASE 5 — IA FORENSE AVANÇADA
> Além do Mistral atual

- [x] **[5.1]** Instalar LLaVA no Ollama (análise de imagens)
  - `ollama pull llava` (executar no host)
  - Rota: `/api/admin/ia-config` — action: `analyze_image` ✅ implementado
  - Model: env `OLLAMA_VISION_MODEL=llava`
- [x] **[5.2]** Instalar Whisper self-hosted
  - Container `whisper` no docker-compose — profile `whisper`
  - Ativar: `docker compose --profile whisper up -d`
  - Env: `WHISPER_URL=http://whisper:9000`
- [x] **[5.3]** Implementar RAG jurídico com ChromaDB
  - Container `chromadb` no docker-compose — profile `rag`
  - Ativar: `docker compose --profile rag up -d`
  - Rota: `/api/admin/rag` — GET (status/query), POST (seed, query+IA)
  - Base: CP, CPP, Marco Civil, ECA, LGPD, Lei 9.613, Lei 11.343, Lei 12.737
  - Embeddings via Ollama nomic-embed-text
- [x] **[5.4]** Geração automática de Laudo Forense estruturado
  - Rota: `/api/admin/laudo-forense` — actions: create, generate_ai, generate_pdf, list, delete
  - Página: `/admin/laudo-forense` — formulário + seleção de evidências + preview
  - PDF gerado com pdf-lib, salvo em `09_BURN_IMMUTABILITY/`
  - Nav: link "Laudo IA" com ícone Sparkles

---

## FASE 6 — SEGURANÇA MÁXIMA
> Zero-trust real

- [x] **[6.1]** Implementar Rate Limiting em memória
  - `lib/rateLimit.ts` — sliding window in-memory (sem Redis)
  - Aplicar em: upload (20/h), capture (10/h) — integração pendente nas rotas
- [ ] **[6.2]** Implementar WebAuthn / FIDO2 — ADIADO (complexidade)
  - Package: `@simplewebauthn/server` + `@simplewebauthn/browser`
  - YubiKey ou biometria do dispositivo para admin
- [x] **[6.3]** Implementar TOTP 2FA
  - Package: `otplib` — adicionado ao package.json
  - Rota: `/api/auth/totp` — GET (setup), POST (verify/disable)
  - UI: componente `TotpSetup.tsx` no `/profile`
  - Schema: totpSecret, totpEnabled no modelo User ✅
- [x] **[6.4]** Adicionar Security Headers via next.config.mjs
  - X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection
- [x] **[6.5]** Implementar Canary Files (arquivos-isca)
  - Modelo `CanaryFile` no schema ✅
  - Rota: `/api/admin/canary` — create, delete, test, toggle
  - Página: `/admin/canary` — gestão completa com alerta de teste
  - `lib/canaryAlert.ts` — nodemailer com email HTML formatado
  - Integração em `/api/vault/file` — verifica canary + dispara alerta
  - Nav: link "Canary" com ícone AlertTriangle
- [x] **[6.6]** Session Binding (IP /24)
  - Middleware compara subnet /24 do IP atual vs. cookie `_ncfn_sip`
  - Redirecionamento com erro `session_ip_mismatch` se subnet mudar

---

## FASE 7 — INFRAESTRUTURA k3s + VPS
> Migração para produção robusta

- [ ] **[7.1]** Criar Dockerfile customizado para o portal (não buildar na subida)
- [ ] **[7.2]** Migrar SQLite → PostgreSQL
  - Instalar `pg` driver
  - Atualizar `schema.prisma` provider para postgresql
  - Gerar e rodar migration
  - Adicionar container `postgres:16-alpine` no compose
- [ ] **[7.3]** Adicionar Redis ao docker-compose
  - Imagem: `redis:7-alpine`
  - Usar para: cache de sessões, rate limiting, pub/sub de eventos
- [ ] **[7.4]** Criar container `vault-sync`
  - Roda `ncfn-sync.ts` via cron a cada 15min
  - Monitora COFRE_NCFN automaticamente
- [ ] **[7.5]** Instalar k3s local para testes
  - `curl -sfL https://get.k3s.io | sh -`
  - Criar manifests: Deployments, Services, PVCs, Secrets
- [ ] **[7.6]** Instalar k3s na VPS
  - Migrar todos os containers do docker-compose para k3s
- [ ] **[7.7]** Configurar Kasm Workspaces na VPS (requer upgrade RAM 8GB+)
  - Imagem: kasmweb/csi-linux ou kasmweb/kali-rolling
  - Integrar autenticação com o portal via API Kasm

---

## FASE 8 — UX PROFISSIONAL
> Interface de nível institucional

- [ ] **[8.1]** Dashboard em tempo real com SSE (Server-Sent Events)
  - Atividade recente, alertas, status do sistema
- [ ] **[8.2]** Linha do tempo de custódia por documento
  - Visualização de todos os eventos de um arquivo
- [ ] **[8.3]** Modo Apresentação (para audiências/tribunais)
  - Layout limpo e formal, sem interface admin
- [ ] **[8.4]** Notificações Push (PWA) para admin
  - Nova evidência, alerta Dead Man Switch, tentativa de intrusão
- [ ] **[8.5]** Página de perfil completa (já existe /profile)
  - Configuração de 2FA, WebAuthn, preferências

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS (pendentes de configurar)
```
# Já no compose (verificar se estão no .env):
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3002    # dev local
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAIL=
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=mistral
CRYPTO_SALT=
JWT_SECRET=
CRON_SECRET=                          # gerar string aleatória forte
MASTER_UNLOCK_KEY=                    # para dead man switch

# A adicionar:
SHODAN_API_KEY=                       # shodan.io
VT_API_KEY=                           # virustotal.com
URLSCAN_API_KEY=                      # urlscan.io
IPINFO_TOKEN=                         # ipinfo.io
HIBP_API_KEY=                         # haveibeenpwned.com
DATABASE_URL=postgresql://...         # quando migrar para PostgreSQL
REDIS_URL=redis://redis:6379
FREETSA_URL=https://freetsa.org/tsr
```

---

## NOTAS DE ARQUITETURA
- **OBS**: Obsidian já está rodando na VPS como container (`lscr.io/linuxserver/obsidian`)
- **COFRE_NCFN**: precisa ser volume montado no compose (`./COFRE_NCFN:/app/COFRE_NCFN`)
- **Docker socket**: `/var/run/docker.sock` montado no portal — vetor de risco, migrar para osint-runner isolado na fase 7
- **Prisma**: usar singleton (lib/prisma.ts) para evitar connection pool leaks em Next.js
- **Dead Man Switch**: unificar lockfile em `../arquivos/_SYSTEM_LOCKOUT`

---

## COMO RETOMAR APÓS INTERRUPÇÃO
1. Ler este arquivo do começo
2. Verificar quais itens estão marcados com [x]
3. Continuar pelo próximo item ⬜ não marcado
4. Ao abrir nova sessão com o AI: colar este checklist e pedir para continuar
5. O AI deve verificar o código atual antes de assumir o que foi implementado

---
*Portal NCFN — Nexus Cyber Forensic Network*
*Desenvolvido com Claude Code (Anthropic)*
