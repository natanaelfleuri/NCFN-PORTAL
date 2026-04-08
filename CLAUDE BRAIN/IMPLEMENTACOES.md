# Histórico de Implementações

Registro cronológico de tudo implementado. Sempre atualizar após cada sessão.

---

## Commit `4d66bb5` — Documentação v15 + Como funciona

**Data:** ~2026-04-06
**Arquivos:**
- `app/app/admin/page.tsx` — modal "Como funciona" atualizado para v15
- `app/app/api/doc/route.ts` — seed de documentação completo para v15
- `app/app/components/VaultClient.tsx` — modal "Como funciona" atualizado

---

## Commit `dbeefe0` — Mobile redesign completo

**Data:** ~2026-04-07
**Problema:** Menu mobile aparecia atrás de elementos da página (stacking context do backdrop-filter no header)
**Solução:** `createPortal` para renderizar o drawer no `document.body`

**Arquivos modificados:**
- `app/app/components/Navigation.tsx`
  - Drawer com `createPortal` → renderiza em `document.body`
  - z-index: backdrop 9998, drawer 9999
  - Body scroll lock: `document.body.classList.add('drawer-open')`
  - Animação: `mobile-drawer-enter` (CSS keyframes)
  - NotificationBell adicionado ao header mobile
- `app/app/components/BottomNav.tsx`
  - Altura aumentada: 58px → 60px
- `app/app/components/FileContextNav.tsx`
  - Container: `width: calc(100vw - 1.5rem)` para não overflow
  - Inner scroll: `flex-1 overflow-x-auto no-scrollbar`
  - Posição: `bottom-[74px]` para ficar acima do BottomNav
- `app/app/components/VaultClient.tsx`
  - Hamburguer: reposicionado abaixo do header sticky
  - Sidebar: `w-[min(24rem,calc(100vw-0.5rem))]`
- `app/app/layout.tsx` — padding header: `px-6` → `px-3 sm:px-6`
- `app/app/globals.css` — keyframes drawer, body.drawer-open, table mobile

---

## Commit `5c1564c` — Mapa Tático Leaflet + Obsidian Notes rebuild

**Data:** 2026-04-08
**Arquivos:**

### `app/app/admin/relatorios/MapaLeaflet.tsx` (NOVO)
- Substitui CesiumJS (CDN inacessível) por react-leaflet
- Ícones customizados SVG: `alvoIcon`, `routePointIcon`, `geolocIcon`, `drawPointIcon`
- Tiles: CartoDB dark, ESRI satellite, hybrid (sat + labels), OpenStreetMap
- Componentes internos: `MapEvents` (useMapEvents), `CursorStyle`
- Fix webpack: `delete (L.Icon.Default.prototype)._getIconUrl`
- Exports: `Alvo, Rota, DrawnShape, MapMode, MapaLeafletProps`

### `app/app/admin/relatorios/page.tsx` (REESCRITO)
- `dynamic(() => import('./MapaLeaflet'), { ssr: false })`
- 5 abas sidebar: alvos, rotas, desenhos, operacao, checklist
- Modos: normal, adicionar, rota, desenho, medindo
- Drawing: polygon (multi-clique + finish), circle (2 cliques), rectangle (2 cliques), polyline
- Geocodificação: Nominatim `https://nominatim.openstreetmap.org/search`
- Geolocalização: `navigator.geolocation.getCurrentPosition`
- Rings de proximidade por alvo
- Menu de contexto no clique direito
- Estado persistido: `ncfn_alvos_mapa`, `ncfn_rotas_mapa`, `ncfn_shapes_mapa`, `ncfn_operacao`, `ncfn_checklist`
- Exportar JSON completo
- Modal de edição de alvo com campos completos

### `app/app/admin/links-uteis/page.tsx` (MELHORADO)
- **Bug corrigido:** nova nota sumia após salvar (`setSelected(null)` → `setSelected(saved)`)
- **Auto-save:** debounce 2s + indicador visual (amarelo pendente, verde salvo)
- **Barra de formatação:** negrito, itálico, tachado, código, H1-H3, listas, checkbox, citação, link, bloco código, tabela, separador
- **Atalhos:** Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+S
- **Templates:** nota em branco, ata reunião, investigação, suspeito, relatório, checklist
- **Importar .md:** FileReader API, parse título da primeira linha `#`

---

---

