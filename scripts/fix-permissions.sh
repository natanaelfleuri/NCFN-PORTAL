#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Portal NCFN — Correção de Permissões de Arquivos
# Executar a partir do diretório raiz do projeto
#
# Uso: bash scripts/fix-permissions.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

# Ir para o diretório do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Portal NCFN — Correção de Permissões                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Diretório: $PROJECT_DIR"
echo ""

# ── .env: apenas o dono pode ler ─────────────────────────────────────────────
if [ -f ".env" ]; then
    chmod 600 .env
    log ".env → 600 (somente dono pode ler/escrever)"
else
    warn ".env não encontrado — copie de .env.example e configure"
fi

# ── Scripts: executável apenas pelo dono ─────────────────────────────────────
if [ -f "scripts/setup-vps.sh" ]; then
    chmod 700 scripts/setup-vps.sh
    log "scripts/setup-vps.sh → 700"
fi
if [ -f "scripts/fix-permissions.sh" ]; then
    chmod 700 scripts/fix-permissions.sh
    log "scripts/fix-permissions.sh → 700"
fi
if [ -f "ncfn-sync.sh" ]; then
    chmod 700 ncfn-sync.sh
    log "ncfn-sync.sh → 700"
fi
if [ -f "rebuild-dev.sh" ]; then
    chmod 700 rebuild-dev.sh
    log "rebuild-dev.sh → 700"
fi
if [ -f "app/entrypoint.sh" ]; then
    chmod 700 app/entrypoint.sh
    log "app/entrypoint.sh → 700"
fi

# ── SQLite DB: removendo world-writable ──────────────────────────────────────
if [ -f "app/prisma/dev.db" ]; then
    chmod 640 app/prisma/dev.db
    log "app/prisma/dev.db → 640 (removido acesso global)"
fi
if [ -f "app/prisma/dev.db-shm" ]; then chmod 640 app/prisma/dev.db-shm; fi
if [ -f "app/prisma/dev.db-wal" ]; then chmod 640 app/prisma/dev.db-wal; fi

# ── COFRE_NCFN: remover world-write, manter leitura do grupo ─────────────────
if [ -d "COFRE_NCFN" ]; then
    find COFRE_NCFN -type d -exec chmod 750 {} \;
    find COFRE_NCFN -type f -exec chmod 640 {} \;
    log "COFRE_NCFN/ → dirs 750, files 640"
fi

# ── Arquivos de upload ────────────────────────────────────────────────────────
if [ -d "arquivos" ]; then
    find arquivos -type d -exec chmod 750 {} \;
    find arquivos -type f -exec chmod 640 {} \;
    log "arquivos/ → dirs 750, files 640"
fi

# ── Arquivos de configuração ──────────────────────────────────────────────────
for file in Caddyfile docker-compose.yml docker-compose.prod.yml; do
    if [ -f "$file" ]; then
        chmod 640 "$file"
        log "$file → 640"
    fi
done

# ── .git: proteger histórico ──────────────────────────────────────────────────
if [ -d ".git" ]; then
    chmod 700 .git
    log ".git/ → 700"
fi

# ── Verificar se .env está no .gitignore ─────────────────────────────────────
if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore || grep -q "^\.env" .gitignore; then
        log ".env está protegido pelo .gitignore"
    else
        warn ".env NÃO está no .gitignore — adicionando agora"
        echo "" >> .gitignore
        echo "# Secrets — NUNCA versionar" >> .gitignore
        echo ".env" >> .gitignore
        echo ".env.local" >> .gitignore
        echo ".env.production" >> .gitignore
        log ".env adicionado ao .gitignore"
    fi
fi

# ── Verificar secrets fracos no .env ─────────────────────────────────────────
if [ -f ".env" ]; then
    echo ""
    warn "Verificando configuração do .env..."

    check_var() {
        local VAR="$1"
        local MIN_LEN="${2:-16}"
        local VAL
        VAL=$(grep "^${VAR}=" .env | cut -d= -f2- | tr -d '"' | tr -d "'")
        if [ -z "$VAL" ]; then
            echo -e "  ${RED}[✗]${NC} $VAR → NÃO DEFINIDO"
        elif [ "${#VAL}" -lt "$MIN_LEN" ]; then
            echo -e "  ${YELLOW}[!]${NC} $VAR → muito curto (${#VAL} chars, mínimo $MIN_LEN)"
        else
            echo -e "  ${GREEN}[✓]${NC} $VAR → OK (${#VAL} chars)"
        fi
    }

    check_var "NEXTAUTH_SECRET" 32
    check_var "JWT_SECRET" 32
    check_var "CRYPTO_SALT" 16
    check_var "CRON_SECRET" 24
    check_var "NCFN_FORENSIC_SECRET" 16
    check_var "MASTER_UNLOCK_KEY" 32
    check_var "ADMIN_EMAIL" 5
    check_var "NEXTAUTH_URL" 10

    # Verificar DEV_BYPASS
    DEV_BYPASS_VAL=$(grep "^DEV_BYPASS=" .env | cut -d= -f2 | tr -d '"' | tr -d "'" | tr '[:upper:]' '[:lower:]')
    if [ "$DEV_BYPASS_VAL" = "true" ]; then
        echo -e "  ${RED}[✗]${NC} DEV_BYPASS=true → DESATIVAR EM PRODUÇÃO!"
        echo ""
        echo "  Execute: sed -i 's/DEV_BYPASS=true/DEV_BYPASS=false/' .env"
    else
        echo -e "  ${GREEN}[✓]${NC} DEV_BYPASS=false → OK para produção"
    fi
fi

# ── Resumo ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Permissões corrigidas!                               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Para gerar secrets fortes, use:"
echo "  NEXTAUTH_SECRET=\$(openssl rand -base64 32)"
echo "  JWT_SECRET=\$(openssl rand -base64 32)"
echo "  CRYPTO_SALT=\$(openssl rand -base64 16)"
echo "  CRON_SECRET=\$(openssl rand -hex 24)"
echo "  NCFN_FORENSIC_SECRET=\$(openssl rand -hex 16)"
echo "  MASTER_UNLOCK_KEY=\$(openssl rand -hex 32)"
echo ""
