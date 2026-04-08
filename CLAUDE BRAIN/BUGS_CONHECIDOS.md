# Bugs Conhecidos e Workarounds

---

## [RESOLVIDO] Nova nota sumia após salvar em links-uteis

**Arquivo:** `app/app/admin/links-uteis/page.tsx:391`
**Sintoma:** Ao criar uma nova nota e salvar, o editor ficava vazio (nota sumia)
**Causa:** `handleSave` chamava `setSelected(null); setTitle(''); setContent('')` para notas novas
**Fix:** `setSelected(saved); setTitle(saved.title); setContent(saved.content);`
**Commit:** `5c1564c`

---

## [RESOLVIDO] Menu mobile atrás de elementos da página

**Arquivo:** `app/app/components/Navigation.tsx`
**Sintoma:** O drawer mobile aparecia atrás de cards e outros elementos
**Causa:** `backdrop-filter: blur()` no `<header>` cria stacking context CSS que prende `position: fixed` filhos
**Fix:** `createPortal(<Drawer/>, document.body)` — renderiza fora do header
**Commit:** `dbeefe0`

---

## [RESOLVIDO] CesiumJS não carregava no pod k3s

**Arquivo:** `app/app/admin/relatorios/page.tsx`
**Sintoma:** Mapa em branco, nenhum erro visível no console
**Causa:** Pod k3s com isolamento de rede bloqueia requests HTTPS externos a `cesium.com`
**Fix:** Substituído por react-leaflet (já instalado, usa tile servers distintos)
**Commit:** `5c1564c`

---

## [ATIVO] Set<string> TypeScript error em links-uteis

**Arquivo:** `app/app/admin/links-uteis/page.tsx:569`
**Erro:** `Type 'Set<string>' can only be iterated through when using '--downlevelIteration' flag`
**Causa:** `tsconfig.json` com target < ES2015
**Impacto:** Apenas aviso do tsc --noEmit. O build Next.js (`next build`) funciona normalmente.
**Workaround:** Ignorar. Se precisar corrigir: `tsconfig.json` → `"downlevelIteration": true`

---

## [ATIVO] Ícones Leaflet não aparecem sem unpkg.com

**Arquivo:** `app/app/admin/relatorios/MapaLeaflet.tsx:12-17`
**Causa:** Webpack quebra os ícones default do Leaflet. Fix parcial via URLs unpkg.com.
**Se unpkg.com bloqueado:** Ícones padrão não aparecem, mas os custom `divIcon` (SVG) funcionam normalmente
**Workaround atual:** `L.Icon.Default.mergeOptions({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/...' })`
**Fix definitivo:** Copiar os PNGs de leaflet para `/public/leaflet/` e usar URLs locais

---

## [ATIVO] Cloudflare token no .env inválido

**Contexto:** Token da API Cloudflare para purge de cache
**Sintoma:** Purge automático de cache não funciona via API
**Workaround:** Fazer purge manualmente via dash.cloudflare.com → ncfn.net → Caching → Purge Everything
**Fix:** Regenerar token em dash.cloudflare.com → My Profile → API Tokens

---

## [POTENCIAL] ProtonMail Bridge requer setup interativo

**Contexto:** Para integração ProtonMail Bridge
**Problema:** O container headless do bridge precisa de autenticação inicial via terminal interativo (OAuth ProtonMail)
**Solução:** Fazer setup uma vez via `docker exec -it protonmail_bridge /bin/sh`, depois persiste
**Detalhe:** Ver `PLANOS/NEXTCLOUD_PROTONMAIL.md` para instruções completas
