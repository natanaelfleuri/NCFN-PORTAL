# Decisões Técnicas

Registro de decisões arquiteturais importantes e a razão por trás delas.

---

## react-leaflet em vez de CesiumJS

**Decisão:** Usar react-leaflet para o mapa tático de `/admin/relatorios`
**Razão:** O pod k3s tem isolamento de rede que bloqueia acesso a `cesium.com` (CDN). O Cesium não carregava silenciosamente. O react-leaflet já estava no package.json e usa tile servers que funcionam do pod.
**Trade-off:** Leaflet é 2D. Para dados 3D (elevação, IoT sensor, terreno) seria necessário Deck.gl ou CesiumJS local.

---

## createPortal para o drawer mobile

**Decisão:** Renderizar o drawer mobile via `createPortal` no `document.body`
**Razão:** O `<header>` usa `backdrop-filter: blur(...)`, o que cria um novo stacking context CSS. Qualquer filho `position: fixed` fica preso dentro desse contexto, aparecendo atrás de outros elementos da página.
**Solução:** `createPortal(<Drawer/>, document.body)` escapa o stacking context.
**Cuidado:** Precisa de `mounted` state para evitar SSR hydration mismatch.

---

## File-based JSON para links-uteis (não Prisma)

**Decisão:** Notas em `/arquivos/links-uteis.json` em vez de tabela Prisma
**Razão:** Simplicidade. Notas são conteúdo leve, sem relações complexas. O arquivo é um volume montado, logo persiste no k3s PVC. Evita migration Prisma para feature não-crítica.
**Limite:** Não escala bem acima de 10.000 notas. Para escalar: migrar para Prisma.

---

## Cloudflare Tunnel em vez de porta pública

**Decisão:** Usar cloudflared tunnel, sem expor porta 443 diretamente
**Razão:** A VPS tem IP público mas não abre portas externas. O tunnel Cloudflare é mais seguro (Zero Trust, WAF incluso, DDoS protection).
**Como funciona:** `cloudflared` conecta de dentro da VPS ao Cloudflare Edge via WireGuard/QUIC. O tráfego entra na Cloudflare por `ncfn.net` e chega no pod via tunnel.

---

## Auto-save com debounce (não onChange imediato)

**Decisão:** Auto-save com 2 segundos de debounce
**Razão:** Salvar a cada keystroke geraria N requests/s. 2s é tempo suficiente para o usuário parar de digitar mas rápido o suficiente para não perder conteúdo.
**Importante:** O auto-save usa o mesmo endpoint POST (cria se não existe, atualiza se existe). Após o primeiro auto-save, `selected` fica preenchido, então todas as futuras operações são updates.

---

## Leaflet tile server URLs na CSP

**Decisão:** Adicionar CartoDB e ESRI à Content-Security-Policy do Caddyfile
**Razão:** A CSP bloqueia requests para domínios não listados. Os tiles de mapa vinham de `*.basemaps.cartocdn.com`, `*.arcgisonline.com` e `unpkg.com` (ícones Leaflet).
**Arquivo:** `Caddyfile` → `img-src` e `connect-src`

---

## DEV_BYPASS=true em desenvolvimento

**Decisão:** Variável `DEV_BYPASS=true` pula autenticação em dev local
**Razão:** Facilita desenvolvimento sem precisar logar. **NUNCA** deve estar `true` em produção.
**Como funciona:** `lib/auth.ts` → `getSession()` retorna sessão fake de admin quando `DEV_BYPASS=true`.
