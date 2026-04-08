# Roadmap NCFN — Features Planejadas

Prioridade: 🔴 Crítico | 🟡 Alta | 🟢 Médio | ⚪ Baixo

---

## Bloco 1 — Infraestrutura de Armazenamento e Comunicação

| # | Feature | Prioridade | Status |
|---|---------|-----------|--------|
| 1.1 | Nextcloud (cloud.ncfn.net) | 🔴 | pendente |
| 1.2 | WebDAV integration (portal → NC) | 🔴 | pendente |
| 1.3 | ProtonMail Bridge container | 🟡 | pendente |
| 1.4 | Auto-email ao gerar laudo/relatório | 🟡 | pendente |
| 1.5 | Sync notas links-uteis ↔ Nextcloud | 🟢 | pendente |
| 1.6 | /admin/utilidades página | 🟡 | pendente |

---

## Bloco 2 — Autenticação e Segurança (pendências v4.2)

| # | Feature | Prioridade | Status |
|---|---------|-----------|--------|
| 2.1 | Rate limiting nas rotas vault/upload e vault/capture | 🔴 | pendente |
| 2.2 | UI WebAuthn — gerenciar devices em /profile | 🟡 | pendente |
| 2.3 | TOTP — fluxo re-verificação no login (2a etapa) | 🟡 | pendente |
| 2.4 | Session invalidation ao trocar senha | 🟢 | pendente |

---

## Bloco 3 — Investigação e OSINT

| # | Feature | Prioridade | Status |
|---|---------|-----------|--------|
| 3.1 | Integração web-check com casos do cofre | 🟡 | pendente |
| 3.2 | ChromaDB RAG jurídico (/api/rag) | 🟢 | pendente |
| 3.3 | Whisper transcrição de áudio em evidências | 🟢 | pendente |
| 3.4 | OSINT desktop (webtop Ubuntu XFCE) via /osint | ⚪ | container existe, perfil ativável |
| 3.5 | Captura Web → certificado TSA forense automático | 🟡 | pendente |

---

## Bloco 4 — Mapa Tático (Leaflet)

| # | Feature | Prioridade | Status |
|---|---------|-----------|--------|
| 4.1 | Importar/exportar operação KML/GeoJSON | 🟡 | pendente |
| 4.2 | Ícones Leaflet locais (sem unpkg.com) | 🟢 | pendente (workaround ativo) |
| 4.3 | Heatmap de atividade dos alvos | ⚪ | pendente |
| 4.4 | Geofence com notificação | ⚪ | pendente |
| 4.5 | Exportar PDF do mapa (html2canvas ou Puppeteer) | 🟢 | pendente |
| 4.6 | Sincronizar operação com Nextcloud | 🟢 | pendente (depende bloco 1) |

---

## Bloco 5 — Notas Obsidian (links-uteis)

| # | Feature | Prioridade | Status |
|---|---------|-----------|--------|
| 5.1 | Auto-save debounce 2s | ✅ | implementado `5c1564c` |
| 5.2 | Barra de formatação Markdown | ✅ | implementado `5c1564c` |
| 5.3 | Templates | ✅ | implementado `5c1564c` |
| 5.4 | Importar .md | ✅ | implementado `5c1564c` |
| 5.5 | Sync com Nextcloud WebDAV | 🟡 | pendente (depende bloco 1) |
| 5.6 | Tags nas notas | 🟢 | pendente |
| 5.7 | Backlinks (notas que referenciam outras) | ⚪ | pendente |
| 5.8 | Graph view (relações entre notas) | ⚪ | pendente |
| 5.9 | Busca full-text com highlight | 🟢 | pendente |
| 5.10 | Versioning / histórico de edições | ⚪ | pendente |

---

## Bloco 6 — Notificações e Alertas

| # | Feature | Prioridade | Status |
|---|---------|-----------|--------|
| 6.1 | SSE em tempo real para notificações | 🟡 | pendente |
| 6.2 | Dead Man Switch — auto-lockdown cron | 🟢 | pendente |
| 6.3 | Alerta ProtonMail em acesso suspeito | 🟡 | pendente (depende bridge) |
| 6.4 | Webhook saída para Telegram/Slack | ⚪ | pendente |

---

## Bloco 7 — Produção / DevOps

| # | Feature | Prioridade | Status |
|---|---------|-----------|--------|
| 7.1 | Migração SQLite → PostgreSQL (k3s prod) | 🔴 | pendente |
| 7.2 | Backup automático PostgreSQL para Nextcloud/R2 | 🟡 | pendente |
| 7.3 | Health checks mais robustos | 🟢 | pendente |
| 7.4 | Redis para rate limiting distribuído | 🟢 | container existe, perfil ativável |
| 7.5 | CI/CD (GitHub Actions → VPS deploy) | 🟢 | pendente |
| 7.6 | Monitoramento (Grafana + Prometheus) | ⚪ | pendente |

---

## Sugestões Avançadas Adicionais

### Integrações de Segurança
- **Canary tokens automáticos**: gerar tokens únicos por relatório que, quando acessados, alertam por email
- **Audit trail imutável**: assinar cada ação com TSA (já existe parcialmente) e armazenar hash no Nextcloud
- **Criptografia E2E de notas**: criptografar conteúdo de notas sensíveis com chave PGP antes de sincronizar com NC

### IA Forense
- **Análise automática de evidências**: ao fazer upload no cofre, enviar para Claude API para análise prévia
- **Geração de laudo assistida por IA**: Claude sugere estrutura e conclusões baseado nos metadados do caso
- **OCR de documentos**: Tesseract integrado para extrair texto de PDFs/imagens nas evidências

### Comunicação Segura
- **Sala de comunicação cifrada**: Signal Protocol ou Matrix/Element como canal de comunicação entre membros
- **Vault compartilhado**: poder compartilhar evidências específicas com chave de acesso temporária + link expirado
- **QR code para relatórios**: gerar QR com hash do laudo para verificação offline

### Interface
- **Dark/Light mode**: toggle de tema
- **Dashboard analytics**: métricas de uso do sistema, casos abertos/fechados, volume de evidências
- **Notifications center**: central de notificações com histórico
