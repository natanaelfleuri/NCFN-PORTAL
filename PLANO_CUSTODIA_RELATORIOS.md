# Plano: Custódia de Arquivos e Ciclo de Relatórios

**Criado em:** 2026-03-22
**Execução prevista:** 2026-03-24 (terça-feira)

---

## CONTEXTO E REGRAS DE NEGÓCIO

Durante toda a custódia de um arquivo no sistema NCFN existem **3 relatórios**:

| # | Nome | Gatilho | Onde fica | Ciclo de vida |
|---|------|---------|-----------|---------------|
| 1 | RELATÓRIO INICIAL | Caixa de custódia fechada (upload) | /admin/cofre | Permanente, somente leitura |
| 2 | RELATÓRIO INTERMEDIÁRIO | Botão em /vault · step 1 (após 2h da custódia) | /admin/laudo-forense | Permanente (ZIP do arquivo) |
| 3 | RELATÓRIO FINAL | Botão em /vault · step 3 (após 2h da encriptação) | /admin/laudo-forense | Auto-delete 5h após geração |

---

## FASE A — Admin page: mover LOG'S DE SESSÃO para grupo SISTEMA

**Arquivo:** `app/app/admin/page.tsx`

### O que fazer:
1. Na linha 104, alterar `...D` para `...S` (de azul para ciano)
   ```ts
   // ANTES
   { href: '/admin/logs', icon: Database, label: "LOG'S DE SESSÃO", ...D },
   // DEPOIS
   { href: '/admin/logs', icon: Database, label: "LOG'S DE SESSÃO", ...S },
   ```
2. Atualizar `FILTER_SETS` para mover o índice do item `logs` do grupo DOCUMENTOS para SISTEMA.
   - Índice atual de `/admin/logs` no array MODULES = 15 (linha 104, posição 0-indexada)
   - Remover 15 de `'DOCUMENTOS'`, adicionar a `'SISTEMA'`

> Verificar: contar posição exata de cada item no array MODULES para acertar os índices em FILTER_SETS.

---

## FASE B — Banco de Dados: novos modelos Prisma

**Arquivo:** `app/prisma/schema.prisma`

### Novo modelo: `FileCustodyState`
Rastreia o ciclo de vida de cada arquivo por (folder, filename).

```prisma
model FileCustodyState {
  id                      String    @id @default(cuid())
  folder                  String
  filename                String

  // T0 — custódia inicial (quando a caixa flutuante é fechada)
  custodyStartedAt        DateTime

  // Relatório Inicial
  initialReportId         String?   // ID do LaudoForense tipo 'inicial'
  initialReportAt         DateTime?

  // Relatório Intermediário (disponível após 2h de custodyStartedAt)
  intermediaryReportId    String?   // ID do LaudoForense tipo 'intermediario'
  intermediaryReportAt    DateTime?
  intermediaryReportDone  Boolean   @default(false)

  // Encriptação (step 2 do vault)
  encryptedAt             DateTime?

  // Relatório Final (disponível após 2h de encryptedAt)
  finalReportId           String?   // ID do LaudoForense tipo 'final'
  finalReportAt           DateTime?
  finalReportExpiresAt    DateTime? // finalReportAt + 5h → auto-delete

  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  @@unique([folder, filename])
}
```

### Alterar modelo: `LaudoForense`
Adicionar campos `reportType`, `folder` e `filename`:

```prisma
model LaudoForense {
  // ... campos existentes ...
  reportType  String  @default("manual") // manual | inicial | intermediario | final
  folder      String?
  filename    String?
}
```

### Após editar schema:
```bash
cd app && npx prisma migrate dev --name add_custody_state_and_report_type
```

---

## FASE C — API Routes novas/alteradas

### 1. `POST /api/vault/custody-state` ← NOVO
**Arquivo:** `app/api/vault/custody-state/route.ts`

Actions:
- `get` — retorna `FileCustodyState` para (folder, filename)
- `create` — cria custódia inicial (T0), aciona geração do Relatório Inicial
- `mark_intermediary_done` — registra que relatório intermediário foi gerado
- `mark_encrypted` — registra `encryptedAt`
- `mark_final_done` — registra relatório final + `finalReportExpiresAt = now + 5h`

### 2. Alterar `POST /api/vault/custody-report` (ou `/api/admin/laudo-forense`)
Adicionar suporte a `action: "generate_inicial" | "generate_intermediario" | "generate_final"`.

Para cada tipo, montar o relatório com base nas regras:
- `inicial`: leitura do arquivo no momento T0 (hash, metadados, entropia, etc.)
- `intermediario`: base = Relatório Inicial + leitura atual → comparar → registrar inconformidades
- `final`: base = Relatório Intermediário + leitura atual → comparar → registrar descarte

