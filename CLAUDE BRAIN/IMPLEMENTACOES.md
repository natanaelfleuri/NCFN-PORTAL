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

## Pendências após `5c1564c`

- [ ] **Nextcloud** — container, cloud.ncfn.net, WebDAV integration
- [ ] **ProtonMail Bridge** — container SMTP, PGP signing
- [ ] **Auto-email** — trigger ao gerar relatório
- [ ] **/admin/utilidades** — página + módulo admin
- [ ] **Sync notas NC** — WebDAV pull/push para links-uteis
- [ ] **Deploy VPS** — git push + pull VPS + docker build k3s
