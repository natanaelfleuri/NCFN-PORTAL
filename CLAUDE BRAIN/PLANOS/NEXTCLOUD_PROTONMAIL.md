# Plano: Nextcloud + ProtonMail Bridge + Módulo Utilidades

**Status:** PENDENTE
**Prioridade:** Alta
**Estimativa de fases:** 5 fases independentes, implementáveis em sequência

---

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                    NCFN Sistema Integrado                       │
│                                                                 │
│  Portal Next.js ──WebDAV──▶ Nextcloud (cloud.ncfn.net)         │
│       │                          │                             │
│       │                    NCFN-NextCloud/                     │
│       │                    ├── Relatórios/  ◀── auto-upload    │
│       │                    ├── Laudos/                         │
│       │                    └── Notas/  ◀── sync links-uteis   │
│       │                                                        │
│       └─SMTP──▶ ProtonMail Bridge ──PGP──▶ destinatário        │
│                      (localhost:1025)                          │
│                 trigger: geração de relatório/laudo            │
└─────────────────────────────────────────────────────────────────┘
```

---

## FASE 1 — Nextcloud: Container + Subdomínio

### 1.1 docker-compose.yml — Adicionar serviço

```yaml
nextcloud:
  image: nextcloud:27-apache
  container_name: ncfn_nextcloud
  mem_limit: 1g
  mem_reservation: 256m
  cpus: "2"
  volumes:
    - ./nextcloud_data:/var/www/html/data
    - ./nextcloud_config:/var/www/html/config
    - ./nextcloud_apps:/var/www/html/apps
  environment:
    - POSTGRES_HOST=ncfn_postgres
    - POSTGRES_DB=nextcloud_db
    - POSTGRES_USER=ncfn
    - POSTGRES_PASSWORD=ncfn2026
    - NEXTCLOUD_ADMIN_USER=admin
    - NEXTCLOUD_ADMIN_PASSWORD=${NEXTCLOUD_ADMIN_PASSWORD}
    - NEXTCLOUD_TRUSTED_DOMAINS=cloud.ncfn.net
    - OVERWRITEHOST=cloud.ncfn.net
    - OVERWRITEPROTOCOL=https
    - OVERWRITECLIURL=https://cloud.ncfn.net
  restart: unless-stopped
  depends_on:
    - postgres   # ativar o profile postgres também
```

**ATENÇÃO:** Requer o profile `postgres` ativo (`docker compose --profile postgres up -d`).
Ou criar um banco SQLite para o Nextcloud (mais simples, menos performático).

**Versão SQLite (sem dependência do postgres):**
```yaml
environment:
  - SQLITE_DATABASE=nextcloud
  # remover todas as linhas POSTGRES_*
```

### 1.2 Cloudflare Tunnel — config.yml

Adicionar em `/home/roaaxxz/docker/portal_ncfn/cloudflared/config.yml`:

```yaml
ingress:
  - hostname: ncfn.net
    service: http://127.0.0.1:80
  - hostname: www.ncfn.net
    service: http://127.0.0.1:80
  - hostname: ncfn.ncfn.net
    service: http://127.0.0.1:3000
    originRequest:
      noTLSVerify: true
  - hostname: cloud.ncfn.net          # ← NOVO
    service: http://127.0.0.1:8080    # ← porta Caddy roteando para nextcloud
  - service: http_status:404
```

### 1.3 Caddyfile — Adicionar bloco

```caddy
http://cloud.ncfn.net {
    reverse_proxy nextcloud:80 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto https
        header_up X-Forwarded-For {remote_host}
        transport http {
            read_timeout 300s
            write_timeout 300s
        }
    }
}
```

**ATENÇÃO:** Adicionar ao Caddy listener na porta 8080, ou fazer Caddy escutar também na 8080 e rotear `cloud.ncfn.net` para `nextcloud:80` internamente.

Alternativa mais simples — Nextcloud na porta 8080 diretamente no Tunnel:
```yaml
# Tunnel: cloud.ncfn.net → http://ncfn_nextcloud:80 (via docker network)
# Caddy não precisa rotear cloud.ncfn.net se o tunnel aponta direto
```

Melhor abordagem: o tunnel aponta `cloud.ncfn.net` → `http://127.0.0.1:8080` e Caddy ouve na 8080 para `cloud.ncfn.net`.

Ou mais simples ainda: mudar o docker-compose para expor nextcloud na porta 8080 do host e o tunnel apontar direto para ela.

### 1.4 Cloudflare DNS

No painel Cloudflare → ncfn.net → DNS:
- Tipo: CNAME
- Nome: `cloud`
- Conteúdo: `e0423fdb-84ac-4b6c-8a73-0fa4a5765c43.cfargotunnel.com`
- Proxied: ✅ (laranja)

### 1.5 Primeiro acesso