### 3. Job de auto-delete: lazy no GET `/api/admin/laudo-forense`
- Buscar `LaudoForense` onde `reportType='final'` e `finalReportExpiresAt < now`
- Deletar registros e arquivos PDF correspondentes
- Executar como verificação lazy no GET (e opcionalmente via setInterval no servidor)

---

## FASE D — VaultClient: nova lógica de UI

**Arquivo:** `app/components/VaultClient.tsx`

### Estado novo por arquivo selecionado:
```ts
interface CustodyState {
  custodyStartedAt: Date | null
  initialReportAt: Date | null
  intermediaryReportDone: boolean
  intermediaryReportAt: Date | null
  encryptedAt: Date | null
  finalReportAt: Date | null
  finalReportExpiresAt: Date | null
}
```

### Step 1 — "Relatório / Perícia"

```
SE custodyStartedAt == null:
  → Mostrar caixa de custódia (como já existe)
  → Ao fechar a caixa:
      1. Salvar custodyStartedAt = now
      2. POST /api/vault/custody-state { action: 'create', folder, filename }
      3. POST /api/vault/custody-report { action: 'generate_inicial', folder, filename }
      4. Salvar initialReportId no FileCustodyState

SE custodyStartedAt != null E intermediaryReportDone == false:
  minutosPassados = (now - custodyStartedAt) / 60000
  SE minutosPassados < 120:
    → Mostrar botão DESABILITADO + barra de progresso (minutosPassados/120 * 100%)
    → Texto: "Disponível em Xmin Ys"
  SE minutosPassados >= 120:
    → Mostrar botão HABILITADO "GERAR RELATÓRIO INTERMEDIÁRIO"
    → Ao clicar:
        1. POST /api/vault/custody-report { action: 'generate_intermediario', folder, filename }
        2. POST /api/vault/custody-state { action: 'mark_intermediary_done', folder, filename }
        3. Esconder este campo (intermediaryReportDone = true)

SE intermediaryReportDone == true:
  → Este campo não renderiza mais
```

### Step 2 — "Encriptar"

```
SE encryptedAt != null:
  → Não renderizar este step
  → Botão ENCRIPTAR hidden/disabled

SE encryptedAt == null:
  → Renderizar normalmente
  → Ao encriptar com sucesso:
      1. POST /api/vault/custody-state { action: 'mark_encrypted', folder, filename }
      2. Esconder este campo
```

### Steps finais — após intermediaryReportDone == true E encryptedAt != null

Apenas exibir:
- [CUSTÓDIA LOCAL - BACKUP]
- [DISPONIBILIZAR PARA TERCEIROS]
- [PUBLICAR NA VITRINE]
- [RELATÓRIO FINAL DE CUSTÓDIA E DESCARTE DO VESTÍGIO] ← novo botão

### Novo botão: RELATÓRIO FINAL

```
SE encryptedAt != null E finalReportAt == null:
  minutosPassados = (now - encryptedAt) / 60000
  SE minutosPassados < 120:
    → Botão DESABILITADO + barra de progresso (minutosPassados/120 * 100%)
    → Texto: "Disponível em Xmin Ys"
  SE minutosPassados >= 120:
    → Botão HABILITADO "RELATÓRIO FINAL DE CUSTÓDIA E DESCARTE DO VESTÍGIO"
    → Ao clicar:
        1. POST /api/vault/custody-report { action: 'generate_final', folder, filename }
        2. POST /api/vault/custody-state { action: 'mark_final_done', folder, filename }
        3. Mostrar confirmação + link para /admin/laudo-forense

SE finalReportAt != null:
  → Mostrar link para /admin/laudo-forense
  → Mostrar countdown: tempo restante até finalReportExpiresAt
```

---

## FASE E — Conteúdo dos Relatórios (PDF via pdf-lib)

### Relatório Inicial
- **Título:** `RELATÓRIO INICIAL`
- **Conteúdo:** Hash SHA-256, tamanho, timestamps (mtime/atime/ctime), tipo MIME, metadados EXIF (se imagem/vídeo), entropia estimada, path no vault, operador, data/hora T0
- **Saved to:** /admin/cofre (LaudoForense.reportType = 'inicial')
- **Acesso:** somente leitura em /admin/cofre

### Relatório Intermediário CONSOLIDADO
- **Título:** `RELATÓRIO INICIAL E RELATÓRIO INTERMEDIÁRIO CONSOLIDADO`
- **Base:** conteúdo do Relatório Inicial + leitura atual do arquivo
- **Comparação:** hash atual vs hash inicial → íntegro ou alterado; listar todas as diferenças; efeitos sobre autenticidade, disponibilidade, integridade
- **Última página:** gráficos do arquivo gerados em /admin/cofre
- **Saved to:** /admin/laudo-forense (LaudoForense.reportType = 'intermediario')
- **ZIP:** versão impressão disponível dentro do .zip do arquivo

