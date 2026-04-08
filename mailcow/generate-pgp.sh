#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# NCFN — Gerador de Chaves PGP para o Portal
#
# Gera um par de chaves PGP e exporta no formato que o portal usa.
# Executar após instalar o Mailcow e criar a caixa noreply@ncfn.net
#
# Uso: bash mailcow/generate-pgp.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

EMAIL="${1:-noreply@ncfn.net}"
NAME="${2:-NCFN Portal}"
PASSPHRASE="${3:-$(openssl rand -base64 24)}"
OUTPUT_DIR="./mailcow/pgp-keys"

mkdir -p "$OUTPUT_DIR"

echo ""
echo "🔑 Gerando par de chaves PGP..."
echo "   Email:  $EMAIL"
echo "   Nome:   $NAME"
echo ""

# Verificar se gpg está disponível
if ! command -v gpg &> /dev/null; then
  echo "📦 Instalando gnupg..."
  apt-get install -y gnupg 2>/dev/null || brew install gnupg 2>/dev/null
fi

# Gerar chave com batch (não-interativo)
BATCH_FILE=$(mktemp)
cat > "$BATCH_FILE" <<EOF
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: $NAME
Name-Email: $EMAIL
Expire-Date: 2y
Passphrase: $PASSPHRASE
%commit
EOF

gpg --batch --gen-key "$BATCH_FILE"
rm "$BATCH_FILE"

# Obter fingerprint da chave gerada
FINGERPRINT=$(gpg --list-keys --with-colons "$EMAIL" 2>/dev/null | awk -F: '/^fpr:/ {print $10; exit}')

if [ -z "$FINGERPRINT" ]; then
  echo "❌ Erro: não foi possível encontrar a chave gerada"
  exit 1
fi

echo "✅ Chave gerada: $FINGERPRINT"

# Exportar chave pública (armored)
PUBLIC_KEY_FILE="$OUTPUT_DIR/ncfn_public.asc"
gpg --armor --export "$EMAIL" > "$PUBLIC_KEY_FILE"
echo "📤 Chave pública: $PUBLIC_KEY_FILE"

# Exportar chave privada (armored) — protegida pela passphrase
PRIVATE_KEY_FILE="$OUTPUT_DIR/ncfn_private.asc"
gpg --armor --export-secret-keys "$EMAIL" > "$PRIVATE_KEY_FILE"
echo "🔒 Chave privada: $PRIVATE_KEY_FILE"
chmod 600 "$PRIVATE_KEY_FILE"

# Gerar env vars para o .env do portal
ENV_FILE="$OUTPUT_DIR/pgp.env"
PRIVATE_KEY_SINGLE=$(gpg --armor --export-secret-keys "$EMAIL" | awk '{printf "%s\\n", $0}')

cat > "$ENV_FILE" <<ENVEOF
# ── PGP Keys — Portal NCFN ──────────────────────────────────
# Copiar estas linhas para o .env do portal
PGP_PRIVATE_KEY_ARMOR="$(cat "$PRIVATE_KEY_FILE")"
PGP_PASSPHRASE="$PASSPHRASE"
PGP_KEY_EMAIL="$EMAIL"
PGP_KEY_FINGERPRINT="$FINGERPRINT"
ENVEOF

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Chaves PGP geradas com sucesso!"
echo ""
echo "📂 Arquivos em: $OUTPUT_DIR/"
echo "   ncfn_public.asc  → chave pública (publicar no keyserver)"
echo "   ncfn_private.asc → chave privada (MANTER SEGURO)"
echo "   pgp.env          → variáveis para o .env"
echo ""
echo "📋 Passphrase da chave privada:"
echo "   $PASSPHRASE"
echo "   (salve em local seguro)"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Copiar variáveis do pgp.env para o .env do portal"
echo ""
echo "2. Publicar chave pública (opcional):"
echo "   gpg --send-keys --keyserver keys.openpgp.org $FINGERPRINT"
echo ""
echo "3. Importar chave no Nextcloud Mail:"
echo "   Nextcloud → Mail → Configurações → Criptografia"
echo "   → Importar chave privada → conteúdo de ncfn_private.asc"
echo ""
echo "4. Importar chave no Mailcow (para verificação):"
echo "   Mailcow admin → Email Accounts → noreply@ncfn.net → PGP"
echo "   → Importar chave pública"
echo "═══════════════════════════════════════════════════════"
