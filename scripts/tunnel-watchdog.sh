#!/usr/bin/env bash
# ============================================================
# tunnel-watchdog.sh — Auto-recuperação do Cloudflare Tunnel
# Roda via cron a cada 5 minutos
# Log: /var/log/ncfn-tunnel-watchdog.log
# ============================================================

set -euo pipefail

COMPOSE_DIR="/home/roaaxxz/docker/portal_ncfn"
CLOUDFLARED_DIR="$COMPOSE_DIR/cloudflared"
CONFIG_YML="$CLOUDFLARED_DIR/config.yml"
CREDENTIALS_JSON="$CLOUDFLARED_DIR/credentials.json"
LOG="/home/roaaxxz/docker/portal_ncfn/logs/tunnel-watchdog.log"
TUNNEL_NAME="ncfn-portal"
ACCOUNT_ID="4d29f510cefd46c07f5c1ec78e272792"
CONTAINER="ncfn_cloudflared"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

# ── 1. Verifica se o site responde ──────────────────────────
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://ncfn.net 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" =~ ^(200|301|302|307|308)$ ]]; then
    exit 0   # Tudo OK, sai silenciosamente
fi

log "ALERTA: ncfn.net retornou HTTP $HTTP_CODE — iniciando diagnóstico"

# ── 2. Verifica se o container está rodando ─────────────────
CONTAINER_STATUS=$(docker inspect "$CONTAINER" --format '{{.State.Status}}' 2>/dev/null || echo "missing")

if [[ "$CONTAINER_STATUS" != "running" ]]; then
    log "Container $CONTAINER não está rodando (status: $CONTAINER_STATUS) — tentando reiniciar"
    cd "$COMPOSE_DIR"
    docker compose up -d --no-deps cloudflared >> "$LOG" 2>&1
    sleep 10

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://ncfn.net 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" =~ ^(200|301|302|307|308)$ ]]; then
        log "RECUPERADO: site voltou após reinício do container"
        exit 0
    fi
fi

# ── 3. Verifica se o tunnel ainda existe na Cloudflare ──────
TUNNEL_EXISTS=$(docker run --rm \
    -v "$CLOUDFLARED_DIR:/etc/cloudflared" \
    cloudflare/cloudflared:latest tunnel list 2>/dev/null \
    | grep -c "$TUNNEL_NAME" || echo "0")

if [[ "$TUNNEL_EXISTS" == "0" ]]; then
    log "Tunnel '$TUNNEL_NAME' não encontrado — recriando..."

    # Cria novo tunnel
    CREATE_OUTPUT=$(docker run --rm \
        -v "$CLOUDFLARED_DIR:/etc/cloudflared" \
        cloudflare/cloudflared:latest tunnel create "$TUNNEL_NAME" 2>&1)
    log "Criação: $CREATE_OUTPUT"

    # Extrai novo ID
    NEW_TUNNEL_ID=$(echo "$CREATE_OUTPUT" | grep -oP '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)

    if [[ -z "$NEW_TUNNEL_ID" ]]; then
        log "ERRO: não foi possível extrair tunnel ID da saída: $CREATE_OUTPUT"
        exit 1
    fi

    log "Novo tunnel ID: $NEW_TUNNEL_ID"

    # Copia credentials do novo tunnel
    docker create --name tmp_cf_creds \
        -v "$CLOUDFLARED_DIR:/etc/cloudflared" \
        cloudflare/cloudflared:latest > /dev/null 2>&1
    docker cp "tmp_cf_creds:/etc/cloudflared/${NEW_TUNNEL_ID}.json" /tmp/new_tunnel_creds.json 2>&1
    docker rm tmp_cf_creds > /dev/null 2>&1

    # Atualiza credentials.json (sem o campo Endpoint)
    python3 -c "
import json
with open('/tmp/new_tunnel_creds.json') as f:
    c = json.load(f)
c.pop('Endpoint', None)
with open('$CREDENTIALS_JSON', 'w') as f:
    json.dump(c, f, indent=2)
print('credentials.json atualizado')
"
    # Atualiza config.yml com novo ID
    sed -i "s/^tunnel: .*/tunnel: $NEW_TUNNEL_ID/" "$CONFIG_YML"
    log "config.yml atualizado com tunnel $NEW_TUNNEL_ID"

    # Atualiza DNS na Cloudflare
    for HOSTNAME in ncfn.net www.ncfn.net; do
        DNS_RESULT=$(docker run --rm \
            -v "$CLOUDFLARED_DIR:/etc/cloudflared" \
            cloudflare/cloudflared:latest \
            tunnel route dns --overwrite-dns "$NEW_TUNNEL_ID" "$HOSTNAME" 2>&1)
        log "DNS $HOSTNAME: $DNS_RESULT"
    done
fi

# ── 4. Reinicia o container com config atualizada ───────────
log "Reiniciando $CONTAINER..."
cd "$COMPOSE_DIR"
docker compose up -d --no-deps cloudflared >> "$LOG" 2>&1
sleep 15

# ── 5. Verifica resultado final ─────────────────────────────
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://ncfn.net 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" =~ ^(200|301|302|307|308)$ ]]; then
    log "RECUPERADO: site voltou com HTTP $HTTP_CODE"
else
    log "FALHA: site ainda fora do ar após recuperação automática (HTTP $HTTP_CODE) — intervenção manual necessária"
fi
