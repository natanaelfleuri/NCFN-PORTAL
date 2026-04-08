# Estado Atual do Portal NCFN

**Última atualização:** 2026-04-08
**Último commit:** `a85bdeb` (2 commits à frente do origin — push pendente)

---

## O que está funcionando

### Core
- ✅ Autenticação: NextAuth + JWT + TOTP + WebAuthn
- ✅ PostgreSQL (Prisma ORM)
- ✅ Cloudflare Tunnel (ncfn.net)
- ✅ Cofre Forense completo (custódia, T0, ciclo de vida, TSA RFC 3161)
- ✅ Laudo Forense (geração, assinatura, expiração)
- ✅ Chat IA (Claude + Gemini + Ollama/Sansão streaming)
- ✅ Rate limiting sliding window
- ✅ Alertas canary por email (nodemailer)

### Interface
- ✅ Menu mobile (createPortal — drawer não fica atrás de elementos)
- ✅ BottomNav, FileContextNav, VaultClient mobile-friendly

### Admin — Páginas
- ✅ `/admin` — dashboard, +2 módulos (Nextcloud, Utilidades)
- ✅ `/admin/relatorios` — Mapa Tático Leaflet completo
- ✅ `/admin/links-uteis` — Notas Obsidian com auto-save, formatação, templates, sync NC
- ✅ `/admin/utilidades` — **NOVO** — painel NC + mail + file browser + sync

### Código implementado (aguardando Docker para testar)
- ✅ `app/lib/nextcloud.ts` — WebDAV client completo
- ✅ `app/lib/secureMail.ts` — mailer Bridge/SMTP/Resend
- ✅ `app/api/nextcloud/route.ts` — API proxy + sync notas
- ✅ `app/api/nextcloud/test-mail/route.ts` — test email
- ✅ `app/api/generate-report/route.ts` — auto-upload NC + email

---

## O que está pendente / não testado

### Infraestrutura (requer Docker + setup manual)
- ⬜ **Deploy VPS** — 2 commits locais não pusheados (`5c1564c`, `a85bdeb`)
- ⬜ **Nextcloud** — `docker compose --profile cloud up -d nextcloud`
  - Após subir: acessar `https://cloud.ncfn.net` → wizard
  - Criar dirs NC: usar botão "Criar estrutura NC" em /admin/utilidades
  - Gerar App Password no NC → adicionar ao .env
- ⬜ **Email backend** — escolher e configurar (ver opções abaixo)
- ⬜ **Cloudflare DNS** — CNAME `cloud` → tunnel ID

### Email — Opções (escolher uma)
| Opção | Config necessária | Custo |
|-------|------------------|-------|
| **Resend** (mais fácil) | `RESEND_API_KEY=re_...` | Grátis 3000/mês |
| **Gmail SMTP** | `SMTP_HOST=smtp.gmail.com SMTP_USER= SMTP_PASS=app-password` | Grátis |
| **ProtonMail Bridge** | Setup interativo + `BRIDGE_SMTP_*` | Requer conta paga ProtonMail |

### Pendências técnicas v4.2
- ⬜ Rate limiting nas rotas vault/upload e vault/capture
- ⬜ UI WebAuthn (gerenciar devices em /profile)
- ⬜ TOTP re-verificação no login
- ⬜ Trigger NC em vault/custody-report (gera PDF forense do cofre)

---

## Variáveis de Ambiente

### Existentes
```
NEXTAUTH_URL, NEXTAUTH_SECRET, ADMIN_EMAIL
CRYPTO_SALT, JWT_SECRET, CRON_SECRET, MASTER_UNLOCK_KEY
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
OLLAMA_URL, OLLAMA_MODEL, DATABASE_URL, DEV_BYPASS
```

### A Adicionar (mínimo funcional — escolher email)
```env
# Nextcloud (obrigatório para sync funcionar)
NEXTCLOUD_URL=https://cloud.ncfn.net
NEXTCLOUD_USER=admin
NEXTCLOUD_APP_PASSWORD=<gerada no NC Settings → Security>
NEXTCLOUD_ADMIN_PASSWORD=NCFN_Admin_2026!

# Email — Resend (mais fácil, criar conta em resend.com)
RESEND_API_KEY=re_xxxxx
BRIDGE_FROM=noreply@ncfn.net
REPORT_RECIPIENT=admin@example.com

# Email — SMTP Gmail (alternativa)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=conta@gmail.com
# SMTP_PASS=app-password-16chars
# BRIDGE_FROM=conta@gmail.com

# Email — ProtonMail Bridge (requer setup manual)
# BRIDGE_SMTP_HOST=protonmail-bridge
# BRIDGE_SMTP_PORT=1025
# BRIDGE_SMTP_USER=conta@proton.me
# BRIDGE_SMTP_PASS=<gerada pelo bridge --cli info>
# BRIDGE_FROM=conta@proton.me
```

---

## Sessões de trabalho

| # | Data | Commit | Descrição |
|---|------|--------|-----------|
| 4 | 2026-04-08 | `a85bdeb` | Nextcloud + SecureMail + Utilidades + CLAUDE BRAIN |
| 3 | 2026-04-08 | `5c1564c` | Mapa Tático Leaflet + Obsidian Notes rebuild |
| 2 | ~2026-04-07 | `dbeefe0` | Mobile redesign completo |
| 1 | ~2026-04-06 | `4d66bb5` | Documentação v15 |
