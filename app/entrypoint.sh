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

echo "[NCFN] Schema OK."

# Seed OSINT sections (only runs if table is empty)
echo "[NCFN] Verificando seed OSINT..."
COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.osintSection.count().then(n => { console.log(n); p.\$disconnect(); });
" 2>/dev/null || echo "0")
if [ "$COUNT" = "0" ]; then
  echo "[NCFN] Populando seções OSINT..."
  npx tsx prisma/seed-osint.ts 2>&1 || echo "[NCFN] Seed OSINT ignorado (tsx não disponível)"
else
  echo "[NCFN] Seções OSINT já existem ($COUNT). Pulando seed."
fi

echo "[NCFN] Iniciando servidor Next.js..."
exec npm start
