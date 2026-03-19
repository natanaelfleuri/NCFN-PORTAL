#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# NCFN Portal — Configuração Completa do Cloudflare
# Executa APÓS subir o sistema na VPS.
# Uso: bash setup-cloudflare.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Credenciais ─────────────────────────────────────────────────────────────
CF_TOKEN="cfat_oT3G8Ky1a3cLbqDNXedRJhk0Mmlt1pizfBfTpud7cdd35ef8"
ZONE_ID="9e6b4e4c2455925f1c81207092feeb2c"
ACCOUNT_ID="4d29f510cefd46c07f5c1ec78e272792"
DOMAIN="ncfn.net"
ADMIN_EMAIL="fleuriengenharia@gmail.com"

CF="https://api.cloudflare.com/client/v4"
H=(-H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json")

ok()   { echo -e "\033[32m✓\033[0m $1"; }
warn() { echo -e "\033[33m⚠\033[0m $1"; }
err()  { echo -e "\033[31m✗\033[0m $1"; }
info() { echo -e "\033[36m→\033[0m $1"; }

cf() { curl -sf "${H[@]}" "$@"; }

# ── 0. Verificar token ───────────────────────────────────────────────────────
info "Verificando token Cloudflare..."
STATUS=$(cf "${CF}/user/tokens/verify" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['status'])" 2>/dev/null || echo "error")
if [[ "$STATUS" != "active" ]]; then
  err "Token inválido ou inativo. Verifique o token e tente novamente."
  exit 1
fi
ok "Token ativo"

# ── 1. Configurações da Zone ─────────────────────────────────────────────────
info "Configurando settings da zone..."

apply_setting() {
  local key="$1" val="$2"
  local res
  res=$(cf -X PATCH "${CF}/zones/${ZONE_ID}/settings/${key}" \
    -d "{\"value\":${val}}" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('success') else d.get('errors','?'))" 2>/dev/null || echo "error")
  [[ "$res" == "ok" ]] && ok "${key}" || warn "${key}: ${res}"
}

apply_setting "ssl"                '"full"'          # SSL: Full (Strict quando cert válido)
apply_setting "always_use_https"   '"on"'            # Forçar HTTPS
apply_setting "min_tls_version"    '"1.2"'           # TLS mínimo 1.2
apply_setting "tls_1_3"            '"zrt"'           # TLS 1.3 + 0-RTT
apply_setting "automatic_https_rewrites" '"on"'      # Reescrever links HTTP → HTTPS
apply_setting "security_level"     '"high"'          # Nível de segurança: alto
apply_setting "browser_check"      '"on"'            # Checar integridade do browser
apply_setting "hotlink_protection" '"on"'            # Proteger hotlink
apply_setting "email_obfuscation"  '"on"'            # Ofuscar emails
apply_setting "server_side_exclude" '"on"'           # SSE
apply_setting "rocket_loader"      '"off"'           # Desligar Rocket Loader (Next.js tem seu próprio)
apply_setting "minify"             '{"js":true,"css":true,"html":false}' # Minificar JS/CSS
apply_setting "brotli"             '"on"'            # Compressão Brotli
apply_setting "http3"              '"on"'            # HTTP/3 (QUIC)
apply_setting "0rtt"               '"on"'            # 0-RTT
apply_setting "websockets"         '"on"'            # WebSockets
apply_setting "pseudo_ipv4"        '"off"'

ok "Settings da zone configurados"

# ── 2. Cache Rules ───────────────────────────────────────────────────────────
info "Configurando regras de cache..."

# Deletar cache rules antigas
OLD_RULES=$(cf "${CF}/zones/${ZONE_ID}/cache/rules" 2>/dev/null \
  | python3 -c "import sys,json; [print(r['id']) for r in json.load(sys.stdin).get('result',[])]" 2>/dev/null || true)
for rule_id in $OLD_RULES; do
  cf -X DELETE "${CF}/zones/${ZONE_ID}/cache/rules/${rule_id}" >/dev/null 2>&1 || true
done

# Regra 1: Bypass cache para rotas de API e autenticação
cf -X POST "${CF}/zones/${ZONE_ID}/cache/rules" -d '{
  "rules": [
    {
      "description": "NCFN - Bypass API e Auth",
      "expression": "(http.request.uri.path contains \"/api/\") or (http.request.uri.path contains \"/login\") or (http.request.uri.path contains \"/admin\") or (http.request.uri.path contains \"/_next/\")",
      "action": "set_cache_settings",
      "action_parameters": {
        "cache": false
      },
      "enabled": true
    },
    {
      "description": "NCFN - Cache assets estáticos 7 dias",
      "expression": "(http.request.uri.path.extension in {\"js\" \"css\" \"png\" \"jpg\" \"jpeg\" \"webp\" \"svg\" \"ico\" \"woff\" \"woff2\" \"ttf\"})",
      "action": "set_cache_settings",
      "action_parameters": {
        "cache": true,
        "edge_ttl": {
          "mode": "override_origin",
          "default": 604800
        },
        "browser_ttl": {
          "mode": "override_origin",
          "default": 86400
        }
      },
      "enabled": true
    }
  ]
}' >/dev/null 2>&1 && ok "Cache rules configuradas" || warn "Cache rules — verifique no dashboard"

