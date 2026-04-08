#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Portal NCFN — Script de Migração Docker Compose → k3s
# Executar na VPS: bash k8s/migration.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

PROJ_DIR="/home/roaaxxz/docker/portal_ncfn"
K8S_DIR="$PROJ_DIR/k8s"
ENV_FILE="$PROJ_DIR/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()      { echo -e "${GREEN}[ OK ]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  NCFN Portal — Migração para k3s${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# ── 0. Pré-requisitos ────────────────────────────────────────────
[[ $EUID -ne 0 ]] && fail "Execute como root"
cd "$PROJ_DIR"

# ── 1. Instalar k3s ──────────────────────────────────────────────
if ! command -v k3s &>/dev/null; then
    info "Instalando k3s..."
    curl -sfL https://get.k3s.io | sh -s - \
        --disable traefik \
        --disable servicelb \
        --write-kubeconfig-mode 644
    sleep 10
    ok "k3s instalado: $(k3s --version | head -1)"
else
    ok "k3s já instalado: $(k3s --version | head -1)"
fi

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Aguardar node ficar Ready
info "Aguardando node ficar Ready..."
for i in $(seq 1 30); do
    STATUS=$(k3s kubectl get node --no-headers 2>/dev/null | awk '{print $2}' | head -1)
    [[ "$STATUS" == "Ready" ]] && { ok "Node pronto"; break; }
    [[ $i -eq 30 ]] && fail "Node não ficou Ready após 60s"
    sleep 2
done

# ── 2. Criar diretórios de dados na VPS ──────────────────────────
info "Criando diretórios de dados..."
mkdir -p "$PROJ_DIR/data/db"
mkdir -p "$PROJ_DIR/data/caddy"
mkdir -p "$PROJ_DIR/data/caddy-config"
mkdir -p "$PROJ_DIR/COFRE_NCFN"
mkdir -p "$PROJ_DIR/arquivos"

# Migrar banco SQLite existente (do volume Docker para hostPath)
DOCKER_DB_VOL=$(docker volume inspect portal_ncfn_ncfn_db --format '{{.Mountpoint}}' 2>/dev/null || echo "")
if [[ -n "$DOCKER_DB_VOL" && -f "$DOCKER_DB_VOL/dev.db" ]]; then
    info "Migrando banco SQLite do volume Docker..."
    cp "$DOCKER_DB_VOL/dev.db" "$PROJ_DIR/data/db/dev.db" 2>/dev/null || true
    ok "Banco migrado → $PROJ_DIR/data/db/dev.db"
fi

# Migrar TLS data do Caddy
DOCKER_CADDY_VOL=$(docker volume inspect portal_ncfn_caddy_data --format '{{.Mountpoint}}' 2>/dev/null || echo "")
if [[ -n "$DOCKER_CADDY_VOL" ]]; then
    info "Migrando certificados TLS do Caddy..."
    cp -r "$DOCKER_CADDY_VOL/." "$PROJ_DIR/data/caddy/" 2>/dev/null || true
    ok "Certs migrados → $PROJ_DIR/data/caddy/"
fi
ok "Diretórios prontos"

# ── 3. Importar imagem Docker para containerd do k3s ─────────────
info "Importando imagem ncfn/portal:latest para containerd..."
if docker image inspect ncfn/portal:latest &>/dev/null; then
    docker save ncfn/portal:latest | k3s ctr images import -
    ok "Imagem importada para containerd"
else
    warn "Imagem ncfn/portal:latest não encontrada — fazendo build..."
    docker build -t ncfn/portal:latest "$PROJ_DIR/app"
    docker save ncfn/portal:latest | k3s ctr images import -
    ok "Imagem construída e importada"
fi

# ── 4. Criar namespace ───────────────────────────────────────────
info "Criando namespace ncfn..."
k3s kubectl apply -f "$K8S_DIR/namespace.yaml"
ok "Namespace ncfn criado"

# ── 5. Criar Secret com variáveis de ambiente ────────────────────
info "Criando Secret ncfn-env a partir do .env..."
[[ ! -f "$ENV_FILE" ]] && fail ".env não encontrado em $ENV_FILE"
# Gerar e aplicar secret
k3s kubectl create secret generic ncfn-env \
    --from-env-file="$ENV_FILE" \
    -n ncfn \
    --dry-run=client -o yaml | k3s kubectl apply -f -
ok "Secret ncfn-env criado/atualizado"

# ── 6. Criar Secret do Cloudflare Tunnel ─────────────────────────
info "Criando Secret do Cloudflare Tunnel..."
CF_CREDS="$PROJ_DIR/cloudflared/credentials.json"
CF_CONFIG="$PROJ_DIR/cloudflared/config.yml"

# Gerar config.yml para k3s (aponta para portal-svc interno)
mkdir -p "$PROJ_DIR/cloudflared"
TUNNEL_ID=$(cat "$CF_CREDS" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['TunnelID'])" 2>/dev/null || echo "c1e9b8f1-5011-40fa-8840-b2212c02abc7")
cat > "$CF_CONFIG" << EOF
tunnel: $TUNNEL_ID
credentials-file: /etc/cloudflared/credentials.json
ingress:
  - hostname: ncfn.net
    service: http://portal-svc.ncfn.svc.cluster.local:3000
  - hostname: www.ncfn.net
    service: http://portal-svc.ncfn.svc.cluster.local:3000
  - service: http_status:404
EOF

if [[ -f "$CF_CREDS" ]]; then
    k3s kubectl create secret generic ncfn-cf-tunnel \
        --from-file=credentials.json="$CF_CREDS" \
        --from-file=config.yml="$CF_CONFIG" \
        -n ncfn \
        --dry-run=client -o yaml | k3s kubectl apply -f -
    ok "Secret ncfn-cf-tunnel criado"
else
    warn "cloudflared/credentials.json não encontrado — tunnel pode não funcionar"
fi

# ── 7. Parar containers Docker Compose ───────────────────────────
info "Parando containers Docker Compose..."
cd "$PROJ_DIR"
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
ok "Containers Docker Compose parados"

# ── 8. Aplicar manifests k8s ─────────────────────────────────────
info "Aplicando manifests Kubernetes..."
k3s kubectl apply -f "$K8S_DIR/pv-pvc.yaml"
k3s kubectl apply -f "$K8S_DIR/configmap-caddy.yaml"
k3s kubectl apply -f "$K8S_DIR/services.yaml"
k3s kubectl apply -f "$K8S_DIR/deployment-portal.yaml"
k3s kubectl apply -f "$K8S_DIR/deployment-caddy.yaml"
k3s kubectl apply -f "$K8S_DIR/deployment-cloudflared.yaml"
ok "Manifests aplicados"

# ── 9. Aguardar pods ficarem Running ─────────────────────────────
info "Aguardando pods iniciarem (máx 3 min)..."
echo ""
for i in $(seq 1 36); do
    PORTAL_STATUS=$(k3s kubectl get pod -n ncfn -l app=portal --no-headers 2>/dev/null | awk '{print $3}' | head -1)
    CADDY_STATUS=$(k3s kubectl get pod -n ncfn -l app=caddy --no-headers 2>/dev/null | awk '{print $3}' | head -1)
    CF_STATUS=$(k3s kubectl get pod -n ncfn -l app=cloudflared --no-headers 2>/dev/null | awk '{print $3}' | head -1)
    printf "\r  portal: %-12s  caddy: %-12s  cloudflared: %-12s" "$PORTAL_STATUS" "$CADDY_STATUS" "$CF_STATUS"
    if [[ "$PORTAL_STATUS" == "Running" && "$CADDY_STATUS" == "Running" ]]; then
        echo ""
        break
    fi
    sleep 5
done
echo ""

# ── 10. Status final ─────────────────────────────────────────────
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Status dos Pods${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
k3s kubectl get pods -n ncfn -o wide
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Teste de Saúde${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
sleep 5
HEALTH=$(curl -sk https://ncfn.net/api/health 2>/dev/null || curl -s http://localhost:3000/api/health 2>/dev/null || echo "aguardando...")
echo "  /api/health → $HEALTH"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Migração concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "  Comandos úteis:"
echo "  kubectl get pods -n ncfn"
echo "  kubectl logs -n ncfn deploy/portal -f"
echo "  kubectl rollout restart deploy/portal -n ncfn"
echo ""
