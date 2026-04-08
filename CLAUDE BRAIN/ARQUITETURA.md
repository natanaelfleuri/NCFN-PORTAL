# Arquitetura e Convenções — Portal NCFN

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 14 — App Router, TypeScript |
| Estilo | Tailwind CSS 3, Lucide Icons, JSX inline styles |
| Auth | NextAuth.js v4 — JWT + TOTP + WebAuthn (simplewebauthn v8) |
| Banco | PostgreSQL (Prisma ORM) — container `ncfn_postgres` |
| Storage local | `/COFRE_NCFN` (volume), `/arquivos` (volume) |
| Storage nuvem | Cloudflare R2 (arquivos >50MB, presigned URL) |
| Email | nodemailer via `lib/canaryAlert.ts` (alertas canary) |
| IA | Claude (Anthropic), Gemini, Sansão (Ollama mistral) |
| Mapas | react-leaflet (tile CartoDB/ESRI/OSM) |
| Markdown | react-markdown + remark-gfm |

## Padrões Obrigatórios nas API Routes

```typescript
// @ts-nocheck                          ← SEMPRE linha 1
export const dynamic = "force-dynamic"; ← SEMPRE linha 2

import { getSession, getDbUser } from '@/lib/auth';
const session = await getSession();
if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
const dbUser = await getDbUser(session.user.email);
if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
```

## Padrões de Componente

- `"use client"` em tudo que usa hooks/estado
- SSR desativado para libs browser-only: `dynamic(() => import(...), { ssr: false })`
- Leaflet maps SEMPRE com `ssr: false`
- Imports: React hooks primeiro, depois lib, depois componentes internos

## Estrutura de Pastas

```
app/app/
├── (public)/           ← vitrine, login (sem auth)
├── admin/              ← protegido por role=admin
│   ├── page.tsx        ← dashboard principal
│   ├── relatorios/     ← mapa tático (Leaflet)
│   ├── links-uteis/    ← notas Obsidian
│   ├── utilidades/     ← PENDENTE (Nextcloud, bridge)
│   └── ...
├── vault/              ← cofre forense
├── api/
│   ├── links-uteis/    ← JSON file storage (/arquivos/links-uteis.json)
│   ├── nextcloud/      ← PENDENTE (WebDAV proxy)
│   └── ...
├── components/
│   ├── Navigation.tsx   ← header + drawer (createPortal)
│   ├── BottomNav.tsx    ← mobile nav
│   ├── FileContextNav.tsx ← barra flutuante de contexto de arquivo
│   └── ...
lib/
├── auth.ts             ← getSession, getDbUser, DEV_BYPASS
├── authOptions.ts      ← NextAuth config
├── prisma.ts           ← singleton Prisma client
├── canaryAlert.ts      ← nodemailer para alertas
└── nextcloud.ts        ← PENDENTE (WebDAV client)
```

## Módulos do Dashboard Admin

Categorias: `DOCUMENTOS (D)`, `SISTEMA (S)`, `INVESTIGAÇÃO (I)`, `FERRAMENTAS (F)`, `UTILIDADES (U)`
Definidos em `app/admin/page.tsx`, array `MODULES`.
Para adicionar: inserir entrada no array com `{ href, icon, label, ...U }`.

## Módulos UTILIDADES existentes

| Label | Href | Status |
| --- | --- | --- |
| HUB PÚBLICO | `/home` | ativo |
| MANUAIS DO SISTEMA | `/doc` | ativo |
| LINKS ÚTEIS | `/admin/links-uteis` | ativo |
| MÓDULO UTILIDADES | `/admin/utilidades` | **PENDENTE** |
| NEXTCLOUD | link externo `cloud.ncfn.net` | **PENDENTE** |

## FileContextNav

Barra flutuante que aparece quando `ncfn_file_ctx` existe no localStorage.
Persiste entre páginas: Cofre → Perícia → Logs Imutáveis → Relatórios → Sessão → Timeline.
Helpers: `setFileCtx(folder, filename)` e `clearFileCtx()`.

## Links-Uteis Storage

API: `/api/links-uteis/route.ts`
Arquivo: `/arquivos/links-uteis.json`
Estrutura: `{ notes: Note[], folders: FolderItem[] }`
Operações: GET (list), POST (create/update), PATCH (rename-folder, reorder-folders, patch-note), DELETE