# ── 3. WAF / Firewall Rules ──────────────────────────────────────────────────
info "Configurando WAF..."

# Managed Rulesets — ativar OWASP e Cloudflare Managed
cf -X PUT "${CF}/zones/${ZONE_ID}/rulesets/phases/http_request_firewall_managed/entrypoint" -d '{
  "rules": [
    {
      "action": "execute",
      "action_parameters": {
        "id": "efb7b8c949ac4650a09736fc376e9aee",
        "overrides": {
          "action": "block",
          "enabled": true
        }
      },
      "expression": "true",
      "description": "Cloudflare Managed Ruleset",
      "enabled": true
    }
  ]
}' >/dev/null 2>&1 && ok "WAF Managed Rules ativado" || warn "WAF — configure manualmente no dashboard"

# Regra: bloquear scanners e bots maliciosos
EXISTING_RULES=$(cf "${CF}/zones/${ZONE_ID}/firewall/rules" 2>/dev/null \
  | python3 -c "import sys,json; [print(r['id']) for r in json.load(sys.stdin).get('result',[])]" 2>/dev/null || true)
for fid in $EXISTING_RULES; do
  cf -X DELETE "${CF}/zones/${ZONE_ID}/firewall/rules/${fid}" >/dev/null 2>&1 || true
done

# Criar filtro e regra para bloquear UAs maliciosos
FILTER_ID=$(cf -X POST "${CF}/zones/${ZONE_ID}/filters" -d '[{
  "expression": "(http.user_agent contains \"sqlmap\") or (http.user_agent contains \"nikto\") or (http.user_agent contains \"masscan\") or (http.user_agent contains \"zgrab\") or (http.user_agent contains \"dirbuster\") or (http.user_agent contains \"nuclei\") or (http.request.uri.path contains \"/wp-admin\") or (http.request.uri.path contains \"/phpmyadmin\") or (http.request.uri.path contains \"/xmlrpc.php\")",
  "description": "NCFN - Bloquear scanners e paths maliciosos"
}]' 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')" 2>/dev/null || echo "")

if [[ -n "$FILTER_ID" ]]; then
  cf -X POST "${CF}/zones/${ZONE_ID}/firewall/rules" -d "[{
    \"filter\": {\"id\": \"${FILTER_ID}\"},
    \"action\": \"block\",
    \"description\": \"NCFN - Bloquear scanners e bots\",
    \"priority\": 1
  }]" >/dev/null 2>&1 && ok "Firewall rule criada" || warn "Firewall rule — verifique no dashboard"
else
  warn "Filtro WAF não criado — pode ser limitação do plano"
fi

# ── 4. Page Rules ────────────────────────────────────────────────────────────
info "Configurando Page Rules..."

# Deletar page rules antigas
OLD_PR=$(cf "${CF}/zones/${ZONE_ID}/pagerules?status=active" 2>/dev/null \
  | python3 -c "import sys,json; [print(r['id']) for r in json.load(sys.stdin).get('result',[])]" 2>/dev/null || true)
for pr_id in $OLD_PR; do
  cf -X DELETE "${CF}/zones/${ZONE_ID}/pagerules/${pr_id}" >/dev/null 2>&1 || true
done

# Redirecionar www → apex
cf -X POST "${CF}/zones/${ZONE_ID}/pagerules" -d "{
  \"targets\": [{\"target\": \"url\", \"constraint\": {\"operator\": \"matches\", \"value\": \"www.${DOMAIN}/*\"}}],
  \"actions\": [{\"id\": \"forwarding_url\", \"value\": {\"url\": \"https://${DOMAIN}/\$1\", \"status_code\": 301}}],
  \"status\": \"active\",
  \"priority\": 1
}" >/dev/null 2>&1 && ok "Redirect www → apex" || warn "Page rule www redirect"

ok "Page Rules configuradas"

# ── 5. Cloudflare Access — apenas página /login ──────────────────────────────
info "Configurando Cloudflare Access para /login..."

# Verificar se Zero Trust está disponível
ZT_CHECK=$(cf "${CF}/accounts/${ACCOUNT_ID}/access/apps" 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('success') else 'no')" 2>/dev/null || echo "no")