Após subir o container, acessar `https://cloud.ncfn.net` e completar o wizard de instalação se necessário. Criar:
- Usuário de serviço: `ncfn_service`
- App Password (Configurações → Segurança → Passwords de aplicativos): `NCFN_Service_2026`
- Criar pasta: `NCFN-NextCloud/`
- Sub-pastas: `Relatórios/`, `Laudos/`, `Notas/`, `Evidências/`

---

## FASE 2 — WebDAV Integration (Portal → Nextcloud)

### 2.1 Lib: `app/lib/nextcloud.ts`

```typescript
// @ts-nocheck
/**
 * Nextcloud WebDAV client
 * Endpoint: https://cloud.ncfn.net/remote.php/dav/files/{user}/
 */
const NC_URL  = process.env.NEXTCLOUD_URL!;  // https://cloud.ncfn.net
const NC_USER = process.env.NEXTCLOUD_USER!;  // ncfn_service
const NC_PASS = process.env.NEXTCLOUD_APP_PASSWORD!;

function ncHeaders() {
  const token = Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/octet-stream' };
}

export async function ncUpload(remotePath: string, content: Buffer | string) {
  const url = `${NC_URL}/remote.php/dav/files/${NC_USER}/${remotePath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: ncHeaders(),
    body: content,
  });
  if (!res.ok) throw new Error(`NC upload failed: ${res.status} ${await res.text()}`);
  return url;
}

export async function ncDownload(remotePath: string): Promise<Buffer> {
  const url = `${NC_URL}/remote.php/dav/files/${NC_USER}/${remotePath}`;
  const res = await fetch(url, { headers: ncHeaders() });
  if (!res.ok) throw new Error(`NC download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function ncList(remotePath: string): Promise<string[]> {
  const url = `${NC_URL}/remote.php/dav/files/${NC_USER}/${remotePath}`;
  const res = await fetch(url, {
    method: 'PROPFIND',
    headers: { ...ncHeaders(), 'Content-Type': 'text/xml', Depth: '1' },
    body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>`,
  });
  if (!res.ok) return [];
  const text = await res.text();
  const matches = text.match(/<d:href>([^<]+)<\/d:href>/g) ?? [];
  return matches.map(m => m.replace(/<\/?d:href>/g, '').trim());
}

export async function ncMkdir(remotePath: string) {
  const url = `${NC_URL}/remote.php/dav/files/${NC_USER}/${remotePath}`;
  await fetch(url, { method: 'MKCOL', headers: ncHeaders() });
}
```

### 2.2 API Routes

**`app/api/nextcloud/upload/route.ts`** — proxy upload
**`app/api/nextcloud/list/route.ts`** — listar diretório
**`app/api/nextcloud/sync-notes/route.ts`** — sync bidirecional notas

### 2.3 .env vars a adicionar

```env
NEXTCLOUD_URL=https://cloud.ncfn.net
NEXTCLOUD_USER=ncfn_service
NEXTCLOUD_APP_PASSWORD=NCFN_Service_2026
```

---

## FASE 3 — ProtonMail Bridge

### Pré-requisito IMPORTANTE

ProtonMail Bridge requer:
1. **Conta ProtonMail paga** (Mail Plus ou superior)
2. **Setup interativo inicial** — fazer login uma vez via terminal
3. A partir do segundo boot o bridge autentica automaticamente

### 3.1 docker-compose.yml — Adicionar serviço

```yaml
protonmail-bridge:
  image: shenxianpeng/protonmail-bridge:latest
  container_name: ncfn_protonmail_bridge
  volumes:
    - ./protonmail_bridge_data:/root
  ports:
    - "127.0.0.1:1025:1025"   # SMTP
    - "127.0.0.1:1143:1143"   # IMAP
  restart: unless-stopped
```

### 3.2 Setup inicial (ONE-TIME, manual)

```bash
# Após subir o container:
docker exec -it ncfn_protonmail_bridge protonmail-bridge --cli

# Dentro do CLI:
# > login
# [digitar email ProtonMail]
# [digitar senha ProtonMail]
# [completar 2FA se habilitado]
# > info
# [copiar SMTP username e password gerados pelo bridge]
# > quit
```

Os dados ficam em `./protonmail_bridge_data/` (volume persistido).

### 3.3 .env vars a adicionar

```env
BRIDGE_SMTP_HOST=protonmail-bridge
BRIDGE_SMTP_PORT=1025
BRIDGE_SMTP_USER=seu_email@protonmail.com
BRIDGE_SMTP_PASS=bridge_generated_password_aqui
BRIDGE_FROM=ncfn@protonmail.com
REPORT_RECIPIENT=destinatario@example.com
```

### 3.4 Nodemailer config — `app/lib/secureMail.ts`

```typescript
import nodemailer from 'nodemailer';

