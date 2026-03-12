#!/bin/bash
# NCFN OSINT — Instalação automática de ferramentas no container webtop
# Colocado em /custom-cont-init.d/ pelo docker-compose (mount read-only)
# Executa como root na inicialização do container, apenas uma vez.

FLAGFILE="/config/.osint_installed_v1"
[ -f "$FLAGFILE" ] && exit 0

echo "[OSINT-INSTALL] Iniciando instalação de ferramentas OSINT..."

apt-get update -qq 2>/dev/null
apt-get install -y -qq --no-install-recommends \
  nmap whois dnsutils curl wget git \
  python3-pip python3-dev build-essential 2>/dev/null

pip3 install --quiet --no-cache-dir \
  sherlock-project \
  theHarvester 2>/dev/null

# Recon-ng via git (não está no PyPI)
if [ ! -d /opt/recon-ng ]; then
  git clone --depth=1 https://github.com/lanmaster53/recon-ng.git /opt/recon-ng 2>/dev/null
  pip3 install --quiet -r /opt/recon-ng/REQUIREMENTS 2>/dev/null
  ln -sf /opt/recon-ng/recon-ng /usr/local/bin/recon-ng
fi

echo "[OSINT-INSTALL] Instalação concluída."
touch "$FLAGFILE"