if [[ "$ZT_CHECK" == "ok" ]]; then
  # Deletar aplicações Access antigas para ncfn.net
  OLD_APPS=$(cf "${CF}/accounts/${ACCOUNT_ID}/access/apps" 2>/dev/null \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
for a in d.get('result', []):
    if '${DOMAIN}' in a.get('domain',''):
        print(a['id'])
" 2>/dev/null || true)
  for app_id in $OLD_APPS; do
    cf -X DELETE "${CF}/accounts/${ACCOUNT_ID}/access/apps/${app_id}" >/dev/null 2>&1 || true
  done

  # Criar aplicação Access APENAS para /login
  APP_ID=$(cf -X POST "${CF}/accounts/${ACCOUNT_ID}/access/apps" -d "{
    \"name\": \"NCFN Portal - Login\",
    \"domain\": \"${DOMAIN}/login\",
    \"type\": \"self_hosted\",
    \"session_duration\": \"24h\",
    \"auto_redirect_to_identity\": true,
    \"http_only_cookie_attribute\": true,
    \"same_site_cookie_attribute\": \"strict\",
    \"skip_interstitial\": false,
    \"app_launcher_visible\": false,
    \"allowed_idps\": [],
    \"custom_pages\": []
  }" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['id'] if d.get('result') else '')" 2>/dev/null || echo "")

  if [[ -n "$APP_ID" ]]; then
    ok "Aplicação Access criada (ID: ${APP_ID})"

    # Criar política: permitir apenas o email admin
    cf -X POST "${CF}/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}/policies" -d "{
      \"name\": \"Permitir Admin NCFN\",
      \"decision\": \"allow\",
      \"precedence\": 1,
      \"include\": [{
        \"email\": {\"email\": \"${ADMIN_EMAIL}\"}
      }],
      \"require\": [],
      \"exclude\": []
    }" >/dev/null 2>&1 && ok "Política de acesso: apenas ${ADMIN_EMAIL}" || warn "Política Access — verifique no dashboard"
  else
    warn "Não foi possível criar aplicação Access — configure manualmente em zero trust → access → applications"
    warn "  → URL: ${DOMAIN}/login | Tipo: Self-hosted | Política: email = ${ADMIN_EMAIL}"
  fi
else
  warn "Zero Trust Access não disponível via API — configure manualmente:"
  warn "  Dashboard → Zero Trust → Access → Applications → Add"
  warn "  URL: ${DOMAIN}/login | Tipo: Self-hosted | Email permitido: ${ADMIN_EMAIL}"
fi

# ── 6. DNS Records ───────────────────────────────────────────────────────────
info "Verificando registros DNS..."

DNS_RECORDS=$(cf "${CF}/zones/${ZONE_ID}/dns_records?type=A&name=${DOMAIN}" 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('result',[])))" 2>/dev/null || echo "0")

if [[ "$DNS_RECORDS" == "0" ]]; then
  warn "Nenhum registro A encontrado para ${DOMAIN}"
  warn "  → Adicione manualmente no dashboard ou o tunnel já resolve via CNAME"
else
  ok "${DNS_RECORDS} registro(s) DNS encontrado(s) para ${DOMAIN}"
  # Garantir proxy (laranjinha) ativado
  RECORD_IDS=$(cf "${CF}/zones/${ZONE_ID}/dns_records?name=${DOMAIN}" 2>/dev/null \
    | python3 -c "import sys,json; [print(r['id']+'|'+str(r.get('proxied',False))) for r in json.load(sys.stdin).get('result',[])]" 2>/dev/null || true)
  for entry in $RECORD_IDS; do
    rec_id="${entry%%|*}"
    proxied="${entry##*|}"
    if [[ "$proxied" == "False" ]]; then
      cf -X PATCH "${CF}/zones/${ZONE_ID}/dns_records/${rec_id}" \
        -d '{"proxied":true}' >/dev/null 2>&1 && ok "Proxy ativado no registro ${rec_id}" || true
    fi
  done
fi

# ── 7. Purge Cache ───────────────────────────────────────────────────────────
info "Limpando cache do Cloudflare (garantindo leitura do sistema novo)..."

PURGE=$(cf -X POST "${CF}/zones/${ZONE_ID}/purge_cache" \
  -d '{"purge_everything":true}' 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('success') else str(d.get('errors','?')))" 2>/dev/null || echo "error")

if [[ "$PURGE" == "ok" ]]; then
  ok "Cache completamente limpo — Cloudflare vai ler o sistema novo"
else
  warn "Purge cache: ${PURGE}"
fi

# ── 8. Resumo ────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "  NCFN — Cloudflare configurado"
echo "══════════════════════════════════════════════════"
echo "  Domínio     : https://${DOMAIN}"
echo "  SSL         : Full"
echo "  Segurança   : High + WAF Managed"
echo "  Access      : /login → apenas ${ADMIN_EMAIL}"
echo "  Cache       : Purged (sistema novo ativo)"
echo "══════════════════════════════════════════════════"
echo ""
echo "  Próximos passos manuais (se necessário):"
echo "  1. Dashboard CF → SSL/TLS → Edge Certificates → habilitar HSTS"
echo "  2. Dashboard CF → Zero Trust → Access → verificar aplicação /login"
echo "  3. Dashboard CF → Security → Bots → Bot Fight Mode = ON"
echo ""