## Commit `a85bdeb` — Nextcloud + SecureMail + Módulo Utilidades + CLAUDE BRAIN

**Data:** 2026-04-08

### `app/lib/nextcloud.ts` (NOVO)
WebDAV client completo:
- `ncUpload(path, content, mime)` — PUT
- `ncDownload(path)` → Buffer
- `ncDelete(path)` → bool
- `ncMkdir(path)` → bool (409 = ok, already exists)
- `ncList(path)` → NcFile[] (PROPFIND XML parser)
- `ncStat(path)` → { size, modified }
- `ncPing()` → { ok, user, version } via OCS API
- `ncEnsureDir(path)` — cria todos os segmentos
- `ncUploadWithDirs(path, content)` — mkdirs + upload
- `ncWebUrl(path)` → URL da interface web NC

### `app/lib/secureMail.ts` (NOVO)
Mailer flexível com 3 backends (prioridade: Bridge > SMTP > Resend):
- `sendSecureMail(payload)` → { ok, backend, messageId, error }
- `pingMailBackend()` → { ok, backend, detail }
- `reportEmailHtml(opts)` → HTML template dark com tabela de metadados
- ProtonMail Bridge: porta 1025, TLS self-signed, PGP automático
- SMTP: Gmail/Outlook padrão
- Resend: API REST, sem SMTP

### `app/api/nextcloud/route.ts` (NOVO)
GET: ping, list, download
POST: upload, mkdir, delete, sync-notes-push, sync-notes-pull
sync-notes-push: links-uteis.json → NCFN-NextCloud/Notas/*.md (frontmatter YAML)
sync-notes-pull: *.md NC → links-uteis.json (last-write-wins)

### `app/api/nextcloud/test-mail/route.ts` (NOVO)
POST { to } → envia email de teste via secureMail

### `app/admin/utilidades/page.tsx` (NOVO)
4 abas: Painel, Arquivos NC, Sync Notas, Configurações
- Status Nextcloud + SecureMail com ping automático
- File browser WebDAV (navegação por diretórios, upload, download, delete)
- Push/Pull notas com log em tempo real
- Setup instructions para ProtonMail Bridge
- Test email form

### `app/admin/page.tsx` (MODIFICADO)
- +2 módulos UTILIDADES: `/admin/utilidades` (Cpu icon) + `https://cloud.ncfn.net` (Cloud icon)
- Imports: Cloud, Cpu
- URLs externas: detectadas por `href.startsWith('http')` → `target="_blank"`

### `app/api/generate-report/route.ts` (MODIFICADO)
- Upload automático para NC após gerar PDF: `NCFN-NextCloud/Relatórios/YYYY/MM/filename.pdf`
- Email automático com anexo PDF (fire & forget, não bloqueia resposta)

### `app/admin/links-uteis/page.tsx` (MODIFICADO)
- Botões "Push NC" e "Pull NC" no sidebar
- Estado `syncing: 'push' | 'pull' | null`
- Handlers: `handleSyncPush()`, `handleSyncPull()`

### `docker-compose.yml` (MODIFICADO)
- Serviço `nextcloud` (profile: cloud) — nextcloud:27-apache
- Serviço `protonmail-bridge` (profile: secure-mail)
- Volumes: nextcloud_data, nextcloud_config, nextcloud_apps

### `cloudflared/config.yml` (MODIFICADO)
- Rota: `cloud.ncfn.net → http://ncfn_nextcloud:80`

### `Caddyfile` (MODIFICADO)
- Bloco `http://cloud.ncfn.net` → proxy para ncfn_nextcloud:80

### `CLAUDE BRAIN/` (NOVO)
- README.md, INFRAESTRUTURA.md, ARQUITETURA.md, IMPLEMENTACOES.md
- ESTADO_ATUAL.md, DECISOES.md, BUGS_CONHECIDOS.md
- PLANOS/NEXTCLOUD_PROTONMAIL.md, PLANOS/ROADMAP.md

---

## Pendências após `a85bdeb`

- [ ] **Nextcloud** — container, cloud.ncfn.net, WebDAV integration
- [ ] **ProtonMail Bridge** — container SMTP, PGP signing
- [ ] **Auto-email** — trigger ao gerar relatório
- [ ] **/admin/utilidades** — página + módulo admin
- [ ] **Sync notas NC** — WebDAV pull/push para links-uteis
- [ ] **Deploy VPS** — git push + pull VPS + docker build k3s