export function createSecureTransport() {
  return nodemailer.createTransport({
    host: process.env.BRIDGE_SMTP_HOST ?? 'protonmail-bridge',
    port: parseInt(process.env.BRIDGE_SMTP_PORT ?? '1025'),
    secure: false,       // bridge usa STARTTLS na porta 1025
    auth: {
      user: process.env.BRIDGE_SMTP_USER!,
      pass: process.env.BRIDGE_SMTP_PASS!,
    },
    tls: { rejectUnauthorized: false },  // bridge usa cert self-signed
  });
}

export async function sendSecureEmail({
  to, subject, html, attachments = [],
}: {
  to: string; subject: string; html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}) {
  const transport = createSecureTransport();
  return transport.sendMail({
    from: process.env.BRIDGE_FROM,
    to,
    subject,
    html,
    attachments,
  });
}
```

**Nota sobre PGP:** O ProtonMail Bridge assina automaticamente TODOS os emails que passam por ele com a chave PGP da conta ProtonMail. Não é necessário implementar assinatura PGP no código — o bridge faz isso nativamente.

---

## FASE 4 — Auto-Email ao Gerar Relatório/Laudo

### Hook em geração de relatório

Nos endpoints que geram relatórios/laudos, adicionar após a geração do PDF:

```typescript
// app/api/laudo-forense/generate/route.ts (exemplo)
import { ncUpload } from '@/lib/nextcloud';
import { sendSecureEmail } from '@/lib/secureMail';

// ... após gerar o PDF ...
const pdfBuffer = await generatePDF(laudo);
const remotePath = `NCFN-NextCloud/Laudos/${laudo.id}_${laudo.titulo}.pdf`;

// Upload para Nextcloud
await ncUpload(remotePath, pdfBuffer);

// Enviar email criptografado via Bridge
await sendSecureEmail({
  to: process.env.REPORT_RECIPIENT!,
  subject: `[NCFN] Novo Laudo Forense — ${laudo.id}`,
  html: `
    <h2>Laudo Forense Gerado</h2>
    <p><strong>ID:</strong> ${laudo.id}</p>
    <p><strong>Tipo:</strong> ${laudo.tipo}</p>
    <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    <p>O arquivo foi armazenado no Nextcloud em: <code>${remotePath}</code></p>
    <hr/>
    <p style="font-size:11px;color:#666">
      Este email foi assinado com PGP via ProtonMail Bridge.<br>
      Sistema NCFN — Nexus Cyber Forensic Network
    </p>
  `,
  attachments: [{
    filename: `laudo_${laudo.id}.pdf`,
    content: pdfBuffer,
    contentType: 'application/pdf',
  }],
});
```

---

## FASE 5 — Página /admin/utilidades + Sync Notas

### 5.1 Novo módulo em `app/app/admin/page.tsx`

```typescript
// Adicionar ao array MODULES:
{ href: '/admin/utilidades', icon: Cpu, label: 'MÓDULO UTILIDADES', ...U },
```

### 5.2 Página `app/app/admin/utilidades/page.tsx`

Seções:
1. **Nextcloud** — status, link para cloud.ncfn.net, espaço usado, últimos uploads
2. **ProtonMail Bridge** — status do bridge, último email enviado, test ping
3. **Sync Notas** — status da sincronização, forçar push/pull, conflitos
4. **Configurações** — variáveis de ambiente (read-only para verificação)

### 5.3 API `/api/nextcloud/sync-notes/route.ts`

- **GET:** Lista arquivos .md em `NCFN-NextCloud/Notas/`, retorna conteúdo
- **POST (action=push):** Pega todas as notas do `links-uteis.json`, salva como .md no NC
- **POST (action=pull):** Lê .md do NC, cria/atualiza notas no `links-uteis.json`
- Estratégia de conflito: last-write-wins por `updatedAt`

### 5.4 Botão de Sync nas notas

Em `app/app/admin/links-uteis/page.tsx`, adicionar no sidebar:

```tsx
<button onClick={handleSyncToCloud} style={...}>
  <Cloud size={10} /> Sync NC
</button>
```

---

## Ordem de Implementação Recomendada

1. **Fase 1** — Nextcloud up (30 min)
2. **Fase 2** — `lib/nextcloud.ts` + rotas API (45 min)
3. **Fase 5** — `/admin/utilidades` básica + módulo no admin (30 min)
4. **Fase 3** — ProtonMail Bridge (setup manual + `lib/secureMail.ts`) (45 min + setup)
5. **Fase 4** — Auto-email nas rotas de geração (30 min)
6. **Fase 5 completo** — Sync bidirecional notas (1h)

---

## Pré-requisitos para começar

- [ ] PostgreSQL rodando (`docker compose --profile postgres up -d`) OU usar SQLite para NC
- [ ] Nextcloud container subindo sem erros
- [ ] DNS `cloud.ncfn.net` configurado no Cloudflare
- [ ] Conta ProtonMail paga (para o bridge)
- [ ] `.env` atualizado com as novas variáveis
