#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# NCFN — Configurar Nextcloud Mail App com Mailcow + OpenPGP
#
# Executar após:
#   1. Nextcloud estar rodando (cloud.ncfn.net)
#   2. Mailcow estar rodando (mail.ncfn.net)
#   3. Caixas de email criadas no Mailcow
#
# Uso: bash mailcow/configure-nextcloud-mail.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

NC_CONTAINER="ncfn_nextcloud"
NC_ADMIN_USER="${NEXTCLOUD_ADMIN_USER:-admin}"
NC_ADMIN_PASS="${NEXTCLOUD_ADMIN_PASSWORD:-NCFN_Admin_2026!}"

# Caixa de email que o Nextcloud vai usar
MAILCOW_IMAP_HOST="mail.ncfn.net"
MAILCOW_IMAP_PORT=993
MAILCOW_SMTP_HOST="mail.ncfn.net"
MAILCOW_SMTP_PORT=587

NC_MAIL_USER="${1:-admin@ncfn.net}"
NC_MAIL_PASS="${2:-}"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     NCFN — Configuração Nextcloud Mail + OpenPGP     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Verificar se container NC está rodando
if ! docker ps --format '{{.Names}}' | grep -q "$NC_CONTAINER"; then
  echo "❌ Container $NC_CONTAINER não está rodando."
  echo "   Execute: docker compose --profile cloud up -d nextcloud"
  exit 1
fi

# Função helper para OCC
occ() {
  docker exec -u www-data "$NC_CONTAINER" php occ "$@"
}

echo "📦 Instalando Nextcloud Mail app..."
occ app:install mail 2>/dev/null || occ app:enable mail

echo "✅ Mail app instalada/habilitada"

echo "📦 Instalando Nextcloud Contacts (requerido pelo Mail)..."
occ app:install contacts 2>/dev/null || occ app:enable contacts

echo ""
echo "⚙️  Configurando IMAP/SMTP padrão para o admin..."

# Configurar conta de email para o admin via OCC
# (Nextcloud Mail 2.0+ suporta configuração via OCC)
occ mail:account:add \
  --user "$NC_ADMIN_USER" \
  --name "NCFN Admin" \
  --email "$NC_MAIL_USER" \
  --imap-host "$MAILCOW_IMAP_HOST" \
  --imap-port "$MAILCOW_IMAP_PORT" \
  --imap-ssl "ssl" \
  --imap-user "$NC_MAIL_USER" \
  --imap-password "$NC_MAIL_PASS" \
  --smtp-host "$MAILCOW_SMTP_HOST" \
  --smtp-port "$MAILCOW_SMTP_PORT" \
  --smtp-ssl "tls" \
  --smtp-user "$NC_MAIL_USER" \
  --smtp-password "$NC_MAIL_PASS" \
  2>/dev/null || echo "  ⚠️  Conta de email: configurar manualmente em Nextcloud → Mail → Configurações"

echo ""
echo "🔑 Configurações OpenPGP no Nextcloud Mail:"
echo ""
echo "   (Estas etapas são feitas pela interface web)"
echo ""
echo "   1. Acesse cloud.ncfn.net"
echo "   2. Abra o app Mail (ícone envelope no menu lateral)"
echo "   3. Clique no ícone ⚙️ (Settings) → Encryption"
echo "   4. Clique em 'Import private key'"
echo "   5. Cole o conteúdo de mailcow/pgp-keys/ncfn_private.asc"
echo "   6. Digite a passphrase gerada pelo generate-pgp.sh"
echo "   7. Clique em 'Import'"
echo ""
echo "   Após importar:"
echo "   - Ao escrever um email, aparece ícone 🔒 (criptografar)"
echo "   - Aparece ícone ✍️ (assinar)"
echo "   - Nextcloud Mail usa OpenPGP nativo (sem plugin externo)"
echo ""

# Configurar app-password do Nextcloud para o portal se necessário
echo "🔑 Gerando App Password do Nextcloud para o portal..."
APP_PASS=$(occ user:add-app-password "$NC_ADMIN_USER" 2>&1 | grep "password" | awk '{print $NF}' || echo "MANUAL")
if [ "$APP_PASS" != "MANUAL" ]; then
  echo "   NEXTCLOUD_APP_PASSWORD=$APP_PASS"
  echo "   (adicionar ao .env)"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Nextcloud Mail configurado!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Importar chave PGP no Nextcloud Mail (UI)"
echo "   2. Testar envio de email em cloud.ncfn.net"
echo "   3. Verificar DKIM/SPF/DMARC com: https://mxtoolbox.com"
echo "═══════════════════════════════════════════════════════"