### Relatório Final CONSOLIDADO
- **Título:** `RELATÓRIO FINAL CONSOLIDADO - ARQUIVO E LOGS DESCARTADOS DO NCFN`
- **Base:** conteúdo do Relatório Intermediário + leitura atual do arquivo
- **Comparação:** hash atual vs hash intermediário → diferenças; efeitos sobre autenticidade, disponibilidade, integridade; declaração de descarte
- **Última página:** novos achados + gráficos atualizados do /admin/cofre
- **Saved to:** /admin/laudo-forense (LaudoForense.reportType = 'final')
- **Auto-delete:** 5 horas após finalReportAt → excluir PDF + registro do DB

---

## FASE F — /admin/laudo-forense: filtros por tipo

**Arquivo:** `app/app/admin/laudo-forense/page.tsx`

- Adicionar filtro: `Todos | Inicial | Intermediário | Final`
- Relatórios `inicial`: badge "SOMENTE LEITURA", redirecionar para /admin/cofre
- Relatórios `final`: mostrar countdown até expiração
- Relatórios `final` expirados: removidos pelo job de cleanup (lazy no GET)

---

## FASE G — /admin/cofre: exibir Relatório Inicial

**Arquivo:** `app/app/admin/cofre/page.tsx`

- Ao selecionar um arquivo, verificar se existe `FileCustodyState`
- Se sim, mostrar botão "Ver Relatório Inicial" → abre PDF inline
- Badge "SOMENTE LEITURA — RELATÓRIO INICIAL" no topo do PDF

---

## ORDEM DE IMPLEMENTAÇÃO

```
1.  [FASE A]  Admin page: mover LOG'S DE SESSÃO → grupo SISTEMA           ~15min
2.  [FASE B]  Schema Prisma: FileCustodyState + reportType                 ~20min + migrate
3.  [FASE C1] API: /api/vault/custody-state (CRUD básico)                  ~45min
4.  [FASE C2] API: generate_inicial                                        ~30min
5.  [FASE D1] VaultClient: T0 + caixa custódia → Relatório Inicial         ~45min
6.  [FASE D2] VaultClient: timer 2h + botão Relatório Intermediário        ~30min
7.  [FASE C3] API: generate_intermediario (comparação de hashes)           ~45min
8.  [FASE D3] VaultClient: lógica pós-encriptação                         ~20min
9.  [FASE D4] VaultClient: timer 2h + botão Relatório Final               ~30min
10. [FASE C4] API: generate_final (comparação + declaração descarte)       ~45min
11. [FASE C5] API: lazy delete relatórios finais expirados (5h)           ~30min
12. [FASE E]  PDF: templates dos 3 relatórios (pdf-lib)                   ~60min
13. [FASE F]  laudo-forense: filtros por tipo + countdowns                ~30min
14. [FASE G]  cofre: exibir Relatório Inicial                              ~20min
```

**Total estimado:** ~7 horas de implementação

---

## ARQUIVOS QUE SERÃO MODIFICADOS

| Arquivo | Operação |
|---------|----------|
| `app/prisma/schema.prisma` | Adicionar `FileCustodyState`, campos `reportType/folder/filename` ao `LaudoForense` |
| `app/app/admin/page.tsx` | `LOG'S DE SESSÃO`: D→S, atualizar FILTER_SETS |
| `app/components/VaultClient.tsx` | Lógica completa do ciclo de vida |
| `app/api/vault/custody-state/route.ts` | **NOVO** |
| `app/api/vault/custody-report/route.ts` | Adicionar actions de geração tipada |
| `app/app/admin/laudo-forense/page.tsx` | Filtros por tipo + countdown do relatório final |
| `app/app/admin/cofre/page.tsx` | Exibir Relatório Inicial ao selecionar arquivo |

---

## NOTAS TÉCNICAS

- **Countdown timer:** `useEffect` com `setInterval(1000)` + `useState` para live countdown no cliente
- **Barra de progresso:** `Math.min((minutosPassados / 120) * 100, 100)`
- **Auto-delete:** verificação lazy no GET de `/api/admin/laudo-forense` + opcional `setInterval` no servidor
- **Hash comparison:** usar `/api/vault/browse` (já calcula SHA-256) para leitura atual vs hash armazenado
- **PDF geração:** `pdf-lib` já instalado no projeto
- **Gráficos no PDF:** exportar canvas como base64 via `toDataURL()` e embedar no PDF
