# Estado Atual do Portal NCFN

**Última atualização:** 2026-04-08
**Último commit:** `5c1564c`

---

## O que está funcionando

### Core
- ✅ Autenticação: NextAuth + JWT + TOTP + WebAuthn
- ✅ PostgreSQL (Prisma ORM) — production
- ✅ Cloudflare Tunnel (ncfn.net)
- ✅ Cofre Forense completo (custódia, T0, ciclo de vida, TSA RFC 3161)
- ✅ Laudo Forense (geração, assinatura, expiração)
- ✅ Chat IA (Claude + Gemini + Ollama/Sansão streaming)
- ✅ Rate limiting sliding window
- ✅ Alertas canary por email (nodemailer)

### Interface
- ✅ Menu mobile com createPortal (drawer não fica mais atrás de elementos)
- ✅ BottomNav mobile
- ✅ FileContextNav (barra flutuante de contexto de arquivo)
- ✅ VaultClient (sidebar do cofre — hamburguer e largura mobile)

### Admin
- ✅ Dashboard `/admin` — visão geral sistema, módulos, diretórios
- ✅ `/admin/relatorios` — Mapa Tático (react-leaflet, alvos, rotas, desenhos, operação, checklist)
- ✅ `/admin/links-uteis` — Notas Obsidian (auto-save, formatação, templates, importar .md)
- ✅ `/admin/timeline` — linha do tempo de custódia
- ✅ `/admin/logs` — logs de sessão
- ✅ `/admin/usuarios`, `/admin/convidados`
- ✅ `/admin/security`, `/admin/forensics`
- ✅ `/admin/captura-web` (Playwright/Chromium)
- ✅ `/admin/canary` — armadilha digital

---

## O que está pendente

### Imediato (próximas sessões)
- ⬜ **Nextcloud** — subir container + cloud.ncfn.net + WebDAV lib
- ⬜ **ProtonMail Bridge** — container + setup interativo + `lib/secureMail.ts`
- ⬜ **/admin/utilidades** — nova página + módulo no dashboard
- ⬜ **Auto-email** — trigger em geração de laudo/relatório
- ⬜ **Sync notas NC** — push/pull links-uteis ↔ Nextcloud

### Pendências técnicas v4.2
- ⬜ Rate limiting nas rotas vault/upload e vault/capture
- ⬜ UI WebAuthn (gerenciar devices em /profile)
- ⬜ TOTP re-verificação no login

### Deploy pendente
- ⬜ Push `5c1564c` para VPS + rebuild k3s
  - Docker não estava rodando no PC local em 2026-04-08

---

## Variáveis de Ambiente Atuais vs Necessárias

### Existentes
```
NEXTAUTH_URL, NEXTAUTH_SECRET, ADMIN_EMAIL
CRYPTO_SALT, JWT_SECRET, CRON_SECRET, MASTER_UNLOCK_KEY
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
OLLAMA_URL, OLLAMA_MODEL
DATABASE_URL (postgresql)
DEV_BYPASS=true (remover em prod!)
```

### A Adicionar (Nextcloud + Bridge)
```
NEXTCLOUD_URL=https://cloud.ncfn.net
NEXTCLOUD_USER=ncfn_service
NEXTCLOUD_APP_PASSWORD=<app password from NC>
NEXTCLOUD_ADMIN_PASSWORD=<admin password>
BRIDGE_SMTP_HOST=protonmail-bridge
BRIDGE_SMTP_PORT=1025
BRIDGE_SMTP_USER=<protonmail email>
BRIDGE_SMTP_PASS=<bridge generated password>
BRIDGE_FROM=<protonmail email>
REPORT_RECIPIENT=<email para receber relatórios>
```

---

## Últimas 3 sessões de trabalho

### Sessão 3 (2026-04-08) — commit `5c1564c`
Mapa Tático react-leaflet + correções links-uteis

### Sessão 2 (~2026-04-07) — commit `dbeefe0`
Mobile redesign completo (createPortal, FileContextNav, VaultClient)

### Sessão 1 (~2026-04-06) — commit `4d66bb5`
Documentação v15 + modal "Como funciona"
