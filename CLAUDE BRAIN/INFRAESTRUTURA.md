# Infraestrutura NCFN

## Ambientes

| Ambiente | Host | Acesso |
| --- | --- | --- |
| **Desenvolvimento** | PC local (`roaaxxz`) | Docker Compose, porta 3002 |
| **Produção** | VPS `163.245.218.241` | k3s, namespace `ncfn` |
| **Segundo Cérebro** | `ncfn.ncfn.net` | PC local via Cloudflare Tunnel |

## Domínios e Tunnel

Tunnel ID: `e0423fdb-84ac-4b6c-8a73-0fa4a5765c43`

| Hostname | Destino | Status |
| --- | --- | --- |
| `ncfn.net` | `http://127.0.0.1:80` (Caddy) | ativo |
| `www.ncfn.net` | `http://127.0.0.1:80` (Caddy) | ativo |
| `ncfn.ncfn.net` | `http://127.0.0.1:3000` | PC local (segundo cérebro) |
| `cloud.ncfn.net` | `http://nextcloud:80` | **PENDENTE** |

Config tunnel: `/home/roaaxxz/docker/portal_ncfn/cloudflared/config.yml`

## Containers Ativos (PC local)

| Container | Porta | Função |
| --- | --- | --- |
| `portal_ncfn_dev` | 3002 | App Next.js 14 |
| `caddy_ncfn` | 80 | Reverse proxy |
| `ncfn_cloudflared` | host | Cloudflare Tunnel |
| `ncfn_ttyd` | 7681 | Terminal web |
| `ncfn_web_check` | 3005 | Web-check OSINT |
| `ncfn_postgres` | 5432 | PostgreSQL 16 (profile: postgres) |

## Containers Planejados

| Container | Porta | Função |
| --- | --- | --- |
| `ncfn_nextcloud` | 8080 | Nextcloud (cloud.ncfn.net) |
| `protonmail_bridge` | 1025/1143 | SMTP/IMAP bridge PGP |

## Storage

| Volume | Caminho Host | Caminho Container | Uso |
| --- | --- | --- | --- |
| `./COFRE_NCFN` | — | `/COFRE_NCFN` | Arquivos forenses |
| `./arquivos` | — | `/arquivos` | Uploads gerais, links-uteis.json |
| `./app/prisma/dev.db` | — | `/app/prisma/dev.db` | SQLite dev |
| `postgres_data` | Docker volume | `/var/lib/postgresql/data` | PostgreSQL |

## Secrets (.env, nunca commitar)

```
NEXTAUTH_SECRET, CRYPTO_SALT, JWT_SECRET, CRON_SECRET, MASTER_UNLOCK_KEY
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_APP_PASSWORD   # a adicionar
BRIDGE_SMTP_HOST, BRIDGE_SMTP_PORT, BRIDGE_SMTP_USER, BRIDGE_SMTP_PASS  # a adicionar
PGP_PRIVATE_KEY_ARMOR, PGP_PASSPHRASE                   # a adicionar
```

## Deploy

```bash
# Local: rebuild do container
docker compose up -d --build portal

# VPS: deploy completo
ssh root@163.245.218.241
cd /root/docker/portal_ncfn
git pull
docker build -t ncfn/portal:latest ./app
docker save ncfn/portal:latest | k3s ctr images import -
kubectl rollout restart deployment/portal -n ncfn
kubectl rollout status deployment/portal -n ncfn
```

## Caddy (Caddyfile)

Arquivo: `./Caddyfile`
Proxy principal: `portal:3000`
Recarregar: `docker exec caddy_ncfn caddy reload --config /etc/caddy/Caddyfile`

## CSP atual

Permite: `self`, `unsafe-inline/eval`, Cloudflare, Google Maps, OpenStreetMap, CartoDB, unpkg.com (Leaflet icons)
