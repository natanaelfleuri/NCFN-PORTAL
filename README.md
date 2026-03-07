# Portal de Documentos NCFN

Sistema centralizado para gestão, custódia e verificação de ativos digitais e evidências forenses.

## 🚀 Sobre o Projeto

Este portal foi desenvolvido para garantir a integridade e a cadeia de custódia de documentos digitais. Ele permite o armazenamento seguro, a geração automatizada de relatórios de custódia e a verificação de autenticidade através de hashes criptográficos.

### Principais Funcionalidades

- **Hub de Documentos:** Interface intuitiva para navegação em pastas de investigação e diretórios técnicos.
- **Relatórios Automatizados:** Geração de PDFs de Custódia com metadados forenses e registros de acesso.
- **Custódia Web:** Modelos otimizados para preservação de evidências coletadas na internet.
- **Segurança Forense:** Registro automático de IPs, timestamps e hashes para cada interação com arquivos.

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 14+ (App Router)
- **Estilização:** Tailwind CSS (Modern Dark Mode)
- **Banco de Dados:** SQLite com Prisma ORM
- **Infraestrutura:** Docker & Docker Compose
- **Proxy/SSL:** Caddy

## 📦 Como Rodar

### Pré-requisitos
- Docker e Docker Compose instalados.

### Passos
1. Clone este repositório.
2. Configure as variáveis de ambiente em um arquivo `.env` na pasta `app/` (veja o template do docker-compose).
3. Execute o comando:
   ```bash
   docker compose up --build -d
   ```
4. O portal estará disponível em `http://localhost:3000`.

## 🤝 Colaboração

Este repositório visa a colaboração técnica para melhorias no portal de documentos.
Investigações OSINT e códigos de IA (Moltbot) não estão incluídos neste repositório por questões de privacidade e segurança.

---
**Desenvolvido por NCFN Team**
