#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# NCFN Rolling Deploy — Atualização sem downtime (lógica Kubernetes)
# Uso: bash scripts/ncfn-deploy.sh [--profile whisper] [--profile rag]
#
# Fluxo:
#   1. Build da nova imagem
#   2. Substituição do container portal (Caddy continua em pé)
#   3. Aguarda healthcheck virar "healthy"
#   4. Rollback automático se health falhar
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
PORTAL_CONTAINER="portal_ncfn"
HEALTH_TIMEOUT=120   # segundos aguardando healthy
HEALTH_INTERVAL=5    # segundos entre cada checagem

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }
info() { echo -e "${BLUE}[→]${NC} $*"; }

cd "$COMPOSE_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Portal NCFN — Rolling Deploy                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Salvar imagem atual para rollback ─────────────────────────────────────────
PREV_IMAGE=$(docker inspect --format='{{.Image}}' "$PORTAL_CONTAINER" 2>/dev/null || echo "")
if [ -n "$PREV_IMAGE" ]; then
    info "Imagem atual (rollback): ${PREV_IMAGE:0:20}..."
fi

# ── 1. Build nova imagem ──────────────────────────────────────────────────────
info "Buildando nova imagem do portal..."
docker compose -f "$COMPOSE_FILE" build portal
log "Build concluído"

# ── 2. Atualizar apenas o portal (Caddy permanece no ar) ──────────────────────
info "Atualizando container portal (Caddy continua ativo)..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps portal
log "Novo container iniciado"

# ── 3. Aguardar healthcheck ───────────────────────────────────────────────────
info "Aguardando healthcheck (timeout: ${HEALTH_TIMEOUT}s)..."

ELAPSED=0
HEALTH="starting"
while [ "$ELAPSED" -lt "$HEALTH_TIMEOUT" ]; do
    HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$PORTAL_CONTAINER" 2>/dev/null || echo "unknown")

    case "$HEALTH" in
        healthy|no-healthcheck)
            log "Portal healthy! Deploy concluído com sucesso."
            break
            ;;
        unhealthy)
            err "Healthcheck falhou após ${ELAPSED}s"
            # ── Rollback automático ────────────────────────────────────────
            if [ -n "$PREV_IMAGE" ]; then
                warn "Iniciando rollback para imagem anterior..."
                docker stop "$PORTAL_CONTAINER" || true
                docker rm "$PORTAL_CONTAINER" || true
                docker run -d \
                    --name "$PORTAL_CONTAINER" \
                    --restart unless-stopped \
                    "$PREV_IMAGE" || true
                err "ROLLBACK executado. Verifique os logs: docker logs $PORTAL_CONTAINER"
            fi
            exit 1
            ;;
        starting|*)
            echo -ne "\r  Health: $HEALTH (${ELAPSED}s/${HEALTH_TIMEOUT}s)...   "
            sleep "$HEALTH_INTERVAL"
            ELAPSED=$((ELAPSED + HEALTH_INTERVAL))
            ;;
    esac
done

if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
    err "Timeout! Container não ficou healthy em ${HEALTH_TIMEOUT}s"
    warn "Verifique: docker logs $PORTAL_CONTAINER"
    exit 1
fi

echo ""

# ── 4. Limpar imagens antigas ─────────────────────────────────────────────────
info "Removendo imagens antigas (dangling)..."
docker image prune -f --filter "label=com.ncfn=portal" 2>/dev/null || \
    docker image prune -f 2>/dev/null || true
log "Limpeza concluída"

# ── Resumo ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Deploy Concluído — Portal Online                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
docker compose -f "$COMPOSE_FILE" ps
