#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# NCFN Container Watchdog — Gerenciamento automático estilo Kubernetes
# Lógica: liveness probe + auto-restart + alertas de recursos
#
# Instalado como systemd timer (dispara a cada 60s via ncfn-watchdog.timer)
# Logs visíveis via: journalctl -u ncfn-watchdog -f
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail

COMPOSE_DIR="/home/roaaxxz/docker/portal_ncfn"
COMPOSE_FILE="docker-compose.prod.yml"
LOG_TAG="ncfn-watchdog"

# Containers críticos: container_name → service_name no compose
declare -A CRITICAL=(
    ["portal_ncfn"]="portal"
    ["caddy_ncfn"]="caddy"
)

# Thresholds de alerta
DISK_ALERT_PCT=85
MEM_ALERT_PCT=90

# ── Funções de log ────────────────────────────────────────────────────────────
log_ok()   { logger -t "$LOG_TAG" "[OK]      $*"; }
log_warn() { logger -t "$LOG_TAG" "[ALERTA]  $*"; }
log_crit() { logger -t "$LOG_TAG" "[CRÍTICO] $*"; }

# ── Checar e auto-curar container ─────────────────────────────────────────────
check_and_heal() {
    local CNAME="$1"
    local SERVICE="$2"

    # Verificar se o container existe
    if ! docker inspect "$CNAME" &>/dev/null; then
        log_crit "$CNAME não encontrado — tentando iniciar via compose..."
        cd "$COMPOSE_DIR" && docker compose -f "$COMPOSE_FILE" up -d "$SERVICE" 2>&1 \
            | logger -t "$LOG_TAG" || true
        return
    fi

    local RUNNING
    RUNNING=$(docker inspect --format='{{.State.Running}}' "$CNAME" 2>/dev/null || echo "false")

    local HEALTH
    HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$CNAME" 2>/dev/null || echo "unknown")

    local RESTARTS
    RESTARTS=$(docker inspect --format='{{.RestartCount}}' "$CNAME" 2>/dev/null || echo "0")

    # Container parado
    if [ "$RUNNING" != "true" ]; then
        log_crit "$CNAME parado (restarts=$RESTARTS) — reiniciando..."
        docker start "$CNAME" 2>&1 | logger -t "$LOG_TAG" || \
            (cd "$COMPOSE_DIR" && docker compose -f "$COMPOSE_FILE" up -d "$SERVICE" 2>&1 | logger -t "$LOG_TAG")
        return
    fi

    # Healthcheck falhou
    if [ "$HEALTH" = "unhealthy" ]; then
        log_crit "$CNAME UNHEALTHY (restarts=$RESTARTS) — forçando restart..."
        docker restart "$CNAME" 2>&1 | logger -t "$LOG_TAG"
        return
    fi

    # Muitos restarts automáticos (crash loop detection)
    if [ "$RESTARTS" -gt 10 ]; then
        log_warn "$CNAME com $RESTARTS restarts — possível crash loop!"
    fi

    log_ok "$CNAME | running=$RUNNING | health=$HEALTH | restarts=$RESTARTS"
}

# ── Verificar containers críticos ────────────────────────────────────────────
for CNAME in "${!CRITICAL[@]}"; do
    check_and_heal "$CNAME" "${CRITICAL[$CNAME]}" || true
done

# ── Detectar containers órfãos em restart loop ────────────────────────────────
CRASHING=$(docker ps -a --filter "status=restarting" --format "{{.Names}}" 2>/dev/null)
if [ -n "$CRASHING" ]; then
    log_warn "Containers em crash loop detectados: $CRASHING"
fi

# ── Monitoramento de recursos ─────────────────────────────────────────────────
# Disco
DISK_PCT=$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}' 2>/dev/null || echo "0")
if [ "${DISK_PCT:-0}" -gt "$DISK_ALERT_PCT" ]; then
    log_crit "Disco em ${DISK_PCT}% — limiar de ${DISK_ALERT_PCT}% atingido!"
else
    log_ok "Disco: ${DISK_PCT}% usado"
fi

# Memória
MEM_PCT=$(free 2>/dev/null | awk 'NR==2 {if($2>0) printf "%.0f", $3/$2*100; else print 0}' || echo "0")
if [ "${MEM_PCT:-0}" -gt "$MEM_ALERT_PCT" ]; then
    log_warn "Memória em ${MEM_PCT}% — considere reiniciar serviços não críticos"
else
    log_ok "Memória: ${MEM_PCT}% usada"
fi

# ── Resumo de todos os containers NCFN ───────────────────────────────────────
NCFN_STATUS=$(docker ps --filter "name=portal_ncfn\|caddy_ncfn\|ncfn_" \
    --format "{{.Names}}={{.Status}}" 2>/dev/null | tr '\n' ' ')
log_ok "Status geral: $NCFN_STATUS"
