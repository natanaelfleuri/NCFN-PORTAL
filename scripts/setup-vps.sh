#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Portal NCFN — Script de Hardening da VPS
# Executar como root na VPS ANTES de subir os containers
#
# Uso: sudo bash scripts/setup-vps.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }
info() { echo -e "${BLUE}[→]${NC} $*"; }

# Verificar root
if [ "$EUID" -ne 0 ]; then
    err "Execute como root: sudo bash scripts/setup-vps.sh"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Portal NCFN — Hardening de Segurança VPS            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Atualizar sistema ──────────────────────────────────────────────────────
info "Atualizando pacotes do sistema..."
apt-get update -qq && apt-get upgrade -y -qq
log "Sistema atualizado"

# ── 2. Instalar ferramentas essenciais ────────────────────────────────────────
info "Instalando ferramentas de segurança..."
apt-get install -y -qq \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-listchanges \
    curl \
    wget \
    htop \
    logwatch \
    rkhunter \
    auditd \
    aide
log "Ferramentas instaladas"

# ── 3. Configurar Firewall (UFW) ──────────────────────────────────────────────
info "Configurando firewall UFW..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH (ALTERE a porta se você mudou a padrão)
SSH_PORT=${SSH_PORT:-22}
ufw allow "$SSH_PORT/tcp" comment "SSH"

# HTTP e HTTPS (Caddy)
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw allow 443/udp comment "HTTPS QUIC/HTTP3"

# Bloquear acesso direto aos containers (portas internas)
# Portal não deve ser acessível diretamente na VPS
ufw deny 3000/tcp comment "Portal (somente via Caddy)"
ufw deny 3002/tcp comment "Portal dev (bloqueado em prod)"

# Ollama (apenas localhost)
ufw deny 11434/tcp comment "Ollama (apenas host-gateway)"

ufw --force enable
log "UFW configurado. Portas abertas: $SSH_PORT (SSH), 80, 443"
ufw status verbose

# ── 4. Configurar Fail2ban ────────────────────────────────────────────────────
info "Configurando Fail2ban..."

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Banir por 1 hora após 5 tentativas em 10 minutos
bantime  = 3600
findtime = 600
maxretry = 5
backend  = auto
ignoreip = 127.0.0.1/8 ::1

# Email de notificação (opcional)
# destemail = admin@ncfn.net
# sender    = fail2ban@ncfn.net

[sshd]
enabled  = true
port     = ssh
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 3
bantime  = 86400    # 24h para SSH

[caddy-auth]
enabled  = true
filter   = caddy-auth
logpath  = /var/log/caddy/ncfn_access.log
maxretry = 10
findtime = 300
bantime  = 3600
EOF

# Filtro para Caddy (tentativas de login)
cat > /etc/fail2ban/filter.d/caddy-auth.conf << 'EOF'
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"uri":"/api/auth/.*"status":40[13].*$
ignoreregex =
EOF

systemctl enable fail2ban
systemctl restart fail2ban
log "Fail2ban configurado"

# ── 5. Hardening SSH ──────────────────────────────────────────────────────────
info "Aplicando hardening SSH..."

SSHD_CONFIG="/etc/ssh/sshd_config"
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak.$(date +%Y%m%d)"

# Configurações seguras
cat > /etc/ssh/sshd_config.d/99-ncfn-hardening.conf << EOF
# NCFN SSH Hardening
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
MaxAuthTries 3
MaxSessions 5
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitEmptyPasswords no
UsePAM yes
Protocol 2
EOF

# Testar configuração antes de reiniciar
if sshd -t 2>/dev/null; then
    systemctl reload sshd
    log "SSH hardening aplicado"
else
    warn "Configuração SSH inválida — revertendo para backup"
    cp "${SSHD_CONFIG}.bak.$(date +%Y%m%d)" "$SSHD_CONFIG"
fi

# ── 6. Configurar atualizações automáticas de segurança ──────────────────────
info "Configurando atualizações automáticas..."

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Download-Upgradeable-Packages "1";
EOF

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Mail "root";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

log "Atualizações automáticas de segurança configuradas"

# ── 7. Hardening Docker Daemon ────────────────────────────────────────────────
info "Configurando Docker daemon..."

mkdir -p /etc/docker

cat > /etc/docker/daemon.json << 'EOF'
{
    "icc": false,
    "no-new-privileges": true,
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "5"
    },
    "live-restore": true,
    "userland-proxy": false,
    "experimental": false,
    "max-concurrent-downloads": 3,
    "max-concurrent-uploads": 5
}
EOF

systemctl reload docker 2>/dev/null || systemctl restart docker
log "Docker daemon configurado com 'icc: false' e 'no-new-privileges'"

