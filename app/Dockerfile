# ═══════════════════════════════════════════════════════════════
# Portal NCFN — Dockerfile de Produção (Multi-stage)
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Dependências ────────────────────────────────────────
FROM node:18-alpine AS deps

# Instalar dependências de sistema necessárias para build
RUN apk add --no-cache \
    openssl \
    libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copiar e gerar Prisma Client (necessário antes do build)
COPY prisma ./prisma
RUN npx prisma generate

# ── Stage 2: Build ───────────────────────────────────────────────
FROM node:18-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copiar deps e sources (inclui devDeps necessários para next build)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copiar schema Prisma (client já gerado no stage deps)
COPY --from=deps /app/prisma ./prisma

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ── Stage 3: Runner (imagem mínima de produção) ──────────────────
FROM node:18-alpine AS runner

LABEL maintainer="Portal NCFN <ncfn@ncfn.net>"
LABEL org.opencontainers.image.title="Portal NCFN"
LABEL org.opencontainers.image.description="Nexus Cyber Forensic Network Portal"

# Ferramentas forenses + dependências de runtime
RUN apk add --no-cache \
    exiftool \
    file \
    openssl \
    ca-certificates \
    wget \
    && rm -rf /var/cache/apk/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não-root
RUN addgroup --system --gid 1001 ncfn && \
    adduser --system --uid 1001 --ingroup ncfn --shell /bin/sh portal

# Criar diretórios necessários com permissões corretas
RUN mkdir -p /app/prisma /app/public && \
    chown -R portal:ncfn /app

# Copiar build artifacts do estágio builder
COPY --from=builder --chown=portal:ncfn /app/.next ./.next
COPY --from=builder --chown=portal:ncfn /app/node_modules ./node_modules
COPY --from=builder --chown=portal:ncfn /app/package.json ./package.json
COPY --from=builder --chown=portal:ncfn /app/public ./public
COPY --from=builder --chown=portal:ncfn /app/prisma ./prisma
COPY --from=builder --chown=portal:ncfn /app/next.config.mjs ./next.config.mjs

# Copiar entrypoint
COPY --chown=portal:ncfn entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER portal

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health 2>/dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
