#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# NCFN — Mailcow Installer
# Instala e configura Mailcow para mail.ncfn.net
#
# Executar na VPS como root:
#   chmod +x mailcow/install.sh && sudo bash mailcow/install.sh
#
# Requerimentos:
#   - Domínio mail.ncfn.net com A record → VPS IP (não proxiado)
#   - PTR record (rDNS) configurado pelo provedor VPS
#   - Portas 25, 80, 443, 465, 587, 993, 995 abertas no firewall
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

MAILCOW_DIR="/opt/mailcow-dockerized"
MAILCOW_HOSTNAME="mail.ncfn.net"
MAILCOW_TZ="America/Sao_Paulo"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          NCFN — Mailcow Installer v1.0               ║"
echo "║    Servidor de E-mail Seguro para mail.ncfn.net      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Verificar se é root
if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Execute como root: sudo bash mailcow/install.sh"
  exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
apt-get update -q
apt-get install -y -q git curl jq docker.io docker-compose-plugin

# Clonar mailcow se ainda não existe
if [ ! -d "$MAILCOW_DIR" ]; then
  echo "📥 Clonando mailcow-dockerized..."
  git clone https://github.com/mailcow/mailcow-dockerized "$MAILCOW_DIR"
else
  echo "✅ Mailcow já clonado em $MAILCOW_DIR"
fi

cd "$MAILCOW_DIR"

# Gerar config se não existe
if [ ! -f "$MAILCOW_DIR/mailcow.conf" ]; then
  echo "⚙️  Gerando configuração Mailcow..."
  MAILCOW_HOSTNAME="$MAILCOW_HOSTNAME" \
  MAILCOW_TZ="$MAILCOW_TZ" \
  bash generate_config.sh

  # Ajustes específicos para NCFN
  sed -i "s/HTTP_PORT=80/HTTP_PORT=8080/" mailcow.conf
  sed -i "s/HTTPS_PORT=443/HTTPS_PORT=8443/" mailcow.conf
  sed -i "s/SKIP_LETS_ENCRYPT=n/SKIP_LETS_ENCRYPT=y/" mailcow.conf
  sed -i "s/ALLOW_ADMIN_EMAIL_LOGIN=n/ALLOW_ADMIN_EMAIL_LOGIN=y/" mailcow.conf

  echo "" >> mailcow.conf
  echo "# NCFN overrides" >> mailcow.conf
  echo "ADDITIONAL_SERVER_NAMES=ncfn.net" >> mailcow.conf
fi

# Criar rede compartilhada com o portal NCFN
echo "🔗 Criando rede compartilhada ncfn_mailcow..."
docker network create ncfn_mailcow 2>/dev/null || echo "  (rede já existe)"

# Iniciar Mailcow
echo "🚀 Iniciando Mailcow..."
docker compose pull
docker compose up -d

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Mailcow instalado!"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Acessar admin: https://mail.ncfn.net/admin"
echo "   User: admin / Senha: moohoo (TROCAR IMEDIATAMENTE)"
echo ""
echo "2. Criar domínio: admin → Domínios → Adicionar domínio"
echo "   Domínio: ncfn.net"
echo ""
echo "3. Criar caixa de email:"
echo "   admin → Caixas de correio → Adicionar caixa"
echo "   Email: noreply@ncfn.net (para o portal)"
echo "   Email: admin@ncfn.net   (admin)"
echo "   Email: pericia@ncfn.net (relatórios forenses)"
echo ""
echo "4. Configurar DNS (Cloudflare):"
echo "   A   mail.ncfn.net  → $(curl -s ifconfig.me)  [DNS only, sem proxy]"
echo "   MX  ncfn.net       → mail.ncfn.net (prioridade 10)"
echo "   TXT ncfn.net       → \"v=spf1 mx a:mail.ncfn.net ~all\""
echo "   TXT _dmarc.ncfn.net → \"v=DMARC1; p=quarantine; rua=mailto:postmaster@ncfn.net\""
echo ""
echo "5. Copiar DKIM do admin → Config → ARC/DKIM → ncfn.net"
echo "   Adicionar como TXT: dkim._domainkey.ncfn.net"
echo ""
echo "6. Exportar chave PGP (ver generate-pgp.sh)"
echo "═══════════════════════════════════════════════════════"
