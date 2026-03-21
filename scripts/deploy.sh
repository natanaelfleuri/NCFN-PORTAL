#!/bin/bash
# deploy.sh — Build, import no k3s containerd e restart
set -euo pipefail
cd /root/docker/portal_ncfn

echo "[DEPLOY] Git pull..."
git pull origin main

echo "[DEPLOY] Docker build..."
# Carrega vars sem executar linhas inválidas do .env
MAPS_KEY=$(grep -m1 '^NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'") || true
BUILDER_KEY=$(grep -m1 '^NEXT_PUBLIC_BUILDER_API_KEY' .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'") || true

docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="${MAPS_KEY}" \
  --build-arg NEXT_PUBLIC_BUILDER_API_KEY="${BUILDER_KEY}" \
  -t portal_ncfn:latest ./app

echo "[DEPLOY] Importando no k3s containerd..."
docker save portal_ncfn:latest | /usr/local/bin/k3s ctr images import -

echo "[DEPLOY] Tagueando como docker.io/ncfn/portal:latest..."
/usr/local/bin/k3s ctr images tag --force \
  docker.io/library/portal_ncfn:latest \
  docker.io/ncfn/portal:latest

echo "[DEPLOY] Restart deployment..."
export PATH=/usr/local/bin:$PATH
k3s kubectl rollout restart deployment/portal -n ncfn
k3s kubectl rollout status deployment/portal -n ncfn --timeout=120s

echo "[DEPLOY] Concluído!"