# ── 8. Configurar sysctl (kernel hardening) ───────────────────────────────────
info "Aplicando hardening do kernel..."

cat > /etc/sysctl.d/99-ncfn-hardening.conf << 'EOF'
# Proteção contra IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Desativar IP source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Desativar ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Proteção contra SYN flood
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# Log de pacotes suspeitos
net.ipv4.conf.all.log_martians = 1

# Ignorar ICMP broadcast
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Proteção contra buffer overflow em /proc
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2

# Desativar IPv6 se não usado (opcional)
# net.ipv6.conf.all.disable_ipv6 = 1
EOF

sysctl -p /etc/sysctl.d/99-ncfn-hardening.conf > /dev/null 2>&1
log "Hardening do kernel aplicado"

# ── 9. Configurar limites de sistema ──────────────────────────────────────────
info "Configurando limites de sistema..."

cat >> /etc/security/limits.conf << 'EOF'
# NCFN Portal — limitar recursos por processo
* soft nofile 65536
* hard nofile 65536
* soft nproc  8192
* hard nproc  16384
EOF

log "Limites de sistema configurados"

# ── 10. Configurar logrotate para logs do Caddy ───────────────────────────────
info "Configurando logrotate para Caddy..."

mkdir -p /var/log/caddy

cat > /etc/logrotate.d/caddy-ncfn << 'EOF'
/var/log/caddy/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker kill --signal=USR1 caddy_ncfn 2>/dev/null || true
    endscript
}
EOF

log "Logrotate configurado"

# ── 11. Criar cron de monitoramento ──────────────────────────────────────────
info "Configurando monitoramento básico..."

cat > /etc/cron.d/ncfn-monitor << 'EOF'
# Portal NCFN — Monitoramento
# Verificar se containers estão rodando a cada 5 minutos
*/5 * * * * root docker compose -f /home/roaaxxz/docker/portal_ncfn/docker-compose.prod.yml ps --quiet 2>/dev/null | wc -l | xargs -I{} sh -c 'test {} -lt 2 && echo "ALERTA: Containers NCFN offline" | logger -t ncfn-monitor'

# Verificar espaço em disco diariamente
@daily root df -h / | awk 'NR==2 {if ($5+0 > 85) print "ALERTA DISCO: " $5 " usado"}' | logger -t ncfn-monitor
EOF

log "Monitoramento configurado"

# ── 12. Instalar Watchdog como systemd timer ─────────────────────────────────
info "Instalando ncfn-watchdog como systemd timer..."

SCRIPTS_DIR="/home/roaaxxz/docker/portal_ncfn/scripts"

# Permissão de execução
chmod +x "$SCRIPTS_DIR/ncfn-watchdog.sh"
chmod +x "$SCRIPTS_DIR/ncfn-deploy.sh"

# Instalar units do systemd
cp "$SCRIPTS_DIR/ncfn-watchdog.service" /etc/systemd/system/ncfn-watchdog.service
cp "$SCRIPTS_DIR/ncfn-watchdog.timer"   /etc/systemd/system/ncfn-watchdog.timer

systemctl daemon-reload
systemctl enable --now ncfn-watchdog.timer

log "Watchdog instalado: verifica containers a cada 60s"
info "Logs do watchdog: journalctl -u ncfn-watchdog -f"

# Remover cron básico antigo (substituído pelo timer)
rm -f /etc/cron.d/ncfn-monitor
log "Cron básico removido — watchdog systemd assumiu o controle"

# ── 13. Resumo final ──────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Hardening Concluído!                                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
log "UFW firewall: ATIVO"
log "Fail2ban: ATIVO"
log "SSH hardening: APLICADO (apenas chave pública)"
log "Docker daemon: HARDENED"
log "Kernel: HARDENED"
log "Atualizações automáticas: ATIVAS"
log "Watchdog systemd: ATIVO (60s interval, auto-restart, liveness probes)"
echo ""
warn "PRÓXIMOS PASSOS MANUAIS:"
echo "  1. Adicionar sua chave pública SSH: ssh-copy-id user@vps"
echo "  2. Testar login SSH com chave ANTES de fechar a sessão atual"
echo "  3. Verificar .env: DEV_BYPASS=false e secrets fortes"
echo "  4. Executar: bash scripts/fix-permissions.sh"
echo "  5. Subir containers: docker compose -f docker-compose.prod.yml up -d --build"
echo "  6. Deploy futuro sem downtime: bash scripts/ncfn-deploy.sh"
echo "  7. Ver logs do watchdog: journalctl -u ncfn-watchdog -f"
echo ""
warn "ATENÇÃO: SSH agora exige autenticação por chave pública!"
warn "Certifique-se de ter sua chave configurada antes de reiniciar o serviço SSH."
