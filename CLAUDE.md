# Portal NCFN — Contexto para Claude Code

## O que é este projeto

**NCFN (Nexus Cyber Forensic Network)** é um portal de segurança cibernética e perícia forense digital.
Plataforma web fullstack usada por um time de peritos para:

- **Cofre Forense** — custódia de arquivos digitais com cadeia de evidências, criptografia, relatórios RFC 3161 (timestamp TSA) e ciclo de vida completo (relatório inicial → intermediário → final)
- **Laudo Forense** — geração, assinatura e gestão de laudos tipados com expiração automática
- **Vitrine** — portfólio público de serviços
- **Auditor** — monitoramento interno, logs de sessão, alertas canary
- **Chat IA** — comunicação com Claude, Gemini e Sansão (Ollama local) com histórico persistido
- **Admin** — painel de controle com visão geral do sistema, gestão de usuários, WebAuthn, TOTP

## Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Edge/Node) |
| Banco | PostgreSQL (Prisma ORM) — container `ncfn_postgres` |
| Auth | NextAuth.js v4 — JWT com role, TOTP, WebAuthn (simplewebauthn v8), IP binding /24 |
| Storage | Volume Docker `./COFRE_NCFN` montado em `/COFRE_NCFN` |
| Infra | Docker Compose, Caddy (reverse proxy), Cloudflare Tunnel (sem porta pública) |
| IA Local | Ollama (host) — modelo `mistral`, exposto em `host.docker.internal:11434` |

## Estrutura de diretórios

```
/home/roaaxxz/docker/portal_ncfn/
├── docker-compose.yml          ← orquestração dos serviços
├── Caddyfile                   ← reverse proxy (HTTP, TLS via CF)
├── cloudflared/                ← config do Cloudflare Tunnel
├── app/                        ← código Next.js
│   ├── app/
│   │   ├── (public)/           ← páginas públicas (vitrine, login)
│   │   ├── admin/              ← painel admin (protegido por role=admin)
│   │   ├── api/                ← API routes
│   │   │   ├── admin/          ← endpoints admin
│   │   │   ├── vault/          ← cofre forense
│   │   │   └── chat/           ← chat IA
│   │   └── components/         ← componentes globais
│   ├── lib/
│   │   ├── auth.ts             ← getSession, getDbUser, DEV_BYPASS
│   │   ├── authOptions.ts      ← NextAuth config (JWT + callbacks)
│   │   ├── prisma.ts           ← singleton Prisma client
│   │   ├── rateLimit.ts        ← sliding window in-memory
│   │   ├── timestamp.ts        ← RFC 3161 TSA
│   │   └── canaryAlert.ts      ← nodemailer para alertas
│   └── prisma/
│       ├── schema.prisma       ← 23+ modelos de dados
│       └── dev.db              ← SQLite (legado, não usar em prod)
├── COFRE_NCFN/                 ← arquivos custodiados
└── arquivos/                   ← uploads gerais
```

## Convenções obrigatórias (SEGUIR SEMPRE)

### API Routes
```typescript
// @ts-nocheck                          ← SEMPRE no topo
export const dynamic = "force-dynamic"; ← SEMPRE após o nocheck

// Auth obrigatória em toda rota protegida:
const session = await getSession();
if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
const dbUser = await getDbUser(session.user.email);
if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
```

### Banco de dados
```typescript
import { prisma } from '@/lib/prisma'; // singleton — nunca instanciar direto
```

### Auth helper
```typescript
import { getSession, getDbUser } from '@/lib/auth';
// DEV_BYPASS=true no .env → bypassa auth em dev local
```

## Serviços Docker ativos

| Container | Porta interna | Função |
|-----------|--------------|--------|
| `portal_ncfn_dev` | 3000 (→ host 3002) | App Next.js |
| `caddy_ncfn` | 80 | Reverse proxy |
| `ncfn_cloudflared` | host network | Tunnel CF → localhost:3002 |
| `ncfn_ttyd` | 7681 | Terminal web (esta sessão) |
| `ncfn_web_check` | 3005 | Web-check OSINT |
| `ncfn_postgres` | 5432 | PostgreSQL (profile: postgres) |

## Como aplicar mudanças

### Código Next.js (app/)
```bash
cd /home/roaaxxz/docker/portal_ncfn
docker compose up -d --build portal
```

### Schema Prisma
```bash
docker exec portal_ncfn_dev npx prisma migrate dev --name <nome>
# ou em prod:
docker exec portal_ncfn_dev npx prisma migrate deploy
```

### Caddy (após editar Caddyfile)
```bash
docker exec caddy_ncfn caddy reload --config /etc/caddy/Caddyfile
# Se o container não ver as mudanças (inode stale):
docker restart caddy_ncfn
```

### Ver logs
```bash
docker logs portal_ncfn_dev -f --tail 50
docker logs ncfn_ttyd -f
```

## Estado atual (v4.2 — 2026-03-24)

Funcionalidades implementadas e estáveis:
- Ciclo completo de custódia forense (T0, relatório inicial/intermediário/final, expiração 5h)
- WebAuthn real (fingerprint/FaceID) via simplewebauthn v8
- Chat IA com streaming SSE (Claude + Gemini + Ollama simultâneo)
- Rate limiting sliding window
- Alertas canary por email
- Timestamp RFC 3161

## Pendências prioritárias

1. **[6.1]** Aplicar `checkRateLimit()` nas rotas `/api/vault/upload` e `/api/vault/capture`
2. **UI WebAuthn** — tela de gerenciamento de devices em `/profile` (listar, revogar)
3. **TOTP** — fluxo de re-verificação no login (segunda etapa após senha)
4. **Fase 7** — migração para k3s + PostgreSQL em produção
5. **Fase 8** — UX SSE em tempo real para notificações do sistema

## Modo de operação esperado

- Trabalho direto no diretório `/home/roaaxxz/docker/portal_ncfn`
- Edições de código → rebuild automático do container portal
- Sempre verificar se as convenções de código estão sendo seguidas
- Mensagens de commit em português, concisas, com prefixo `feat/fix/refactor/chore`
- Nunca commitar `.env`, `dev.db`, credenciais
- Testar via `curl http://127.0.0.1:3002/api/...` ou abrindo o browser no portal
