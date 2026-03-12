#!/bin/sh
# Portal NCFN — Entrypoint de Produção
set -e

echo "[NCFN] Iniciando Portal NCFN..."
echo "[NCFN] Node: $(node --version) | NPM: $(npm --version)"

# Aplicar migrations do banco de dados
echo "[NCFN] Aplicando schema Prisma..."
npx prisma db push --skip-generate 2>&1 | grep -v "^$" || {
    echo "[NCFN] ERRO: Falha ao aplicar schema Prisma"
    exit 1
}

echo "[NCFN] Schema OK. Iniciando servidor Next.js..."
exec npm start
