

# A PRIMEIRA TAREFA É TORNAR AS 12 PASTAS QUE COMEÇAM COM NCFN as únicas pastas do sistema, se tiver em dois locais, apague de um e apenas um local com as 12 pastas sera mantido, e todas as funcionalidades das pastas terão como referência essas 12 pastas. 

## O VALT FORENSE EM https://ncfn.net/vault JÁ ESTÁ COM AS 12 PASTAS MAIS A PASTA 100, ESSAS SÃO AS PASTAS DO SISTEMA. COLOQUE AS FUNCIONALIDADES DE UPLOAD E AS DEMAIS FUNCIONALIDADES DAS PASTAS DO SISTEMA (FUNCIONALIDADES DAQUELAS PASTAS ANTIGAS DE 1 A 9)
 
# PÁGINA INICIAL 
https://ncfn.net/

**OBSERVAÇÃO IMPORTANTE: IMPLEMENTAR CONFORME A LÓGICA DO SISTEMA, CASO AS SUGESTÕES ABAIXO NÃO SEJAM VIÁVEIS OU INCOMPATÍVEIS COM A LÓGICA DO SISTEMA, IGNORAR E CONTINUAR**. 
## 📋 PROMPT DE DESENVOLVIMENTO: PÁGINA INICIAL NCFN (HUD & 6 NÍVEIS DE ACESSO COM DESCRIÇÕES)

> **ROLE:** Desenvolvedor Front-end Sênior (Especialista em Next.js 14, Tailwind CSS 3 e Framer Motion).
> 
> **OBJETIVO:** Desenvolver a página inicial  do sistema NCFN.NET, transformando-a em um painel "Heads-Up Display" (HUD) militarizado e forense com 6 níveis de credenciamento e descrições de público-alvo.
> 
> ## 1. Identidade Visual e Fundo (REFERÊNCIA: ADMIN PAGE)
> 
> A estética deve ser rigorosamente idêntica ao painel de Admin do sistema (Cyberpunk Limpo/Forense).
> 
> - **Background:** Fundo escuro (`bg-slate-950`). Implemente um componente de fundo absoluto (z-index negativo) que simule uma "chuva de dados hexadecimais" translúcida (estilo Matrix muito sutil, na cor cyan/slate) cobrindo a página inteira.
>     
> - **Glassmorphism:** Todos os cards, modais e painéis devem usar fundos semi-transparentes (`bg-slate-900/60`), `backdrop-filter: blur(12px)` e bordas muito finas (`border-slate-800` ou gradientes sutis dependendo do nível de acesso).
>     
> - **Tipografia:** Use fontes monoespaçadas (ex: `font-mono`, Fira Code ou Roboto Mono) para dados, métricas e rótulos de botões.
>     
> 
> ## 2. Estrutura da Página (Componentes Principais)
> 
> A página deve ser montada de forma coesa e concisa, contendo as seguintes seções:
> 
> ### A. Header & Título
> 
> - Título centralizado: `N E X U S C Y B E R F O R E N S I C N E T W O R K`
>     
> - Subtítulo em fonte menor com brilho: `CADEIA DE CUSTÓDIA E TRATAMENTO FORENSE EM DOCUMENTOS DIGITAIS PROBATÓRIOS.`
>     
> 
> ### B. Dashboard de Sistema (Cloudflare HUD)
> 
> - Crie um grid no topo exibindo o status da infraestrutura em tempo real (dados mockados animando com Framer Motion).
>     
> - **Métricas na tela:** > 1. "Status do Túnel" (com um anel circular animado/pulsante em verde neon: `ATIVO`).
>     
>     2. "Ameaças Bloqueadas (24h)" (contador numérico subindo).
>     
>     3. "Latência da Rede" (um gráfico do tipo _sparkline_ ou simulação de eletrocardiograma pulsando).
>     
> 
> ### C. Grid de Navegação de Páginas (Com Sistema de Cadeados)
> 
> - Crie um grid de cards interativos para navegação. Ao passar o mouse (`hover`), os cards devem ter um leve `scale` e a borda deve acender.
>     
> - **Páginas Públicas (Sem cadeado):** `Vitrine Pública`, `Base de Conhecimento`, `Auditoria`.
>     
> - **Páginas Restritas (Com cadeado):** `Configurações de IA`, `Gestão do Vault`, `Logs de Acesso`, `Lockdown do Servidor`.
>     
>     - _Regra de UI:_ O título do card restrito deve ter o ícone `Lock` (Lucide Icons) ao lado.
>         
>     - _Regra de Ação:_ Ao clicar em um card restrito, não redirecione. Mude o estado para exibir o "Modal de Acesso Negado" (detalhado abaixo).
>         
> 
> ### D. Painel de Planos e Níveis (6 Níveis de Credenciamento)
> 
> - Crie uma seção com um grid responsivo (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, contendo 2 linhas) com **6 cards verticais** demonstrando a hierarquia de acesso. Formate o texto de forma limpa, separando as "Features", o "Recomendado Para" e o "Por Quê".
>     
>     1. **Nível 0 (Acesso Público):** Borda azul/cyan sutil. Sem cadeado.
>         
>         - _Features:_ Captura Web Padrão e Testemunha Wayback Machine.
>             
>         - _Recomendado para:_ Cidadãos, vítimas de crimes cibernéticos comuns e jornalistas.
>             
>         - _Por quê:_ Ideal para preservar provas rápidas de redes sociais e sites com validade legal inicial, sem custo ou complexidade.
>             
>     2. **Nível 1 (Investigador):** Borda verde neon sutil. Sem cadeado.
>         
>         - _Features:_ Carimbo Blockchain (.ots) e Análise de Metadados (ExifTool).
>             
>         - _Recomendado para:_ Detetives particulares, pesquisadores OSINT e pequenos escritórios de advocacia.
>             
>         - _Por quê:_ Garante imutabilidade criptográfica via Blockchain, essencial para instrução processual básica e comprovação de integridade.
>             
>     3. **Nível 2 (Auditor Tático):** Borda amarela. Sem cadeado.
>         
>         - _Features:_ IA Local (Perito Sansão - Mistral) e Assinatura RFC 3161.
>             
>         - _Recomendado para:_ Advogados criminalistas, peritos judiciais independentes e auditores corporativos.
>             
>         - _Por quê:_ Oferece análise profunda com inteligência artificial isolada e carimbo de tempo oficial, criando laudos inatacáveis em tribunais.
>             
>     4. **Nível 3 (Comando Forense):** Borda laranja. **(Com Cadeado e texto da base ofuscado/borrado em CSS)**.
>         
>         - _Features:_ Infraestrutura Policial, VPS Isolada e Destruição Automática de Cache (Auto-Burn).
>             
>         - _Recomendado para:_ Forças policiais, delegacias de crimes cibernéticos e departamentos de compliance de grandes empresas.
>             
>         - _Por quê:_ Requer sigilo absoluto e infraestrutura isolada para lidar com inquéritos sigilosos e destruição imediata de rastros em memória.
>             
>     5. **Nível 4 (Forense de Elite):** Borda vermelha. **(Com Cadeado e texto da base ofuscado)**.
>         
>         - _Features:_ Processamento GPU Dedicado, Llama 3 Local, Detecção de Deepfake (ELA) e Custódia Fria.
>             
>         - _Recomendado para:_ Agências de inteligência, peritos criminais federais e laboratórios forenses avançados.
>             
>         - _Por quê:_ Exige altíssimo poder computacional para detectar manipulações complexas em imagens/vídeos e proteger materiais ultrasecretos offline.
>             
>     6. **Nível 5 (Administrador Nexus):** Borda roxa/efeito glitch. **(Com Cadeado vermelho e design mais agressivo)**.
>         
>         - _Features:_ Controle Absoluto de Instância, Lockdown de Servidor e Chaves Zero-Knowledge.
>             
>         - _Recomendado para:_ Arquitetos do sistema e Operadores Root da plataforma NCFN.
>             
>         - _Por quê:_ Acesso aos protocolos de emergência, gestão de criptografia mestre e encerramento total da rede em caso de ameaças críticas.
>             
> 
> ### E. Botão de Download (Mobile Sync)
> 
> - Na parte inferior central, crie o CTA principal: `[ >_ INSTALAR APLICATIVO NCFN SYNC ]`.
>     
> - **Efeito Scanning:** Use CSS para criar uma linha brilhante (gradiente cyan/branco) que varre o botão da esquerda para a direita a cada 4 segundos, simulando um scanner laser.
>     
> - **Ícones:** Adicione pequenos ícones da Apple e Android (`Apple`, `Smartphone` do Lucide) abaixo do botão.
>     
> 
> ## 3. O Modal de Segurança (Terminal de Acesso)
> 
> Se o usuário clicar em qualquer card restrito da navegação ou nos Níveis 3, 4 e 5, um Modal em overlay escuro (`z-50`, `backdrop-blur-md`) deve aparecer.
> 
> - **Estilo:** O modal deve parecer uma janela de terminal de comando (fundo preto sólido, texto verde-limão ou vermelho monoespaçado).
>     
> - **Texto exato na tela:** `ACESSO NEGADO: CREDENCIAMENTO DE SEGURANÇA NECESSÁRIO. REALIZE O LOGIN PARA ELEVAR SEUS PRIVILÉGIOS.` (com um cursor `_` piscando no final).
>     
> - Deve conter um botão estilizado `[ AUTENTICAR VIA PWA ]` ou a opção de fechar no canto superior (X).
>     
> 
> ## 4. Instruções de Saída
> 
> 1. Escreva o código completo do arquivo `app/page.tsx`.
>     
> 2. Use componentes client-side (`"use client";`) no topo do arquivo para permitir o uso do Framer Motion e controle de estado do Modal.
>     
> 3. Inclua todos os ícones necessários via `lucide-react` (ex: `Shield`, `Lock`, `Cpu`, `Globe`, `Terminal`, `Activity`, `Apple`, `Smartphone`).
>     
> 4. Entregue um código limpo, auto-contido no arquivo (crie os sub-componentes dentro dele mesmo para facilitar a cópia) e perfeitamente responsivo usando Tailwind. Não use dados lorem ipsum; use os textos fornecidos.

Documente o que for necesssário para a documentação do site.

---
___________
# VITRINE
https://ncfn.net/vitrine

**OBSERVAÇÃO IMPORTANTE: IMPLEMENTAR CONFORME A LÓGICA DO SISTEMA, CASO AS SUGESTÕES ABAIXO NÃO SEJAM VIÁVEIS OU INCOMPATÍVEIS COM A LÓGICA DO SISTEMA, IGNORAR E CONTINUAR**. 



## 📋 PROMPT DE DESENVOLVIMENTO: VITRINE PÚBLICA (DISTRIBUIÇÃO FORENSE)

(SUGESTÃO) CRIE UM CAMPO DE PESQUISA DE DOCUMENTOS PELO ID DO DOCUMENTO E OUTROS CONFORME A LÓGICA ABAIXO - OS ID'S ÚNICOS DE DOCUMENTOS SÃO GERADOS EM TODOS OS ARQUIVOS, PERÍCIAS E RELATÓRIOS (DIFERENCIADOS POR TIPO DE DOCUMENTO) 



> **ROLE:** Desenvolvedor Full Stack Sênior (Especialista em Next.js 14, Web Crypto API e Tailwind CSS).
> 
> **OBJETIVO:** Implementar a rota pública `/vitrine` e seus microsserviços no sistema NCFN.NET. Esta rota serve como o repositório público de ativos forenses autorizados, permitindo busca por hash, download certificado em ZIP e auditoria de acessos.
> 
> ## 1. Lógica de Banco de Dados e Backend (Prisma)
> 
> Atualize o `schema.prisma` para suportar a lógica de disponibilização e auditoria externa:
> 
> - **Tabela `ForensicAsset` (ou similar):**
>     
>     - Adicione `isPublic Boolean @default(false)`.
>         
>     - Adicione `shortLink String? @unique` (ex: `ncfn.net/v/a1b2c3d4`).
>         
>     - Adicione `downloadCount Int @default(0)`.
>         
> - **Tabela `PublicAccessLog` (Auditoria Externa):**
>     
>     - Campos: `id`, `assetId`, `ipAddress`, `userAgent`, `geoLoc`, `accessedAt`.
>         
> - **Lógica de Visibilidade:**
>     
>     - Implemente a query: $Visibilidade = \begin{cases} Privado, & \text{Padrão} \\ Público, & \text{Se Flag 'Vitrine' = True} \end{cases}$
>         
> 
> ## 2. Interface de Usuário (A Estética da Vitrine)
> 
> Siga o padrão Dark/Cyber e Glassmorphism (`bg-slate-950`, fundo com hexadecimais translúcidos, `backdrop-filter: blur(10px)`).
> 
> ### A. Header e Motor de Busca
> 
> - **Título:** `VITRINE PÚBLICA`.
>     
> - **Badge Superior:** `CANAL DE DISTRIBUIÇÃO FORENSE CERTIFICADA` (com ícone de globo/rede).
>     
> - **Subtítulo:** `REPOSITÓRIO PÚBLICO DE ATIVOS FORENSES AUTORIZADOS PELO PROTOCOLO NCFN – CADA ARQUIVO CARREGA CADEIA DE CUSTÓDIA VERIFICÁVEL, HASH SHA-256 E REGISTRO DE ACESSO PERMANENTE.`
>     
> - **Barra de Busca (`NCFN://QUERY_ENGINE`):** Barra larga, centralizada. Deve aceitar Strings (nome de pastas do Caso) ou Hashes SHA-256 exatos (64 caracteres). Se um hash exato for colado, o sistema deve contornar a busca e abrir o modal do arquivo instantaneamente.
>     
> 
> ### B. Área de Resultados e Status Verificado
> 
> - Se vazio, exiba o ícone de Lupa e o texto centralizado: `NENHUMA EVIDÊNCIA - Nenhum arquivo foi marcado como público para exibição na vitrine externa.`
>     
> - Se houver resultados (Cards de Ativos): Mostre o nome, pasta/caso, data e um selo verde brilhante com ícone de `ShieldCheck` contendo o texto **"Cadeia de Custódia Ativa"**.
>     
> 
> ### C. Ferramenta de Verificação Local (Drag-and-Drop)
> 
> - Crie um componente lateral ou flutuante: `[ VERIFICAR HASH LOCAL ]`.
>     
> - **Funcionalidade Estrita:** Uma zona de drop. Quando o usuário soltar um arquivo, use a `Web Crypto API` (`crypto.subtle.digest('SHA-256', buffer)`) para calcular o hash **no navegador**. Compare com os hashes públicos do banco. Retorne `MATCH (Verde)` ou `ALTERADO/NÃO ENCONTRADO (Vermelho)`.
>     
> 
> ## 3. Jornada de Download Certificado
> 
> Quando o usuário clica em um ativo para baixar, ele **não** faz o download direto. Ele entra no seguinte fluxo:
> 
> 1. **Página/Modal de Preview:** Exibe Nome, Tamanho real, Data de Lacramento, Hash SHA-256 (em fonte monoespaçada) e o Contador de Downloads.
>     
> 2. **Termo de Visualização (Pop-up):** Antes de liberar o botão final, exiba um checkbox: _"Declaro ciência de que este acesso, incluindo meu endereço IP e dados de conexão, será registrado permanentemente nos logs de cadeia de custódia da auditoria para fins legais."_
>     
> 3. **Geração do Pacote (Endpoint `/api/export-zip`):** Ao aceitar, o servidor deve compilar e enviar um arquivo `.zip` contendo:
>     
>     - O arquivo original intacto.
>         
>     - `certificado_imutabilidade.pdf` (gerado previamente).
>         
>     - `leia-me_verificacao.txt` (texto estático ensinando a usar o comando `certutil -hashfile arquivo SHA256` no Windows ou `sha256sum` no Linux).
>         
> 
> ## 4. Rodapé Jurídico
> 
> Fixe na parte inferior da tela, em fonte pequena e cor `slate-500`, o seguinte texto:
> 
> _"Os ativos listados nesta vitrine são protegidos por algoritmos de integridade SHA-256 e estão em conformidade com o protocolo NCFN de preservação de materialidade digital. A alteração de qualquer bit nos arquivos aqui disponibilizados invalidará automaticamente a prova para fins judiciais."_
> 
> ## Instruções de Saída
> 
> 4. Forneça o componente de UI da Vitrine (`app/vitrine/page.tsx`).
>     
> 5. Forneça o código do componente Client-Side do **Verificador de Hash Local via Drag and Drop** (`components/LocalHashVerifier.tsx`).
>     
> 6. Forneça o Server Action ou Rota de API (`/api/vitrine/download`) que registra o log de acesso (IP/User-Agent) e retorna o ZIP.
>     

### Consideração Tática

Esta implementação cobre a rastreabilidade completa. Toda vez que a defesa, a acusação ou o juiz baixarem a evidência da Vitrine, o seu sistema alimentará silenciosamente o **Painel de Interceptações/Auditoria** com o IP e a hora exata.

___________
___________

# POLÍTICA DE USO 
https://ncfn.net/politica

**OBSERVAÇÃO IMPORTANTE: IMPLEMENTAR CONFORME A LÓGICA DO SISTEMA, CASO AS SUGESTÕES ABAIXO NÃO SEJAM VIÁVEIS OU INCOMPATÍVEIS COM A LÓGICA DO SISTEMA, IGNORAR E CONTINUAR**. 

# 📋 PROMPT DE DESENVOLVIMENTO: TERMOS DE CUSTÓDIA DIGITAL E COMPLIANCE FORENSE

> **ROLE:** Desenvolvedor Front-end Sênior e Especialista em Legal-Tech UX (Next.js 14, Tailwind CSS 3).
> 
> **OBJETIVO:** Desenvolver a página de Termos e Políticas do sistema NCFN.NET. O texto foi expandido para um padrão jurídico internacional de perícia digital.
> 
> ## 1. Identidade Visual (Forense / Glassmorphism)
> 
> - **Background:** Fundo escuro profundo (`bg-slate-950`).
>     
> - **Estilo dos Cards:** A página deve exibir o texto não como um bloco maçante, mas dividido em **Cards de Sessão** com `backdrop-filter: blur(12px)`, `bg-slate-900/50` e bordas finas coloridas (cada sessão com uma cor de borda diferente para guiar a leitura: Azul, Verde, Amarelo, Vermelho e Roxo).
>     
> - **Tipografia:** Títulos em fonte Sans-serif em negrito; corpo do texto em tom `text-slate-300` com espaçamento de linha legível (`leading-relaxed`). Use fontes monoespaçadas para citar leis e termos técnicos (ex: `SHA-256`, `Lei 12.965/14`).
>     
> 
> ## 2. Conteúdo Textual (Copie exatamente o texto abaixo para os componentes)
> 
> ### Cabeçalho
> 
> - **Título:** `TERMOS DE CUSTÓDIA DIGITAL E COMPLIANCE JURÍDICO`
>     
> - **Subtítulo:** `PROTOCOLO DE OPERAÇÃO, RESPONSABILIDADE E CONFORMIDADE LEGAL — NEXUS CLOUD FORENSIC NETWORK`
>     
> 
> ### Seção 1: Natureza do Serviço e Conformidade Normativa (Borda Azul)
> 
> - **Ícone:** `Scale` (Balança da Justiça) ou `Globe`.
>     
> - **Texto:** > O NCFN é uma arquitetura de infraestrutura forense digital descentralizada (self-hosted). Sua engenharia de preservação foi desenhada em estrita observância a marcos regulatórios globais e nacionais, incluindo, mas não se limitando a:
>     
> - **Brasil:** Código de Processo Penal (Art. 158-A e seguintes - Cadeia de Custódia), Código de Processo Civil (Art. 369 e 411 - Provas Digitais), Marco Civil da Internet (Lei 12.965/14) e LGPD (Lei 13.709/18).
>     
> - **Internacional:** ISO/IEC 27037 (Diretrizes para identificação, coleta, aquisição e preservação de evidência digital), Convenção de Budapeste sobre o Cibercrime, Regulamento Geral de Proteção de Dados (GDPR - Europa) e os princípios das _Federal Rules of Evidence_ (FRE - EUA).
>     
>     Sendo um software de execução autônoma, as chaves criptográficas e dados são de posse exclusiva do administrador do nó, sem qualquer acesso, auditoria ou intervenção remota pelos desenvolvedores do protocolo original.
>     
> 
> ### Seção 2: Garantias da Captura Web Integrada NCFN (Borda Verde Neon)
> 
> - **Ícone:** `Crosshair` ou `Radar`.
>     
> - **Texto:** > Quando a evidência é coletada nativamente através do **Sistema Automatizado de Captura Web NCFN**, a plataforma atua como um agente isolado e autônomo. O sistema garante tecnologicamente:
>     
> - **Isolamento de Coleta:** O acesso ao alvo ocorre via infraestrutura de servidor (Headless), anulando contaminações provenientes do navegador ou dispositivo do usuário final.
>     
> - **Acondicionamento e Armazenamento:** Congelamento estrutural da página (DOM, CSS, Mídias) em arquivo estático único, armazenado em cofre criptografado (AES-256).
>     
> - **Levantamento de Dados Ocultos:** Extração automatizada de logs de rede (Tráfego HAR), metadados latentes, IPs de origem e resolução de DNS no exato milissegundo da captura.
>     
> - **Perícia Prévia Eletrônica e Veracidade:** Confirmação da disponibilidade pública da página no ambiente digital atestada por testemunhas de terceiros (Wayback Machine) e carimbo temporal descentralizado em Blockchain (OpenTimestamps / RFC 3161).
>     
> 
> ### Seção 3: Restrições e Limitações de Responsabilidade (Evidências Externas) (Borda Amarela)
> 
> - **Ícone:** `AlertTriangle`.
>     
> - **Texto:** > É imperativo distinguir a coleta nativa (operada pelo NCFN) de **arquivos inseridos manualmente (Uploads)** pelo usuário (ex: prints de tela prévios, áudios recebidos via mensageiros, documentos físicos digitalizados).
>     
>     Para capturas feitas _fora_ do sistema, o NCFN garante exclusivamente a **Imutabilidade Pós-Custódia**. O sistema certificará (via Hash SHA-256) que o arquivo não foi alterado _a partir do momento em que deu entrada no Vault_. O NCFN não garante, audita ou atesta que o arquivo externo estava livre de edições, montagens ou adulterações de metadados em momento anterior à sua inserção na plataforma. A defesa da higidez originária destes arquivos é de inteira responsabilidade do perito ou operador humano.
>     
> 
> ### Seção 4: Proibição Absoluta de Conteúdo Ilícito (Borda Vermelha)
> 
> - **Ícone:** `ShieldAlert`.
>     
> - **Texto:** > O usuário compromete-se incondicionalmente a NÃO armazenar, transmitir ou hospedar arquivos atrelados a crimes tipificados nas leis de seu país de residência, do país de hospedagem do servidor, bem como em tratados internacionais.
>     
>     É terminantemente proibido o uso desta arquitetura criptográfica para viabilizar, ocultar ou distribuir material de exploração infantil, terrorismo, narcotráfico, estelionato digital, malwares nocivos a infraestruturas críticas ou outras condutas criminosas severas. Em cenário de violações, o infrator afasta incondicionalmente os criadores deste _software livre_ de qualquer responsabilidade civil, penal ou solidariedade atrelada ao uso desviante do protocolo.
>     
> 
> ### Seção 5: Garantia de Custódia de Documentos e Segurança (Borda Roxa)
> 
> - **Ícone:** `LockKeyhole`.
>     
> - **Texto:** > O algoritmo NCFN garante a integridade matemática, o congelamento criptográfico, o versionamento à prova de adulteração (Hashes em Cadeia) e o rastreio de logs de sistema (Audit Trail).
>     
>     Contudo, a integridade física da custódia depende do ambiente de implantação. É de **responsabilidade indelegável do usuário/administrador** do sistema:
>     
> - A execução de rotinas de Backup (redundância de dados) das pastas de custódia.
>     
> - O resguardo do hardware do servidor contra ataques de Ransomware do Sistema Operacional hospedeiro.
>     
> - A guarda segura e sigilosa das chaves criptográficas (SALT e JWT Secrets). A perda das chaves resultará na irrecuperabilidade permanente das evidências custodiadas, não havendo mecanismo de _backdoor_ para recuperação por parte dos desenvolvedores originais.
>     
> 
> ### Rodapé de Aceite
> 
> - **Texto em Itálico:** _O aceite implícito e irrevogável destes Termos de Responsabilidade e Compliance é formalizado tecnicamente no momento em que o código e a arquitetura NCFN entram em execução (boot inicial) no ambiente de implantação do usuário final._
>     
> 
> ## 3. Instruções de Saída
> 
> 1. Escreva o código completo do arquivo `app/termos/page.tsx`.
>     
> 2. Use a biblioteca `lucide-react` para os ícones solicitados.
>     
> 3. Entregue um layout responsivo, limpo e com a gravidade visual que um documento jurídico forense exige. Utilize componentes de layout flexíveis (Flexbox/Grid) para distribuir os cards de forma elegante em telas grandes e empilhados em dispositivos móveis.
>     

---

### Resumo das Melhorias Adicionadas:

1. **Fundamentação Legal:** Citei as leis base que dão validade às provas (CPP 158-A sobre Cadeia de Custódia e CPC 411) além de normas globais (ISO 27037).
    
2. **Delimitação de Upload vs. Captura Nativa:** Expliquei de forma impecável para um juiz que o sistema _garante tudo_ se a captura for feita por ele, mas se for um upload, ele apenas congela o arquivo naquele estado (protegendo a plataforma de ser responsabilizada por um print de WhatsApp forjado por um cliente).
    
3. **Segurança e Backup:** Substituí a "ausência de garantias" genérica por uma explicação técnica madura: o código faz a parte dele (criptografia), mas o usuário tem que cuidar do hardware (backup, chaves, prevenção a ransomware).

__________________
____________________

# AUDITOR HASH
https://ncfn.net/auditor

# 📋 PROMPT DE DESENVOLVIMENTO: AUDITORIA DE INTEGRIDADE FORENSE (DUAL-MODE)

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Web Crypto API, Prisma ORM e Tailwind CSS). **OBJETIVO:** Refatorar a página de Auditoria de Integridade do sistema NCFN.NET para suportar dois modos distintos de aferição cruzada: Arquivos Custodiados (com auditoria de log) e Arquivos de Terceiros (modo anônimo e sem rastro).
> 
> ## 1. Interface de Usuário (Selector de Modo de Auditoria)
> 
> - Logo acima da área de "Drag and Drop" (onde o arquivo é solto), implemente um componente de **Toggle (Chave Seletora) ou Tabs** bem estilizado com estética Cyberpunk/Glassmorphism.
>     
> - **Opção A:** `ARQUIVO CUSTODIADO NO NCFN` (Cor ativa: Roxo ou Cyan).
>     
> - **Opção B:** `ARQUIVO DE TERCEIROS NÃO CUSTODIADO` (Cor ativa: Cinza/Neutro, indicando modo anônimo).
>     
> 
> ## 2. Lógica e UI do MODO A: ARQUIVO CUSTODIADO NO NCFN
> 
> Quando esta opção estiver ativa, o fluxo é:
> 
> 1. O usuário solta o arquivo e insere o Hash de Referência.
>     
> 2. O sistema calcula o Hash SHA-256 localmente (via `crypto.subtle.digest`).
>     
> 3. **Ação de Backend (API):** O sistema envia _apenas o Hash calculado e o Hash de Referência_ para uma rota `/api/audit/verify-custody`.
>     
> 4. **Banco de Dados (Prisma):** O backend verifica se o Hash existe na base. Sendo "Match" ou "Diverge", o sistema **obrigatoriamente** cria um registro na tabela `AuditLog` vinculada ao arquivo original, contendo: Timestamp, IP de quem auditou e o resultado da aferição.
>     
> 5. **UI Resultante:**
>     
>     - Mostre o card de SUCESSO (Verde) ou ALERTA CRÍTICO (Vermelho).
>         
>     - Exiba o texto: _"Verificação concluída. Status de cópia no sistema: [ENCONTRADA / NÃO ENCONTRADA]."_
>         
>     - Exiba um botão: `[ GERAR RELATÓRIO DE CONFORMIDADE (PDF) ]`. Este relatório deve conter o log da consulta recém-criado e o histórico geral do arquivo.
>         
> 
> ## 3. Lógica e UI do MODO B: ARQUIVO DE TERCEIROS (SOMENTE HASH)
> 
> Quando esta opção estiver ativa, o sistema entra em modo "Zero Network" (Air-Gapped no navegador).
> 
> 6. **Aviso Imediato na Tela:** Exiba um card informativo amarelo ou cinza com o texto exato: _"OBSERVAÇÃO: Arquivos de terceiros não custodiados pelo NCFN não são certificados pelo sistema, procedendo apenas com a conferência matemática do HASH disponibilizado por terceiros."_
>     
> 7. **Lógica:** O cálculo SHA-256 é feito estritamente no client-side. A comparação com o hash de referência é feita via JavaScript local.
>     
> 8. **Segurança e Privacidade:** É estritamente proibido disparar qualquer requisição de rede (`fetch` ou Server Actions) neste modo. Nenhum log, registro ou relatório deve ser gerado.
>     
> 9. **UI Resultante:** Mostre apenas o card de SUCESSO ou ALERTA CRÍTICO, sem botões de relatório.
>     
> 
> ## 4. Ajustes na "Arquitetura de Segurança" (Rodapé)
> 
> - Mantenha o texto atual explicando o processamento _In-Memory_, mas adicione um adendo dinâmico:
>     
> - Se **Modo A** ativo, adicione: _"O arquivo não sobe para o servidor, apenas sua assinatura algorítmica é transmitida para fins de registro no log imutável de auditoria da prova."_
>     
> - Se **Modo B** ativo, adicione: _"O processamento ocorre 100% no seu navegador (Client-Side). Nenhuma informação, byte ou metadado trafega pela rede, garantindo sigilo absoluto."_
>     
> 
> ## 5. Instruções de Saída
> 
> 1. Forneça o código atualizado do `app/auditoria/page.tsx`, utilizando `useState` para gerenciar as abas/modos e a `Web Crypto API` para os cálculos de hash.
>     
> 2. Forneça o código da API Route (`app/api/audit/verify-custody/route.ts`) que registra o log de consulta no Prisma.
>     
> 3. Assegure-se de que o visual respeite o design dark (`bg-slate-950`), com bordas arredondadas e as cores de alerta coerentes (verde limão/cyan para sucesso, vermelho neon para divergência).

UMA SUGESTÃO PARA O RELATÓRIO

## 1. Modelagem de Dados (schema.prisma)

Atualize o esquema do banco de dados para suportar a Trilha de Auditoria (Audit Trail) rigorosa. Adicione a seguinte modelagem:

Snippet de código

```
model AuditLog {
  id              String   @id @default(uuid())
  forensicAssetId String   // Referência ao arquivo custodiado
  actionType      String   // Ex: "AFERICAO_CRUZADA", "DOWNLOAD_VITRINE"
  providedHash    String   // O hash que o terceiro informou na auditoria
  calculatedHash  String   // O hash que o sistema calculou in-memory
  isMatch         Boolean  // true se os hashes baterem
  ipAddress       String?  // Coletado via headers (x-forwarded-for)
  userAgent       String?
  createdAt       DateTime @default(now())

  asset           ForensicAsset @relation(fields: [forensicAssetId], references: [id])
}
```

## 2. Geração do Relatório de Conformidade (PDF)

Crie um serviço ou Server Action que utilize `@react-pdf/renderer` para gerar um PDF dinâmico e seguro. O design do PDF deve ser austero, em tons de cinza escuro e branco, imitando um laudo pericial oficial.

### Estrutura Obrigatória do Documento (Layout do PDF):

**A. Cabeçalho (Header):**

- Logo do NCFN (alinhado à esquerda).
    
- Título centralizado: `RELATÓRIO DE CONFORMIDADE DE CUSTÓDIA DIGITAL`.
    
- Número de Controle: Gerar um UUID único para o relatório.
    
- Data/Hora da Emissão (Formato ISO 8601 UTC).
    

**B. Bloco 1: Identificação do Ativo Custodiado:**

- `Nome do Arquivo:` (ex: video_camera_01.mp4)
    
- `Pasta/Caso:` (ex: 01 - OPERACIONAL)
    
- `Data de Ingresso no Vault:` (Data em que foi salvo pela primeira vez).
    
- `Assinatura SHA-256 de Custódia:` (O Hash Master salvo no banco).
    

**C. Bloco 2: Resultado da Aferição Atual:**

- `Data/Hora da Auditoria:` (Momento exato da aferição).
    
- `Hash Fornecido pelo Auditor:` (O que foi digitado/calculado).
    
- `Veredito do Motor Criptográfico:`
    
    - Se `isMatch == true`: Exibir em verde "CONFORME - A assinatura diverge em 0 bytes. O arquivo testado é uma cópia idêntica ao custodiado."
        
    - Se `isMatch == false`: Exibir em vermelho "CRÍTICO: DESCONFORMIDADE - A assinatura testada não corresponde à evidência custodiada."
        

**D. Bloco 3: Trilha de Auditoria (Histórico de Logs):**

- Renderizar uma tabela minimalista listando as últimas 5 interações ou auditorias feitas neste arquivo (buscando da tabela `AuditLog`).
    
- Colunas da Tabela: `Data/Hora` | `Ação` | `Resultado (Match/Fail)` | `IP Registrado`.

INCLUIR TODAS AS DEMAIS INFORMAÇÕES POSSÍVEIS E NECESSÁRIAS. 

**E. Rodapé (Footer Jurídico):**

- Linha divisória.
    
- Texto em fonte tamanho 8pt: _"Este relatório foi gerado automaticamente pelo protocolo NCFN. A adulteração deste PDF invalida seu valor probatório. Valide a autenticidade deste documento e da evidência consultando a Vitrine Pública com o Hash de Custódia."_
    
- Página X de Y.
    

## 3. Integração na Interface (UI)

- Na página `app/auditoria/page.tsx`, após o usuário realizar a auditoria do "MODO A: ARQUIVO CUSTODIADO", o botão `[ BAIXAR RELATÓRIO DE CONFORMIDADE ]` deve aparecer.
    
- Ao clicar, o sistema deve invocar a rota de geração do PDF passando o ID do log recém-criado, e iniciar o download para o usuário final.
    
## Instruções de Saída:

1. Gere o código do componente de PDF usando os primitivos do `@react-pdf/renderer` (`<Document>`, `<Page>`, `<View>`, `<Text>`).
    
2. Gere o Server Action que insere o registro no Prisma e aciona a criação do PDF.
____________
_______________


# PERÍCIA TÉCNICA DE ARQUIVOS
https://ncfn.net/admin/pericia-arquivo

## Prompt de Implementação (Copie e Cole)

**Contexto do Sistema:** Você é um Desenvolvedor Full Stack Sênior trabalhando no sistema **NCFN.NET (Nexus Cloud Forensic Network)**. O objetivo é implementar o módulo de **Perícia Técnica de Arquivos** com foco em integridade imutável e análise forense automatizada.

**Stack Tecnológica:**

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Lucide Icons, Framer Motion (para animações de progresso).
    
- **Backend:** Node.js/Bun com Prisma ORM (SQLite WAL).
    
- **Segurança:** Criptografia AES-256-CBC, Hashing (SHA-256, MD5, SHA-1).
    
- **IA:** Integração via Ollama (endpoint local) para o "Perito Sansão".
    

**Tarefa Principal:** Refatorar a página de perícia para incluir as seguintes funcionalidades e componentes:

### 1. UI/UX e Estrutura de Navegação

- Alterar o título principal para **"Realizar Nova Perícia Individual"**.
    
- Adicionar um botão de ajuda `[COMO ESSA PÁGINA FUNCIONA]` ao lado do título (ícone `HelpCircle`).
    
- Implementar uma **Sidebar de Ações** à direita que contenha os botões: `[SALVAR]`, `[EXCLUIR]` e `[ADICIONAR RELATÓRIO]`.
    

### 2. Lógica de Processamento e Feedback (SSE)

- Implementar um componente de **Barra de Carregamento** que utilize **Server-Sent Events (SSE)** para mostrar o status real do processamento. Os estágios devem ser:
    
    1. `[Calculando Trilogia de Hashes (MD5, SHA1, SHA256)...]`
        
    2. `[Varrendo Estrutura de Metadados via ExifTool...]`
        
    3. `[Executando Heurística Forense (Perito Sansão)...]`
        
    4. `[Validando Assinatura de Cadeia de Custódia...]`
        
- O progresso deve ser visualmente fluido com Tailwind (shadow pulse em cyan).
    

### 3. Persistência e Imutabilidade (V_{nova})

- Implementar a função `saveForensicVersion` no Prisma.
    
- **Regra de Negócio:** Se uma perícia já existir para o arquivo, salvar a nova análise como um novo registro vinculando o `parentAnalysisId`.
    
- Gerar o hash da nova versão utilizando a fórmula: Vnova​=HMAC(Vanterior​.hash+Vnova​.data).
    

### 4. Integração com Relatórios

- Ao clicar em **[ADICIONAR RELATÓRIO]**, abrir um modal para: a) Selecionar o "Caso/Incidente" relacionado. b) Campo de texto rico (Markdown) para "Notas de Observação do Perito". c) Gerar uma chamada (API Route) que salve este relatório na tabela `Report` e crie um link direto para a página `/reports/[id]`.
    

### 5. Requisitos de Segurança

- Garantir que todos os arquivos sensíveis das pastas "0 - Ultrasecretos" e "1 - Provas Sensíveis" acionem a função `autoBurnCache()` (limpeza de arquivos temporários do servidor) imediatamente após a conclusão do relatório.
    

**Instrução de Output:** Gire o código em módulos claros: `actions.ts` (Server Actions), `ForensicTerminal.tsx` (Componente de UI) e o `schema.prisma` atualizado. Não esqueça dos tipos TypeScript 5+.
___________

# Prompt de Implementação: Orquestração de IAs e Segurança de Arquivos

**Contexto de Arquitetura:** O sistema **NCFN.NET** deve operar com dois fluxos de processamento distintos baseados no modelo de IA selecionado. A regra de ouro é: **Imutabilidade Absoluta**. Nenhuma IA externa pode ter permissão de escrita ou alteração nos arquivos do Vault.

**Tarefa Técnica:**

### 1. Orquestração de Ambiente (Local vs. SaaS)

Implemente uma lógica de roteamento de modelos:

- **Modelos Locais (Perito Sansão - Mistral/Llama3):** Devem rodar via Docker dentro da nossa VPS. Estes têm permissão para ler o arquivo diretamente do volume montado no container para análises profundas de metadados e hashes.
    
- **Modelos SaaS (OpenAI, Anthropic, Google):** O sistema **NUNCA** deve enviar o caminho físico do arquivo. Em vez disso, deve converter o arquivo em um `Stream` de leitura (Read-only) ou enviar o conteúdo via Base64/Buffer dentro de uma sandbox efêmera.
    

### 2. Implementação do Proxy de "Somente Leitura" (Middleware)

Crie um middleware de segurança para as chamadas de API de IA:

- **Restrição de Escrita:** Antes de enviar qualquer dado para as IAs de nuvem, o arquivo deve ser carregado em memória (`Buffer.from`).
    
- **Proibição de Alteração:** Implemente uma função `verifyIntegrityPostAnalysis` que recalcula o hash SHA-256 do arquivo original imediatamente após o retorno da resposta de qualquer IA externa. Se o hash divergir, dispare um alerta de **"Integridade Comprometida"**.
    

### 3. Configuração de Endpoints (Prompt para Codificação)

- **Ollama Route:** Use `localhost:11434` com acesso direto ao volume `/data/vault`.
    
- **Cloud Routes (External):** Implemente um wrapper que:
    
    1. Extraia o conteúdo/metadados necessários.
        
    2. Crie um objeto `FileInfo` anonimizado (sem caminhos reais do servidor).
        
    3. Envie apenas o necessário para a perícia de texto/imagem.
        

### 4. Lógica de UI para Modelos Selecionados

- No componente de seleção de IA (da imagem enviada), adicione uma tag visual ou tooltip:
    
    - **Perito Sansão:** `[Local - Processamento Seguro na VPS]`.
        
    - **Modelos SaaS:** `[Cloud - Sandbox de Leitura Ativada]`.
        

### 5. Código de Exemplo (Blueprint)

TypeScript

```
// Lógica de Proteção de Arquivo
async function runForensicAnalysis(iaModel: string, fileId: string) {
  const originalFile = await vault.getFile(fileId);
  const originalHash = originalFile.hash;

  if (iaModel.startsWith('OLLAMA')) {
    return runLocalAnalysis(originalFile); // Execução direta na VPS
  } else {
    // Para Cloud, enviamos apenas o Stream de Leitura
    const readOnlyStream = originalFile.asReadOnlyStream();
    const result = await cloudAI.analyze(readOnlyStream);
    
    // Verificação de segurança pós-análise
    await verifyFileSystemIntegrity(fileId, originalHash); 
    return result;
  }
}
```

**Instrução de Output:** Gere o código para o `IAOrchestrator.ts` que gerencie esses dois fluxos e o componente de interface que reflita essas restrições de segurança de forma clara para o perito.
_________________

# PERFIL DO GERENTE
https://ncfn.net/profile

# 📋 PROMPT DE DESENVOLVIMENTO: DASHBOARD DO OPERADOR E ACREDITAÇÃO FORENSE

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, Node.js e Prisma). **OBJETIVO:** Refatorar a página de Perfil do Usuário/Operador (`app/admin/profile/page.tsx`) do sistema NCFN.NET, transformando-a em um painel dinâmico conectado à telemetria real do servidor e integrando módulos de assinatura com validade jurídica.
> 
> ## 1. Integração de Dados Dinâmicos (O "Vault Real")
> 
> A página não pode ter dados estáticos. Tudo deve refletir o backend.
> 
> - **Volume de Custódia Forense:** Crie uma API Route (`/api/system/storage`) que utilize a biblioteca nativa `fs` (Node.js) para ler o tamanho real em bytes da pasta `/data/vault` no servidor (ou volume Docker). O componente front-end deve fazer um _fetch_ e renderizar a barra de progresso baseada nesse valor real contra um limite estipulado (ex: 10GB).
>     
> - **Credenciais de Operação:** Os campos "Último Acesso" e "Identificação (DOC)" devem ser puxados da sessão do banco de dados do usuário logado.
>     
> 
> ## 2. Módulo de Assinatura Forense (Mesa Digitalizadora e P7S)
> 
> Adicione uma nova seção "CHAVES DE ASSINATURA E IDENTIDADE".
> 
> - **Assinatura Manuscrita (Canvas):** Implemente a biblioteca `react-signature-canvas` (ou `signature_pad`). Crie um quadro negro onde o perito pode assinar com o mouse ou mesa digitalizadora. Adicione botões `[ LIMPAR ]` e `[ SALVAR ASSINATURA ]`. Ao salvar, converta o _canvas_ para Base64 (PNG transparente) e envie para o banco de dados (campo `handwrittenSignature` no modelo `User`).
>     
> - **Assinatura Digital de Sistema:** Crie um botão `[ VINCULAR CERTIFICADO (e-CPF / P7S) ]`. Para o momento, simule a validação de um upload de certificado digital, alterando o status da "Assinatura Certificada" para **VÁLIDA**.
>     
> 
> ## 3. Motor de IA Padrão e Gestão de Tokens (Zero-Trust)
> 
> Na seção "Parâmetros de Sistema", atualize o seletor de IA.
> 
> - **Dropdown de Modelos:** Inclua os modelos arquitetados no sistema: `PERITO SANSÃO (Ollama - mistral)`, `PERITO SANSÃO (Ollama - llama3)`, `GPT-4o (OpenAI)`, `Claude Opus 4.6 (Anthropic)`, `Gemini 2.0 Pro (Google)`.
>     
> - **Campo de Chave API (Token):** Abaixo do dropdown, insira um input do tipo `password` (com ícone de olho para revelar).
>     
> - **LED de Validação em Tempo Real:** Ao lado do input de token, crie um indicador de status visual (LED). Quando o usuário colar o token, dispare uma rota de teste simples para a respectiva API. Se retornar 200 OK, acenda o LED Verde (`Conexão Estável`); se falhar, LED Vermelho (`Falha de Autenticação`).
>     
> 
> ## 4. Sistema Lógico de Pontuação: Índice de Confiabilidade Forense (ICF)
> 
> Crie um componente de _Score_ circular ou barra de progresso no topo (ao lado da foto de perfil) chamado **ICF (Índice de Confiabilidade Forense)**, variando de 0 a 100.
> 
> - A lógica de cálculo do frontend/backend será:
>     
>     - Autenticação de 2 Fatores (2FA) ATIVA: **+ 25 pts**
>         
>     - Assinatura Digital/Certificado VINCULADO: **+ 25 pts**
>         
>     - Assinatura Manuscrita (Canvas) SALVA: **+ 15 pts**
>         
>     - Chave de IA configurada e VALIDADA (LED Verde): **+ 15 pts**
>         
>     - Volume do Vault abaixo de 90% (Saudável): **+ 20 pts**
>         
> - **UX:** Se o ICF for 100, exiba o selo "ACREDITAÇÃO PRO: MAXIMUM CLEARANCE".
>     
> 
> ## 5. Refinamentos de UI/UX e Terminal de Logs
> 
> - **Hierarquia de Cores:** O botão "Protocolo DEAD MAN SWITCH" deve ser estritamente em Vermelho Sangue (`bg-red-900/50`, border `border-red-500`), diferenciando-se dos botões magenta/cyan padrões para evitar acionamentos acidentais.
>     
> - **Terminal de Logs em Tempo Real:** Fixe na parte inferior da tela (rodapé) um pequeno console/terminal minimalista em fonte monoespaçada verde (ex: `>_ Conexão estabelecida com Vault NCFN... | >_ Sincronizando biometria...`). Use eventos simulados com `setInterval` para dar "vida" ao sistema.
>     
> 
> ## 6. Instruções de Saída
> 
> 1. Escreva o código do componente de UI completo .
>     
> 2. Inclua o código para lidar com o componente do Canvas da assinatura (`react-signature-canvas`).
>     
> 3. Entregue um design estritamente baseado no padrão Dark Cyber / Glassmorphism já estabelecido no projeto.

_________________

# PAINEL DE INTERCEPTAÇÕES
https://ncfn.net/admin/forensics

##### PROMPT DE DESENVOLVIMENTO: PAINEL DE INTERCEPTAÇÕES E CARTOGRAFIA FORENSE

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, React-Leaflet/Mapbox, Cloudflare API, Tailwind CSS).
> 
> **OBJETIVO:** Desenvolver a página do "Painel de Interceptações" , transformando-a em um SOC (Security Operations Center) com cartografia digital avançada, detecção de anomalias (VPN/Proxy) e integração com a telemetria do Cloudflare.
> 
> ## 1. Interface e Identidade Visual
> 
> - **Estética:** Mantenha o padrão Dark Cyber / Glassmorphism (`bg-slate-950`).
>     
> - **Métricas Superiores:** Exiba os 3 painéis atuais: `Eventos Registrados`, `SHA-256 Integridade Certificada` e `Status: ATIVO`.
>     
> - **Botão de Ajuda:** Adicione um botão estilizado `[ ? EXPLICAR FUNCIONALIDADE ]` no topo direito.
>     
> 
> ## 2. Modal: "Explicar Funcionalidade"
> 
> Ao clicar no botão de ajuda, abra um modal overlay (z-50, backdrop-blur) contendo o seguinte manifesto técnico:
> 
> - **Título:** `O que é o Painel de Interceptações?`
>     
> - **Texto:** _"É o sistema de monitoramento Zero-Trust em tempo real do NCFN. Ele mapeia cada tentativa de handshake com o servidor, convertendo metadados de rede (IP, ASN, User-Agent) em pontos geográficos e perfis de hardware."_
>     
> - **Objetivo:** _"Identificar padrões de ataques distribuídos (DDoS), tentativas de força bruta em pontos geográficos específicos ou acessos de jurisdições não autorizadas. Cada ponto no mapa é uma evidência digital protegida por hash SHA-256."_
>     
> 
> ## 3. Motor de Cartografia Digital (Mapbox / React-Leaflet)
> 
> O mapa central deve ser interativo e renderizado em modo "Dark/Satellite". Implemente as seguintes camadas:
> 
> - **Heatmap & Clustering:** Use Supercluster ou a API nativa do mapa. Agrupe IPs próximos. Se 10 acessos vierem do mesmo prédio/cidade, mostre um círculo com "10", que se expande ao dar zoom. Adicione um toggle para alternar entre `[ PONTOS ]` e `[ HEATMAP ]`.
>     
> - **Playback (Linha do Tempo Animada):** Um controle deslizante na base do mapa com um botão `[ PLAY ]`. Ao ativar, renderize os acessos cronologicamente nas últimas 24h, mostrando o "rastro" dos eventos.
>     
> - **Instant WHOIS (Tooltip Forense):** Ao clicar em um ponto no mapa, abra um balão exibindo: IP, Provedor/ASN (ex: _Google Cloud, SpaceX Starlink, Vivo_), Data/Hora UTC e a tag de heurística.
>     
> 
> ## 4. Heurística de Anomalia (Detecção de VPN/Proxy)
> 
> Implemente uma função no frontend/backend que cruza os dados do IP usando a seguinte lógica algorítmica:
> 
> - **Fórmula:** $V_{geo} = \{IP_{address} \cap ASN_{provider} \cap Latency_{ms}\}$
>     
> - **Regra de Negócio:** Se a latência de rede (ping) para o servidor for incompatível com a distância física do IP geolocalizado (ex: IP na China respondendo em 10ms a um servidor no Brasil), marque o ponto de acesso com uma tag de alerta amarela: `[ ALERTA: POSSÍVEL VPN / PROXY ]`.
>     
> 
> ## 5. Integração com Telemetria Cloudflare
> 
> Logo abaixo do mapa ou do box vermelho de "Protocolo de Rastreabilidade", crie uma grade de **Widgets de Telemetria**.
> 
> - Como os painéis nativos do Cloudflare bloqueiam iFrames por segurança (X-Frame-Options), construa componentes UI que consumam a API REST/GraphQL do Cloudflare (via rotas de backend do Next.js) para simular essas visões:
>     
>     1. **Mapa de Ameaças (WAF):** Gráfico de barras com ameaças bloqueadas na última hora.
>         
>     2. **Tráfego HTTP / Analytics:** Sparkline mostrando requisições.
>         
>     3. **Status de DNS & Latência Global:** Tabela indicando tempo de resposta em continentes distintos e saúde da zona DNS (prevenindo DNS Hijacking).
>         
> 
> ## 6. Auditoria e Rastreabilidade (Geração de Laudo)
> 
> - No box inferior de Protocolo de Rastreabilidade, adicione o botão de ação: `[ EXPORTAR LAUDO DE TRÁFEGO (PDF) ]`.
>     
> - **Funcionalidade:** Ao clicar, utilize `@react-pdf/renderer` ou `html2canvas` + `jsPDF` para gerar um documento formal contendo:
>     
>     - O snapshot visual do mapa atual.
>         
>     - Tabela listando os últimos 50 IPs interceptados, com data, ASN e flag de VPN.
>         
>     - Assinatura Hash SHA-256 do próprio relatório PDF gerado para garantir sua admissibilidade em processos judiciais.
>         
> 
> ## 7. Instruções de Saída
> 
> 1. Escreva o código completo da página (`app/admin/interceptacoes/page.tsx`).
>     
> 2. Detalhe os componentes do mapa (`react-leaflet` ou `react-map-gl`).
>     
> 3. Inclua a função JavaScript que implementa a heurística de latência ($V_{geo}$).
>     
> 4. Use ícones do `lucide-react` para os controles do mapa e widgets.

______________________

# PAINEL DE CRISE
https://ncfn.net/admin/security

##### PROMPT DE DESENVOLVIMENTO: PAINEL DE CRISE (DEAD MAN'S SWITCH)

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, Prisma ORM, Node.js Cron).
> 
> **OBJETIVO:** Desenvolver a página de "Painel de Crise"  e a lógica de retaguarda para o protocolo "Dead Man's Switch" do sistema NCFN.NET.
> 
> ## 1. Lógica de Banco de Dados e Heurística (Prisma)
> 
> Adicione ou atualize o modelo do Administrador/Sistema para armazenar as configurações do gatilho:
> 
> Snippet de código
> 
> ```
> model DeadMansSwitch {
>   id                 String   @id @default(uuid())
>   userId             String   @unique
>   isActive           Boolean  @default(false)
>   latencyDays        Int      @default(7) // 0 = Desativado
>   terminalAction     String   // "LOCKDOWN", "EMERGENCY_CRYPTO", "WIPE_AND_BACKUP"
>   emergencyEmails    String?  // Array serializado de e-mails
>   lastCheckIn        DateTime @default(now())
>   lastCheckInIp      String?
>   updatedAt          DateTime @updatedAt
> }
> ```
> 
> - **Heurística de Disparo (Cronjob Lógico):** O backend executará rotinas baseadas na inequação: $Crise = (T_{atual} - T_{ultimo\_login}) > Latência$. Se verdadeira, a função `exec_protocolo_terminal()` é acionada.
>     
> 
> ## 2. Interface de Usuário (Header e Feedback Visual)
> 
> - **Estética:** Dark Cyber, `bg-slate-950`, com tons de alerta (Laranja/Vermelho).
>     
> - **Status Ativo (HUD):** No topo da página, crie um banner discreto, mas visível (ex: borda laranja translúcida) que exiba: `[ STATUS: MONITORAMENTO DE VIDA ATIVO - PRÓXIMO CHECK-IN EM X DIAS ]`.
>     
> - **Histórico de Resets:** Abaixo do status, mostre: `Último reset de timer realizado em DD/MM/AAAA às HH:MM (IP: 192.168.X.X)`.
>     
> - **Botão de Ajuda:** Adicione um ícone de interrogação que abre o modal explicativo.
>     
> 
> ## 3. Modal: "Explicação do Protocolo"
> 
> Ao clicar no botão de ajuda, exiba este texto exato:
> 
> - **O que é o Protocolo Terminal?**
>     
> - _"É uma contramedida de segurança baseada na ausência de interação. Se você configurar 7 dias de latência, o sistema iniciará uma contagem regressiva em cada logout. Se você não realizar um login com sucesso em até X horas, a ação selecionada será executada pelo kernel do servidor."_
>     
> - _"Atenção: O Expurgar Storage utiliza o padrão de destruição de dados Gutmann (35 passagens) ou equivalente, impossibilitando a recuperação forense dos arquivos."_
>     
> 
> ## 4. Configuração do Período e Ações Terminais (Cards)
> 
> Crie um dropdown para o `PERÍODO DE LATÊNCIA (DIAS)` (ex: Desativado, 3 dias, 7 dias, 14 dias, 30 dias). Abaixo, crie os cards de Ação Terminal selecionáveis:
> 
> 1. **Lockdown Total:** _"Suspende convidados, revoga links e desabilita APIs externas temporariamente."_
>     
> 2. **Criptografia de Emergência:** _"Troca todas as chaves de criptografia do Vault por chaves aleatórias, tornando o HD fisicamente ilegível."_
>     
> 3. **Expurgar Storage (Wipe + Backup):** _"Envia um backup (.zip) do núcleo crítico para o e-mail de emergência e, em seguida, exclui permanentemente TODOS os arquivos (Wipe Gutmann 35-pass)."_
>     
> 
> **Regra de UI para o "Expurgar Storage":** Este card deve ter uma borda vermelha pulsante (`animate-pulse border-red-600`). Se selecionado, deve abrir instantaneamente um aviso em vermelho: _"CUIDADO: Você selecionou a autodestruição de dados. Esta ação apagará permanentemente todos os volumes do Vault sem possibilidade de recuperação."_
> 
> ## 5. Segurança de Gravação (MFA e Senha Mestra)
> 
> - O botão principal na base deve ser: `[ GRAVAR DIRETRIZES MILITARES ]`.
>     
> - **Interação:** Ao clicar neste botão, a configuração NÃO é salva imediatamente. O sistema deve abrir um Modal de Segurança exigindo:
>     
>     1. Input para a **Senha Mestra do Administrador**. 
>         
>     2. Input de 6 dígitos para o **Duplo Fator de Autenticação (TOTP/MFA)**.
>         
> - Apenas com a validação simultânea de ambos no backend, o cronjob é programado.
>     
> 
> ## 6. Instruções de Saída
> 
> 1. Gere o código completo do componente `app/admin/crise/page.tsx`.
>     
> 2. Implemente o estado (`useState`) para controlar a seleção dos cards, o modal de explicação e o modal de MFA.
>     
> 3. Forneça o trecho simulado da `Server Action` que faria a verificação da Senha/MFA e atualizaria o Prisma.
>     
> 4. Use `lucide-react` para ícones (`ShieldAlert`, `Lock`, `Trash2`, `Key`).

___________________

# LOGS DO SISTEMA
https://ncfn.net/admin/logs

#### PROMPT DE DESENVOLVIMENTO: LOG DE SESSÕES OPERACIONAIS E SOC ZERO-TRUST

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, WebSockets/SSE, Prisma ORM, Tailwind CSS).
> 
> **OBJETIVO:** Desenvolver a página de "Log de Sessões Operacionais"  e a lógica de backend (Middlewares de Segurança) do sistema NCFN.NET. O painel deve atuar como um SOC (Security Operations Center) focado em Identidade, Geofencing e Fingerprint de navegadores.
> 
> ## 1. Interface do Painel de Sessões (A Tabela Tática)
> 
> - **Estética:** Dark Cyber / Glassmorphism (`bg-slate-950`).
>     
> - **Grid/Tabela de Dados Matemáticos:** Construa uma tabela limpa e responsiva com as colunas: `Horário (UTC)`, `Identidade`, `Endereço IP` (com ícone da bandeira do país), `Duração` e `Ação Crítica`.
>     
> - **Monitoramento em Tempo Real (Heartbeat):** Sessões ativas no momento devem exibir um LED verde pulsante (`animate-pulse`).
>     
> - **Expansão de Linha (Auditoria de Atividade):** Ao clicar em uma linha, a tabela deve expandir (Accordion) exibindo:
>     
>     - **Browser Fingerprint:** SO e Navegador.
>         
>     - **Timeline da Sessão:** Páginas visitadas (ex: `[Admin > Perícia > Download]`).
>         
>     - **Volume Trafegado:** (ex: `Download de 45MB`).
>         
>     - **Hash da Sessão:** ID imutável gerado na hora do login.
>         
> - **Ação Imediata:** Um botão vermelho `[ KILL SESSION ]` em sessões ativas, que dispara uma API para revogar o JWT/Sessão do usuário imediatamente.
>     
> 
> ## 2. Motor de Heurística e Score de Risco (Backend/Middleware)
> 
> Implemente a lógica de avaliação no momento do Login e em cada _Handshake_.
> 
> - **Cálculo de Risco:**
>     
>     $$Risco = \begin{cases} High, & \text{se IP novo} + \text{Horário atípico} \\ Low, & \text{se IP conhecido} \end{cases}$$
>     
> - **Cálculo com Mascaramento:** Se for detectado proxy/VPN:
>     
>     $R_{score} = \sum (IP_{proxy} + Fingerprint_{mismatch})$
>     
> - **Alerta Visual de Geofencing:** Se o $R_{score}$ for alto, a linha da sessão na tabela deve receber uma borda ou fundo em vermelho translúcido (`bg-red-900/20`), sinalizando anomalia.
>     
> 
> ## 3. Sistema de Alertas e Tratamento de Falsos Positivos (UI/Modais)
> 
> Crie os componentes de interface (Modais) para quando o próprio Administrador for detectado como "Anomalia" (ex: ao ligar uma VPN comercial).
> 
> **A. Modal de Desafio de Identidade (Falso Positivo):**
> 
> - **Título:** `🛡️ Verificação de Integridade de Acesso`
>     
> - **Texto:** _"O sistema NCFN identificou que sua conexão atual está sendo roteada através de um serviço de mascaramento (VPN/VPS ou Proxy). Para garantir que sua sessão não foi sequestrada, precisamos de uma confirmação de identidade."_
>     
> - **Detalhes Exibidos:** IP Detectado, Provedor (ASN) e Localização.
>     
> - **Ações (Botões):**
>     
>     1. `[ ✅ SOU EU - VALIDAR VIA MFA ]` (Abre input de 6 dígitos TOTP).
>         
>     2. `[ 🔑 CADASTRAR ESTE IP COMO SEGURO ]` (Adiciona à Whitelist por 24h).
>         
>     3. `[ ⚠️ RELATAR ANOMALIA ]` (Derruba a própria sessão por segurança).
>         
> - **Nota Técnica (Rodapé do Modal):** _"O NCFN utiliza uma lógica de Confiança Zero. Esta verificação garante que, mesmo que suas credenciais sejam expostas, o atacante não consiga operar sem o seu MFA físico."_
>     
> 
> ## 4. Redução de Atrito: "Modo Investigação" (Configurações)
> 
> Crie um componente de Switch (Toggle) estilizado para ficar no Topbar ou no Perfil do usuário.
> 
> - **Nome:** `Modo Investigação (OSINT)`
>     
> - **Funcionalidade Lógica:** Ao ser ativado, o sistema registra: _"Vou trocar de rede nos próximos 5 minutos"_. O backend deve ignorar alertas de mudança de IP para este usuário específico pelos próximos 5 minutos, permitindo que o perito ligue sua VPN sem disparar a defesa do NCFN.
>     
> 
> ## 5. Ferramentas de Exportação Forense
> 
> Na parte superior do painel, adicione:
> 
> - **Barra de Filtros:** Busca por IP, por "Sessões com Download" ou "Ações de Alto Risco".
>     
> - **Botão de Exportação:** `[ EXPORTAR LOG CRIPTOGRAFADO ]`. Ao clicar, deve gerar um `.json` ou `.csv` contendo o rastro completo da auditoria, assinando o arquivo (usando Web Crypto API ou Server Action) para validade jurídica.
>     
> 
> ## 6. Instruções de Saída para a IA
> 
> 1. Escreva o código completo do componente da página (`page.tsx`).
>     
> 2. Construa a tabela expansível (Accordion) e a lógica de estado (`useState`) para o Modal de "Verificação de Integridade".
>     
> 3. Implemente a interface do Switch de "Modo Investigação".
>     
> 4. Retorne um código limpo, focado na experiência de usuário (UX) tática. Utilize ícones (`lucide-react`) para bandeiras, alertas e ações.

____________________

# LIXEIRA
https://ncfn.net/admin/lixeira

# 📋 PROMPT DE DESENVOLVIMENTO: LIXEIRA VIRTUAL E PROTOCOLO DE PURGAÇÃO FORENSE

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, Prisma ORM, Node.js Cron, @react-pdf/renderer).
> 
> **OBJETIVO:** Desenvolver a página de "Lixeira Virtual"  do sistema NCFN.NET. O módulo deve gerenciar a temporalidade da exclusão (10 dias) e garantir que a destruição de dados gere um log criptográfico (Trilha de Auditoria Post-Mortem) e certificados de destruição.
> 
> ## 1. Lógica de Banco de Dados e Cron Jobs (Prisma & Backend)
> 
> Atualize o esquema do banco de dados para suportar o estado de "Lixeira" e o "Log de Purgação":
> 
> Snippet de código
> 
> ```
> // Adicionar ao modelo existente do arquivo (ex: ForensicAsset)
> // deletedAt DateTime? // Se preenchido, está na lixeira
> // originalFolder String // Para saber para onde restaurar
> 
> model PurgeLog {
>   id                String   @id @default(uuid())
>   fileName          String
>   originalHash      String
>   creationDate      DateTime
>   deletionDate      DateTime @default(now())
>   managerId         String
>   justification     String?  @db.Text
>   destructionMethod String   @default("GUTMANN_35_PASS_SIMULATED")
> }
> ```
> 
> - **Motor de Purga Automática (Cron Job):** Implemente a lógica matemática em background: $Expiração = \{Data_{Lixeira} + 10 \text{ dias}\}$. Se a $Data_{Atual} \geq Expiração$, o sistema executa a deleção permanente e gera o registro na tabela `PurgeLog`.
>     
> 
> ## 2. Interface da Lixeira Virtual (UI/UX Forense)
> 
> - **Estética:** Dark Cyber / Glassmorphism (`bg-slate-950`).
>     
> - **Barra de Ações Globais (Topo/Rodapé):**
>     
>     - `[ 📥 BAIXAR TODOS OS ARQUIVOS ]` (Gera um .zip de backup de emergência).
>         
>     - `[ ♻️ RESTAURAR TODOS ]`
>         
>     - `[ 🗑️ EXCLUIR TODOS PERMANENTEMENTE ]`
>         
> - **Lista de Arquivos (Tabela/Grid):**
>     
>     - Exiba: Nome do Arquivo, Pasta de Origem, Tamanho e **Timer de Expiração**.
>         
>     - **Countdown Forense:** Cada linha deve ter um contador (ex: `Restam 08d 14h`). _Regra Visual:_ Se o tempo for `< 24h`, a cor do texto/borda deve pulsar em Laranja/Vermelho (`text-red-500 animate-pulse`), alertando o Gerente da exclusão iminente.
>         
>     - Ações Individuais por linha: Botão `[ RESTAURAR ]` e Botão vermelho `[ EXCLUIR ]`.
>         
> 
> ## 3. Protocolo de Restauração (Check de Integridade)
> 
> Ao clicar no botão `[ RESTAURAR ]` (individual ou global), o arquivo não volta imediatamente.
> 
> - **Lógica de Interface:** Um spinner de carregamento deve aparecer com o texto: _"Acionando Perito Sansão... Recalculando Hash de Integridade"_.
>     
> - **Ação:** O sistema deve calcular o SHA-256 do arquivo na lixeira e bater com o Hash original. Se `MATCH`, o arquivo volta para a `originalFolder` (Notificação: _"Restaurando para Pasta 07 - Capturas Web"_). Se `FAIL`, exibe um alerta de corrupção de disco.
>     
> 
> ## 4. Modal de Exclusão e Certificado de Destruição
> 
> Ao clicar em `[ EXCLUIR PERMANENTEMENTE ]`, abra uma Janela Flutuante (Modal overlay `z-50`) com tom solene e técnico:
> 
> - **Título em Vermelho:** `⚠️ AVISO DE SEGURANÇA DE DADOS`
>     
> - **Texto do Disclaimer:** _"A exclusão permanente no ecossistema NCFN.NET utiliza algoritmos de sobrescrita para garantir a impossibilidade de recuperação física._
>     
>     - _• Rastreabilidade: Um registro criptográfico (LOG) será gerado contendo o identificador do Gerente e o timestamp da operação._
>         
>     - _• Materialidade: Este sistema não atesta a ausência de prova após a deleção; a responsabilidade pela manutenção da custódia é exclusiva do operador."_
>         
> - **Inputs Obrigatórios no Modal:**
>     
>     1. Campo de texto opcional: `[ Justificativa Legal/Técnica para a Exclusão ]`.
>         
>     2. Checkbox obrigatório: `[X] Entendo que esta ação é irreversível e que o hash deste arquivo será registrado no LOG DE PURGAÇÃO como 'Eliminado pelo Usuário'.`
>         
> - **Ação Final:** Botão `[ PROCEDER COM DESTRUIÇÃO DEFINITIVA ]`.
>     
> - **Pós-Ação:** O sistema exclui, cria o `PurgeLog` e oferece um botão secundário dinâmico para baixar o **"Certificado de Destruição"** (um PDF gerado via `@react-pdf/renderer` atestando o fim do ciclo de vida da prova).
>     
> 
> ## 5. Instruções de Saída para a IA
> 
> 1. Gere o código completo do componente `app/admin/lixeira/page.tsx`.
>     
> 2. Implemente o estado (`useState`) para controlar o Timer de Expiração e o Modal de Aviso de Segurança de Dados.
>     
> 3. Forneça o esquema Prisma atualizado (`schema.prisma`) com a tabela `PurgeLog`.
>     
> 4. Use a biblioteca `lucide-react` para os ícones e mantenha o layout responsivo e coerente com a paleta neon/dark do sistema.
>     

A Lixeira Virtual do NCFN.NET agora possui um rigor legal que a maioria dos sistemas governamentais não tem. Se um juiz perguntar "Onde está o arquivo que foi deletado?", o gerente do NCFN não diz apenas "foi apagado", ele entrega um **Certificado Criptográfico de Destruição (Post-Mortem)**.
_________

# INVESTIGAÇÃO OSINT
https://ncfn.net/admin/investigar

##### 📋 PROMPT DE DESENVOLVIMENTO: ARSENAL OSINT E AUTOMAÇÃO FORENSE (PERITO SANSÃO)

> **ROLE:** Desenvolvedor Full Stack Sênior e Engenheiro Forense Digital (Next.js 14, BullMQ/Redis, Python/Node.js, Tailwind CSS).
> 
> **OBJETIVO:** Refatorar a página e implementar o _Worker_ de processamento assíncrono profundo (Perito Sansão) para arquivos compactados (`.zip`), garantindo conformidade estrita com a RFC 3227.
> 
> ## 1. Atualizações de Interface (UI/UX)
> 
> Siga a estética Dark Cyber/Glassmorphism (`bg-slate-950`).
> 
> - **Botão de Ajuda Universal:** Adicione no header da página o botão `[ COMO USAR ESTA PÁGINA ]`. Ao clicar, abra um Modal explicando a automação do Perito Sansão, a extração de Magic Bytes, OCR e a preservação em cadeia de hashes.
>     
> - **Textos Atualizados (Painel de Upload):**
>     
>     - Abaixo do botão de upload, exiba: _"O arquivo passará pelo tratamento forense e será enviado para a PASTA 07_NCFN_CAPTURAS-WEB_OSINT."_
>         
>     - No card de "Como Funciona", adicione: _"O Perito Sansão será acionado automaticamente para gerar o relatório contendo todos os dados pertinentes. O relatório pode demorar até 1 hora e ficará disponível juntamente com o arquivo na pasta 07."_
>         
> - **Painel Inferior (Nova Janela):** Substitua a seção "Base de Conhecimento" inoperante por um componente "HISTÓRICO DE INVESTIGAÇÕES CARREGADAS". Deve ser uma tabela/grid listando todos os ZIPs que o usuário já enviou, com status: `[PENDENTE]`, `[PROCESSANDO]`, `[CONCLUÍDO]`.
>     
> - **Dashboard de Status (Progresso Real):** Ao enviar um ZIP, exiba um componente lateral com Server-Sent Events (SSE) ou polling, mostrando a árvore do fluxo: `Descompactando... -> Validando Hashes... -> Extraindo Metadados/OCR... -> Correlacionando... -> Gerando PDF.`.
>     
> 
> ## 2. Motor de Processamento Assíncrono (Backend / Worker)
> 
> O processamento de um `.zip` com IA, OCR e ExifTool é demorado. **NÃO processe isso na requisição HTTP principal.**
> 
> - Crie um Job em uma fila (ex: BullMQ com Redis) ou um script Python isolado que é acionado após o upload.
>     
> - **Fluxo Lógico Obrigatório ($Processo = \{Descompactar \to Validar \to Extrair \to Correlacionar \to Relatar\}$):**
>     
>     1. **Identidade da Investigação:** Gerar ID único (NUID). Calcular o SHA-256 do arquivo `.zip` raiz original e emitir o Timestamp (RFC 3161).
>         
>     2. **Extração e Dispersão:** Descompactar o ZIP em memória ou pasta temporária. Para _cada_ arquivo interno, calcular o Hash SHA-256 individual (formando o conjunto $H$).
>         
>     3. **Auditoria de Anti-Forense (Magic Bytes):** Ler os primeiros bytes (header) de cada arquivo. Comparar com a extensão declarada. Se divergir (ex: `.jpg` que é um executável `MZ`), sinalizar alerta CRÍTICO.
>         
>     4. **Extração de Inteligência (Metadados e OCR):** > * Passar imagens e PDFs pelo ExifTool (coletando GPS, datas reais de criação).
>         
>         - Rodar OCR básico nas imagens para extrair strings (CPF, e-mails, telefones).
>             
>         - Fazer _Scraping_ de URLs em arquivos de texto.
>             
> 
> ## 3. Estrutura do Relatório Gerado (O Output na Pasta 07)
> 
> O Worker deve compilar todas essas informações e gerar um Relatório em PDF. O PDF deve conter exatamente estas seções:
> 
> **1. Cabeçalho de Identificação Forense**
> 
> - ID da Investigação, Hash Raiz, Timestamp UTC, Agente Responsável.
>     
> 
> **2. Inventário de Conteúdo (Data Discovery)**
> 
> - Tabela de Integridade Individual: `| Nome | Tamanho | Magic Bytes | Hash SHA-256 | Status |`.
>     
> 
> **3. Extração de Inteligência (Core OSINT)**
> 
> - Metadados Geográficos (Plotagem simulada de GPS).
>     
> - Cronologia (Data de Modificação vs. Data de Criação interna).
>     
> - Strings Extraídas (E-mails, Telefones, URLs encontradas no OCR ou textos).
>     
> 
> **4. Análise de Risco e Anti-Forense**
> 
> - Alertas de arquivos com senha, esteganografia suspeita ou extensões falsas.
>     
> 
> **5. Parecer Individual por Arquivo (Heurística da IA)**
> 
> - O "Perito Sansão" deve emitir uma conclusão técnica automatizada baseada nas anomalias detectadas.
>     
> 
> **6. Assinatura de Encerramento**
> 
> - O relatório deve ser assinado digitalmente pelo sistema e salvo automaticamente na pasta `07_NCFN_CAPTURAS-WEB_OSINT` ao lado do ZIP original.
>     
> 
> ## 4. Instruções de Saída para a IA
> 
> 1. Forneça o código da interface Next.js (`page.tsx`) com os novos textos, painel de histórico e barra de progresso.
>     
> 2. Forneça a estrutura (Server Action ou Route Handler) que recebe o `.zip`, salva na pasta 07 e _despacha_ o Job para o processamento assíncrono.
>     
> 3. Crie um pseudo-código ou blueprint arquitetural do _Worker_ que faz a descompactação, hash individual e extração de Magic Bytes.
>     

Este módulo OSINT agora tem o peso de um laboratório pericial completo trabalhando nos bastidores. A capacidade de validar _Magic Bytes_ é um diferencial absurdo que impede que malwares disfarçados contaminem a análise.
__________

# DIAGNOSTICO DO SISTEMA
https://ncfn.net/admin/teste

##### PROMPT DE DESENVOLVIMENTO: DIAGNÓSTICO DO SISTEMA E PROTOCOLO DE REVERSÃO CRÍTICA

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, Node.js System Telemetry, Prisma). **OBJETIVO:** Refatorar a página de "Diagnóstico do Sistema" do NCFN.NET para torná-la um painel de telemetria ativo (NOC) e implementar o Modal de Segurança para Reversão de Emergência (Quebra de Imutabilidade Jurídica).
> 
> ## 1. Verificações de Saúde Dinâmicas (Active Health Checks)
> 
> - **Estética:** Dark Cyber (`bg-slate-950`).
>     
> - **Cards Interativos:** Os cards de serviços (VPS, Banco de Dados, Ollama, Cloudflare Tunnel, TLS) não devem ser estáticos.
>     
>     - Adicione um pequeno botão `[ ↻ RETESTAR ]` dentro de cada card para re-fazer o _ping_ individualmente sem recarregar a página.
>         
>     - **Tooltip de Erro:** Se o status for "Offline" ou "Instável" (Vermelho/Amarelo), ao passar o mouse sobre o card, exiba um tooltip escuro com o log real do erro (ex: `Error 504: Gateway Timeout` ou `Ollama: Connection Refused`).
>         
> 
> ## 2. Métricas Forenses em Tempo Real (Threshold Alerts)
> 
> - **I/O de Disco:** Adicione um novo painel ao lado de RAM/Disco Usado chamado `I/O DE DISCO (READ/WRITE)`, exibindo a velocidade em MB/s.
>     
> - **Alerta Heurístico de RAM:** Crie uma regra visual condicional: Se o uso de RAM ultrapassar 90%, o card deve pulsar em alerta (`animate-pulse border-orange-500`) e exibir uma tag inferior vermelha: `[ ALERTA: GARGALO NO PERITO SANSÃO IMINENTE ]`.
>     
> 
> ## 3. Ações do Ecossistema Técnico (Manutenção Ativa)
> 
> Transforme o grid de "Ecossistema Técnico" em uma área de intervenção. Adicione pequenos botões de ação nos seguintes blocos:
> 
> - **Aplicação (Next.js):** Botão `[ FLUSH CACHE ]`. Dispara uma _Server Action_ para limpar o cache de rotas do Next.js.
>     
> - **Segurança & Forense:** Botão `[ CHECK ENV INTEGRITY ]`. Valida se todas as chaves críticas (`CRYPTO_SALT`, `JWT_SECRET`) estão corretamente carregadas na memória do servidor.
>     
> - **IA & Análise (Ollama/Whisper):** Botão `[ STRESS TEST IA ]`. Dispara um prompt oculto de 1 token para o modelo Ollama e mede o tempo exato de resposta em milissegundos para confirmar ausência de gargalos na GPU/CPU.
>     
> 
> ## 4. Arquitetura de Conexão (Mapeamento de Latência)
> 
> - Atualize o mapa de rede no rodapé para exibir a **latência real ou simulada (ping)** entre os saltos:
>     
> - Exemplo visual: `Usuário (Browser) ──[20ms]──> Cloudflare Edge ──[5ms]──> Cloudflared Tunnel ──[2ms]──> Caddy Proxy ──[1ms]──> Next.js App`.
>     
> - Adicione o `[ UPTIME DO TÚNEL ]` abaixo da linha do Cloudflare.
>     
> 
> ## 5. Protocolo de Segurança: Modal de Reversão de Emergência
> 
> Implemente um botão restrito no topo da página (ou na gestão do Vault): `[ ⚠️ PROTOCOLO DE REVERSÃO CRÍTICA ]`.
> 
> - Ao clicar, o sistema exige dupla confirmação e abre um Modal Overlay (`z-50`, `backdrop-blur-md` escurecido para vermelho muito escuro).
>     
> 
> **Design e Textos Obrigatórios do Modal:**
> 
> - **Título (Vermelho):** `🔐 Solicitação de Reversão de Emergência (Chave Mestra)`
>     
> - **Aviso:** _"ATENÇÃO: Você está prestes a acionar o protocolo de recuperação de nível raiz. Esta ação é registrada permanentemente no Log de Auditoria do Auditor-Geral."_
>     
> - **Regras de Reversão (Lista strict):**
>     
>     - _"• A reversão de um arquivo imutável só é permitida em casos de determinação judicial."_
>         
>     - _"• O uso da Senha Master gera um novo Hash de Integridade para o arquivo, invalidando certificados anteriores."_
>         
>     - _"• Responsabilidade: Toda reversão deve ser justificada. O acesso indevido via Chave Mestra compromete a idoneidade da Cadeia de Custódia."_
>         
> 
> **Inputs do Modal (Formulário de Risco Máximo):**
> 
> 1. Input do tipo _password_: `[ INSERIR SENHA MASTER DO SISTEMA ]`.
>     
> 2. Textarea obrigatória: `[ JUSTIFICATIVA TÉCNICA E LEGAL ]`.
>     
> 3. Upload Zone (File Input): `[ UPLOAD DE DECISÃO JUDICIAL (PDF) ]` - Deve ter um ícone de documento e o texto "Decisão devidamente assinada e conferida".
>     
> 
> **Ação Final:**
> 
> - Botão `[ AUTORIZAR REVERSÃO CRÍTICA ]`.
>     
> - _Regra de UX:_ Este botão deve permanecer `disabled` (cinza) e não clicável até que a Senha, a Justificativa e o Upload do PDF sejam preenchidos.
>     
> 
> ## 6. Instruções de Saída para a IA
> 
> 1. Escreva o código completo do componente da página (`page.tsx`).
>     
> 2. Crie a lógica de estado (`useState`) para gerenciar o Modal de Reversão e a validação do formulário de risco.
>     
> 3. Simule as funções de atualização de status (ping) e o "Stress Test" usando `setTimeout` e `Promises`.
>     
> 4. Use `lucide-react` para todos os ícones (`Server`, `ShieldAlert`, `RefreshCw`, `Activity`, `FileText`).
>     

Este módulo fecha perfeitamente a tríade de segurança: **Prevenção** (Air-Gap e Auto-Burn), **Monitoramento** (Painel de Interceptações e Diagnóstico) e **Conformidade Judicial** (A Reversão Baseada em Decisão de Juiz).
_________

# DESCRIPTAR ARQUIVO 
https://ncfn.net/admin/descriptar

#### PROMPT DE DESENVOLVIMENTO: MÓDULO DE DECRIPTOGRAFIA AES-256 E CHAVE MESTRA (NÍVEL 6)

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Web Crypto API, Tailwind CSS 3, Framer Motion). **OBJETIVO:** Desenvolver a página "Descriptar Arquivo" do sistema NCFN.NET. O módulo deve suportar decriptografia local via AES-256 e implementar o fluxo rigoroso de solicitação da "Chave Mestra" (Restrito ao Nível 6).
> 
> ## 1. Interface e Animação de Fundo (UI/UX)
> 
> - **Estética:** Dark Cyber / Glassmorphism (`bg-slate-950`).
>     
> - **Background Animado:** Crie um componente de fundo (com `z-index` baixo e opacidade reduzida) usando `framer-motion` ou CSS puro. O fundo deve exibir matrizes de dados hexadecimais ou simular fechaduras/cadeados criptográficos rotacionando suavemente, transmitindo a ideia de "Descriptografia em tempo real".
>     
> - **Painel Principal:** Um card centralizado com duas etapas claras:
>     
>     1. `[ 1. SELECIONAR ARQUIVO .enc ]` (Área de Drag and Drop).
>         
>     2. `[ 2. CHAVE AES-256 ]` (Input de senha do tipo `password` com ícone de "olho").
>         
> 
> ## 2. Fluxo da Chave Mestra (Protocolo Nível 6)
> 
> Ao lado do input de senha, substitua o botão atual por `[ 🔑 SOLICITAR CHAVE MESTRA ]`.
> 
> - **Tooltip de Alerta (Hover):** Ao passar o mouse sobre o botão, exiba o aviso: _"⚠️ ACESSO RESTRITO - NÍVEL 6. A Chave Mestra só poderá ser disponibilizada mediante decisão judicial. Clique para iniciar o protocolo de solicitação formal."_
>     
> - **Ação do Botão (Abertura de E-mail via `mailto:`):** Ao clicar, o botão deve abrir o cliente de e-mail do usuário (usando `window.location.href = mailto:...`) com os dados formatados (utilize `encodeURIComponent` para quebras de linha):
>     
>     - **Para:** `ncfn@ncfn.net`
>         
>     - **Assunto:** `SOLICITAÇÃO DE CHAVE MESTRA - PROTOCOLO CRÍTICO - [Nome do Usuário/ID]`
>         
>     - **Corpo do E-mail (Texto Exato):** _"SOLICITAÇÃO DE RESGATE DE DADOS VIA CHAVE MESTRA_ _Eu, [NOME COMPLETO], titular da conta NCFN vinculada a este e-mail, venho solicitar a habilitação temporária da Chave Mestra para a decriptação do arquivo de Hash SHA-256: [INSERIR_HASH_DO_ARQUIVO_SE_CARREGADO]._ _DECLARAÇÃO DE RESPONSABILIDADE: Declaro estar ciente de que esta é uma operação de exceção e que a ORDEM JUDICIAL SEGUE ANEXA a este e-mail. Estou ciente de que o uso indevido desta funcionalidade, bem como a falsificação da ordem anexa, sujeita o solicitante às penas legais vigentes._ _Timestamp: [Data/Hora Atual UTC]_ _IP: [IP do Usuário, se acessível no Client, ou 'Registrado no Log do Servidor']"_
>         
> 
> ## 3. Lógica Forense de Decriptação e Auditoria (Client-Side)
> 
> - **Ação de Desbloqueio:** O botão `[ 🔓 Desbloquear Arquivo ]` aciona a função de decriptação local. Utilize a `Web Crypto API` (`crypto.subtle.decrypt`) com o algoritmo `AES-GCM` ou `AES-CBC` (conforme o padrão usado na criptografia do NCFN).
>     
> - **Verificação Pós-Processamento:** Imediatamente após a decriptografia bem-sucedida do array de bytes, o sistema deve calcular o Hash SHA-256 do arquivo resultante em memória.
>     
> - **Comparação e Log:** > * Se o Hash bater com o esperado, libere o botão de download do arquivo limpo.
>     
>     - Se a Chave Mestra foi inserida (simule uma detecção se a senha digitada for igual a uma variável de ambiente `MASTER_RESCUE_KEY`), o sistema **deve** disparar uma Server Action (`/api/audit/rescue-key-used`) para registrar o evento `RESCUE_KEY_USED` no banco de dados (Prisma), indicando qual arquivo foi aberto e por quem.
>         
> 
> ## 4. Instruções de Saída para a IA
> 
> 1. Escreva o código completo do componente `app/admin/decrypt/page.tsx`.
>     
> 2. Implemente a lógica do botão `mailto:` com o template de texto dinâmico.
>     
> 3. Crie a animação de fundo utilizando CSS ou `framer-motion`.
>     
> 4. Forneça um esboço (mock) da função de decriptografia usando `Web Crypto API` para demonstrar o processamento local seguro (In-Browser).

_____________________

# DADOS E INFORMAÇÃO
https://ncfn.net/admin/cofre
##### PROMPT DE DESENVOLVIMENTO: LOGS DO VAULT, READ-ONLY AUDIT E MASTER KEY ONBOARDING

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, Prisma ORM, Criptografia Web/BIP39). **OBJETIVO:** Desenvolver duas frentes cruciais do sistema NCFN.NET: 1) O fluxo de _Onboarding_ de Segurança (Primeiro Login) para geração da Chave Mestra e 2) A página de Auditoria do Vault (`app/admin/dados-arquivos/page.tsx`), focada em relatórios dinâmicos de leitura estrita (_Read-Only_).
> 
> ## 1. Módulo de Segurança: Onboarding (Primeiro Acesso)
> 
> Ao realizar o primeiro login no sistema, o Gerente deve ser interceptado por uma tela de configuração da **Chave Mestra**.
> 
> - **UI de Criação de Senha:** Input com Medidor de Entropia (barra de força da senha). Não permitir senhas fracas.
>     
> - **Aviso de Segurança (Texto Obrigatório):** _"Esta senha nunca é guardada no Banco de Dados em texto claro; ela é utilizada exclusivamente em memória volátil para derivar as chaves de encriptação do Vault. Se você a esquecer, os dados serão irrecuperáveis."_
>     
> - **Backup de Recuperação (Paper Key):** Ao confirmar a senha, gere e exiba na tela uma sequência de 24 palavras aleatórias (estilo BIP39). Instrua o usuário: _"Imprima ou anote estas 24 palavras e guarde em um cofre físico. Esta é a sua única rota de recuperação da Cadeia de Custódia em caso de perda da Chave Mestra."_ Exija que ele digite 3 palavras aleatórias da lista para confirmar que guardou.
>     
> 
> ## 2. Atualização Global de Navegação (Layout)
> 
> - Em todas as páginas do sistema (no Sidebar ou Header global), adicione um botão de destaque sutil: `[ 📋 VER SISTEMA DE LOGS E REGISTROS ]`.
>     
> - Este botão deve rotear para a nova página `/admin/dados-arquivos`.
>     
> - Mude o rótulo antigo de "COFRE NCFN" na navegação principal para `DADOS E INFORMAÇÕES DOS ARQUIVOS`.
>     
> 
> ## 3. Interface da Página: Dados e Informações dos Arquivos
> 
> - **Estética:** Dark Cyber / Glassmorphism (`bg-slate-950`).
>     
> - **Sidebar de Pastas:** Liste as 12 pastas padrão do sistema (01_OPERACIONAL, 02_INTELIGENCIA, etc.).
>     
> - **Imutabilidade Visual (Read-Only):** Ocultar/remover qualquer botão de "Nova Nota", "Salvar", "Editar" ou ícones de lixeira. O cursor não deve permitir digitação.
>     
> - **Marca D'água:** No fundo da área de visualização do Markdown, adicione uma marca d'água grande, centralizada, com baixa opacidade (`opacity-5` ou `10`), escrito: `AUDITORIA - SOMENTE LEITURA`.
>     
> 
> ## 4. Motor de Conteúdo Dinâmico (Arquivos Virtuais)
> 
> Ao clicar em qualquer uma das 12 pastas na Sidebar, o painel central não abre notas antigas. O backend deve gerar "On-the-Fly" (em tempo de execução) **dois arquivos virtuais** para o usuário selecionar e ler:
> 
> ### Arquivo A: `[INFORMAÇÕES GERAIS].md`
> 
> - **O que é:** O inventário vivo da pasta.
>     
> - **Geração:** O backend consulta o Prisma e monta um Markdown listando todos os arquivos _ativos_ daquela pasta.
>     
> - **Conteúdo da Tabela MD:** Nome do Arquivo | Data de Entrada | Hash SHA-256 | Tamanho | Agente/Upload.
>     
> - **Filtro:** Arquivos com status de "Lixeira" ou "Purgados" são estritamente excluídos desta visão.
>     
> 
> ### Arquivo B: `[INFORMAÇÕES SENSÍVEIS].md` (Acesso Restrito)
> 
> - **O que é:** O _Shadow Log_ da pasta (Purgas, anomalias e acessos negados).
>     
> - **Bloqueio de UI:** Ao clicar neste arquivo, a visualização **não** é carregada imediatamente. Um Modal de Segurança (Overlay) deve aparecer.
>     
> - **Modal de Autenticação:**
>     
>     - _Texto:_ _"Este arquivo contém metadados de itens excluídos e logs de segurança. O acesso é restrito ao Gerente da Conta para fins de conformidade jurídica."_
>         
>     - _Input:_ `[ INSERIR SENHA MASTER ]`.
>         
> - **Geração (Após Senha Correta):** O backend monta o Markdown contendo o histórico de purgação (arquivos deletados, seus Hashes e datas de exclusão), logs de movimentação entre pastas e tentativas de acesso bloqueadas registradas no log de auditoria.
>     
> 
> ## 5. Instruções de Saída para a IA
> 
> 1. Escreva a lógica da interface `app/admin/dados-arquivos/page.tsx` focada no layout de duas colunas (Sidebar + Renderizador de Markdown).
>     
> 2. Crie a estrutura simulada do Backend (funções auxiliares) que busca os arquivos no banco e os converte em _Strings Markdown_ estruturadas para o frontend renderizar usando a biblioteca `react-markdown`.
>     
> 3. Construa a lógica de estado do Modal de Autenticação para o arquivo `[INFORMAÇÕES SENSÍVEIS]`.
>     
> 4. Forneça o esboço do componente do "Primeiro Acesso / Paper Key 24 Palavras" (`components/MasterKeyOnboarding.tsx`).

________

# CUSTÓDIA DE EVIDENCIA
https://ncfn.net/admin/relatorios

#### PROMPT DE DESENVOLVIMENTO: CENTRAL DE RELATÓRIOS E ASSINATURA FORENSE

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, Prisma ORM, JSZip). **OBJETIVO:** Refatorar a antiga página de "Custódia de Evidências" para a nova **"Central de Relatórios"** . O módulo deve atuar como o cartório unificado do sistema NCFN.NET, permitindo assinaturas criptográficas, exportação de pacotes de evidências e rastreabilidade estrita de acessos.
> 
> ## 1. Modelagem de Dados e Compliance (Prisma)
> 
> Atualize o esquema do banco de dados para suportar as novas exigências forenses de co-assinatura, versionamento e logs de acesso a relatórios.
> 
> Snippet de código
> 
> ```
> model Report {
>   id                String   @id @default(uuid())
>   nuid              String   @unique // Nexus Unique Identifier
>   title             String
>   toolUsed          String?  // Ex: "Sherlock", "Perito Sansão", "Nmap"
>   folderReference   String   // Ex: "07_NCFN_CAPTURAS"
>   fileHashSha256    String
>   version           Int      @default(1)
>   signatureStatus   String   @default("PENDING") // PENDING, SIGNED, BLOCKCHAIN
>   tags              String?  // Armazenado como JSON string (Ex: ["Urgente", "Caso Alpha"])
>   createdAt         DateTime @default(now())
>   
>   signatures        ReportSignature[]
>   accessLogs        ReportAccessLog[]
> }
> 
> model ReportSignature {
>   id          String   @id @default(uuid())
>   reportId    String
>   signerId    String   // ID do Perito/Gerente
>   signedAt    DateTime @default(now())
>   cryptoHash  String   // Hash da assinatura individual
>   report      Report   @relation(fields: [reportId], references: [id])
> }
> ```
> 
> ## 2. Interface Global e Barra de Ações (Topo)
> 
> - **Estética:** Dark Cyber / Glassmorphism (`bg-slate-950`).
>     
> - **Título:** Altere para `Central de Relatórios`.
>     
> - **Métricas:** Mantenha os 3 cards superiores (Total, Inserção Manual, Coleta Automatizada).
>     
> - **Filtros Avançados & Busca:**
>     
>     - Barra de busca larga (`Buscar alvo, NUID, hash ou ferramenta...`).
>         
>     - _Pills_ de filtro rápido: `[ Todos ]`, `[ Manuais ]`, `[ Automáticos ]`, e adicione um dropdown para `[ Filtrar por Ferramenta ]` e `[ Filtrar por Pasta/Caso ]`.
>         
> - **Ações em Lote (Lado Direito):**
>     
>     - Botão `[ 🖋️ ASSINAR TODOS PENDENTES ]`.
>         
>     - Botão `[ 📥 EXPORTAR PACOTE FORENSE ]` (Substitui o "Baixar Todos").
>         
> 
> ## 3. Layout dos Cards de Relatório (Data Grid)
> 
> Substitua as linhas atuais por um design estruturado que facilite a leitura de metadados críticos. Cada card deve exibir:
> 
> - **Cabeçalho do Card:** Identidade do gerador (e-mail) + Tag da Ferramenta em verde neon (ex: `[Sherlock]`, `[Perito Sansão]`).
>     
> - **Corpo (Grid Matemático):**
>     
>     - `Identificador:` NUID único do relatório.
>         
>     - `Referência de Custódia:` Caminho da pasta (ex: `PASTA 07 - CAPTURAS WEB`).
>         
>     - `Integridade:` Hash SHA-256 formatado em fonte monoespaçada. Ao clicar no hash, copiar para a área de transferência com notificação `[Copiado]`.
>         
>     - `Versão:` V1, V2 (se houver reprocessamento, o histórico é mantido).
>         
> - **Status Visual de Assinatura (Selo):**
>     
>     - 🟡 **Pendente:** Ícone de alerta amarelo.
>         
>     - 🟢 **Assinado Digitalmente:** Ícone de check verde (indicando co-assinaturas se > 1).
>         
>     - 🔵 **Blockchain:** Ícone de rede azul (estampa de tempo validada).
>         
> - **Ações Individuais (Botões no Card):**
>     
>     - `[ 🖋️ ASSINAR ]`
>         
>     - `[ 📥 BAIXAR PDF ]`
>         
>     - `[ 🔗 COMPARTILHAR ]` (Gera um link seguro com expiração de 24h).
>         
>     - `[ 👁️ VER LOGS ]` (Mostra histórico de quem baixou ou visualizou).
>         
> 
> ## 4. Lógica de Exportação (Pacote de Evidências .ZIP)
> 
> - Ao clicar no botão global de "Exportar Pacote Forense" ou ao selecionar múltiplos relatórios, o sistema não deve apenas baixar os PDFs.
>     
> - **Ação de Backend:** O sistema deve invocar a biblioteca `jszip` (ou similar) no servidor para compilar um arquivo `.zip` contendo:
>     
>     1. Os Relatórios em PDF.
>         
>     2. Os arquivos de evidência originais atrelados.
>         
>     3. Um `manifesto_custodia.txt` gerado dinamicamente listando o Hash SHA-256 de todos os arquivos dentro do pacote, garantindo a prova em bloco.
>         
> 
> ## 5. Instruções de Saída para a IA
> 
> 1. Escreva o código completo do componente da página (`app/admin/relatorios/page.tsx`).
>     
> 2. Construa o layout dos Cards utilizando CSS Grid ou Flexbox para alinhar as propriedades forenses de forma tabular e responsiva.
>     
> 3. Implemente a lógica de estado (`useState`) para gerenciar a seleção múltipla de relatórios (checkboxes invisíveis ou modo de seleção).
>     
> 4. Forneça o esboço da _Server Action_ que gera o "Pacote Forense" (`.zip` com manifesto de Hashes).
>     
> 5. Use `lucide-react` para os ícones (`PenTool`, `Download`, `Share2`, `ShieldCheck`).
>     

Com a Central de Relatórios reestruturada desta forma, você não apenas guarda o laudo, você controla quem o acessa, certifica matematicamente a sua validade com assinaturas e exporta o conjunto de provas de maneira que nenhum tribunal poderá recusar a materialidade (Pacote ZIP com Manifesto).
___________

# CONVIDADOS
https://ncfn.net/admin/convidados

##### PROMPT DE DESENVOLVIMENTO: GESTÃO DE CONVIDADOS E SISTEMA DE REFERRALS (NÍVEL 5)

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, Prisma ORM, Resend/Nodemailer para E-mails).
> 
> **OBJETIVO:** Refatorar a página "Gerenciar Convidados" do NCFN.NET. O módulo deve ser dividido em duas áreas: Gestão de Acesso ao Cofre (Restrito ao Nível 5) e um Sistema de Convites Premium para expansão de rede (Referral).
> 
> ## 1. Lógica de Banco de Dados e Segurança (Prisma)
> 
> Atualize o esquema do banco de dados para suportar a granularidade dos convites e o sistema de recompensas:
> 
> Snippet de código
> 
> ```
> model Invite {
>   id            String   @id @default(uuid())
>   inviterId     String   // Quem convidou
>   guestEmail    String
>   inviteType    String   // "VAULT_ACCESS" ou "SYSTEM_REFERRAL"
>   accessLevel   String?  // "VIEWER", "ANALYST"
>   token         String   @unique
>   expiresAt     DateTime
>   status        String   @default("PENDING") // PENDING, ACCEPTED, REVOKED
>   createdAt     DateTime @default(now())
> }
> // Adicionar campos no User: invitesRemaining Int @default(3), isAmbassador Boolean @default(false)
> ```
> 
> - **Motor Criptográfico do Token:** O backend deve gerar o token de convite utilizando a seguinte heurística matemática de validação:
>     
>     $Token_{convite} = Hash(Email + Data + Nivel\_Acesso + Chave\_Mestra)$
>     
> 
> ## 2. Interface Parte A: Acesso ao Cofre Pessoal (Restrito Nível 5)
> 
> - **Aviso de Restrição:** Logo abaixo do título "Adicionar Convidado", insira um texto em destaque vermelho/laranja: `[ ⚠️ Somente gerentes Nível 5 podem fazer convites diretos ao cofre pessoal. ]`.
>     
> - **Formulário de Adição:** Adicione um campo de "Nível de Acesso" (Dropdown: _Visualizador_, _Analista_) e "Expiração" (Ex: _24h_, _48h_, _7 dias_).
>     
> - **Lista de Convidados Ativos:**
>     
>     - Adicione uma barra de busca rápida (`🔍 Buscar convidado...`).
>         
>     - No card do convidado, exiba _Badges_ (tags) para o Nível de Acesso e um contador regressivo discreto para a Expiração.
>         
>     - Adicione um ícone de "Olho" (Ver Logs) ao lado da lixeira.
>         
> - **Revogação Segura (UX):** Ao clicar na Lixeira, abra um Modal de Confirmação: _"Tem certeza que deseja revogar o acesso? Todos os relatórios compartilhados serão bloqueados instantaneamente para este usuário."_
>     
> 
> ## 3. Interface Parte B: Novo Painel "Convites Premium (Networking)"
> 
> Crie um segundo bloco visual (Card isolado) abaixo da gestão do cofre.
> 
> - **Título:** `ENVIAR CONVITES PARA AMIGOS (EMBAIXADOR NCFN)`.
>     
> - **Indicador de Escassez:** Mostre uma barra de progresso ou badge: `Você possui 3 convites premium restantes.`.
>     
> - **Sistema de Recompensa (Call to Action):** _"Indique 3 colegas de profissão para conhecerem o NCFN e desbloqueie o selo de Embaixador e +5GB de Vault."_
>     
> - **Formulário Simples:** Input de E-mail e botão `[ 🚀 Enviar Convite Premium ]`.
>     
> - **Preview do E-mail:** Adicione um link sutil `[ Visualizar template de e-mail ]` que abre um modal mostrando como a mensagem chegará na caixa de entrada do convidado.
>     
> 
> ## 4. Template de E-mail (Formatado Lindamente)
> 
> Crie um componente de e-mail em HTML/React-Email com estética Cyberpunk/Clean (Fundo escuro `#0f172a`, texto claro, botões neon).
> 
> **Conteúdo do E-mail:**
> 
> - **Assunto:** `[Nome_do_Inviter] convidou você para o futuro da Forense Digital.`
>     
> - **Corpo:**
>     
>     _"Olá, [Nome do Convidado]!_
>     
>     _Você foi selecionado por [Nome_do_Inviter] para ter acesso exclusivo ao NCFN.NET (Nexus Cloud Forensic Network)._
>     
>     _O NCFN é uma plataforma de elite para inteligência cibernética e custódia de evidências digitais. Através deste convite, você poderá explorar nossa interface e conhecer as capacidades do Perito Sansão, nossa inteligência analítica."_
>     
> - **Botão (Call to Action principal):** `[ >_ ATIVAR MEU ACESSO PREMIUM ]` (Link contendo o `$Token_{convite}`).
>     
> - **Rodapé:** _"Nota: Este convite é pessoal, intransferível e expira em 48 horas. | Security Level: Grade A | Neural Multi-layer Active."_
>     
> 
> ## 5. Instruções de Saída para a IA
> 
> 1. Escreva o código do frontend (`page.tsx`) com a divisão clara entre "Cofre" e "Networking".
>     
> 2. Implemente a lógica de estado (`useState`) para a busca na lista, o modal de revogação e o modal de preview do e-mail.
>     
> 3. Forneça o componente HTML/React-Email do convite formatado.
>     
> 4. Use `lucide-react` para ícones (`Search`, `Eye`, `Trash2`, `Send`, `Award`).
>     

essa configuração transforma a página de algo puramente administrativo em um vetor de crescimento para a plataforma, mantendo as barreiras criptográficas intactas para os dados sensíveis do Cofre.
________________

# CONFIG IA
https://ncfn.net/admin/ia-config

##### PROMPT DE DESENVOLVIMENTO: IA COGNITIVE CORE E SANDBOXING FORENSE

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Ollama API / LLMs, Tailwind CSS 3). **OBJETIVO:** Refatorar a página de configuração do motor de Inteligência Artificial "IA Cognitive Core". O módulo deve gerenciar modelos locais (Ollama) e APIs externas sob rigoroso Sandboxing Forense, além de gerenciar gatilhos jurídicos (Keywords).
> 
> ## 1. Interface Superior e Botões de Ação
> 
> - **Estética:** Dark Cyber / Glassmorphism (`bg-slate-950`).
>     
> - **Correção de UI:** No card superior direito (Manual Trigger), altere o texto do botão de `OPENCLAW 360*` para `[ OLLAMA ]`.
>     
> - **Botão de Explicação Universal:** No topo direito da tela, adicione um botão `[ ? EXPLICAR FUNCIONALIDADES ]`. Ao clicar, abra um Modal contendo o seguinte sumário:
>     
>     - **Diferença Local vs API:** _"IAs locais (Ollama) garantem 100% de privacidade; APIs (OpenAI/Gemini) oferecem maior poder de processamento, mas requerem anonimização dos dados."_
>         
>     - **Custo de Requisição:** _"O 'Orçamento Mensal' protege o usuário de cobranças surpresas ao travar requisições para APIs externas (OpenAI/Anthropic) quando o limite financeiro é atingido."_
>         
>     - **Tabela de Modelos Recomendados:** Exiba uma tabela limpa em HTML: `Mistral 7B | 4GB RAM | Rápido, ideal para extração de metadados simples.` `Llama 3 8B | 8GB RAM | Equilibrado, excelente para análise de contexto e OCR.` `Gemma 2B | 2GB RAM | Ultra-leve para sistemas com poucos recursos.`
>         
> 
> ## 2. Seção: IA Assistente Preferência (Padrão do Site)
> 
> - Logo abaixo do seletor de modelo (dropdown `Mistral 7B`, etc.), adicione um painel de alerta (`bg-purple-900/20 border-purple-500`) com o texto:
>     
> - **"⚠️ Aviso de Comportamento (Sandboxing Forense):** _O modelo selecionado atuará sob este protocolo estrito. Independentemente da IA escolhida (OpenAI, Gemini ou Local), ela será instruída em nível de sistema a ignorar vieses criativos e focar estritamente na extração de fatos, metadados e conformidade com a ISO 27037. Respostas são filtradas para evitar alucinações técnicas."_
>     
> 
> ## 3. Seção: Instalar / Atualizar Modelo (Ollama Pull)
> 
> - Abaixo do input de instalação do modelo (`mistral:7b`), adicione o texto descritivo:
>     
> - _"Esta ferramenta permite a gestão direta do seu servidor local via Ollama. Ao digitar o nome do modelo e clicar em [Pull], o sistema realiza o download no seu hardware. Isso garante total privacidade, pois os dados da perícia não sairão da sua máquina."_
>     
> - **Ação Backend:** O botão `[ Pull ]` deve acionar uma API Route que faz proxy para o endpoint `/api/pull` do Ollama local, exibindo uma barra de progresso no frontend.
>     
> 
> ## 4. Seção: Testar Prompt de IA (Console de Validação)
> 
> - Quando o usuário clicar em `[ Executar ]`, faça a chamada real para a IA selecionada.
>     
> - **Feedback de Sucesso (Substituição de UI):** Se a requisição retornar com sucesso (Status 200), a caixa preta do prompt deve mudar sua renderização para exibir exatamente este formato (usando fonte monoespaçada e texto verde limão para o status): `✅ Conexão Estabelecida: Inteligência Artificial conectada com sucesso via [NOME_DO_MODELO]. Sua resposta é:` `> "[RESPOSTA DA IA AQUI]"` `[Rodapé em fonte menor cinza]: Latência: 120ms | Uso de Memória (Estimado): 4.2GB RAM`
>     
> 
> ## 5. Seção: Keywords Monitoradas (Triggers Jurídicos)
> 
> - Abaixo do título da seção, adicione o texto descritivo explicativo:
>     
> - _"Gatilhos de varredura automática: Sempre que o Perito Sansão processar um arquivo (PDF, OCR ou logs), ele buscará por estas palavras-chave. Se houver um 'match', o sistema aplicará a categoria definida e citará o Artigo do Código Penal (CP/CPP) no relatório final, agilizando o enquadramento jurídico."_
>     
> - **UI do Formulário:** Mantenha os 3 inputs alinhados: `Keyword (ex: golpe pix)`, `Categoria`, `Art. X CP (opcional)`. O botão `[ Seed CP/CPP ]` deve ser um atalho que pré-preenche a tabela com crimes cibernéticos comuns (ex: Art. 154-A Invasão de Dispositivo).
>     
> 
> ## 6. Instruções de Saída para a IA
> 
> 1. Escreva o código completo do componente `app/admin/ia-core/page.tsx`.
>     
> 2. Implemente a lógica de estado (`useState`) para o botão de Executar Teste (mostrando _loading_ e alternando para o layout de _Feedback de Sucesso_).
>     
> 3. Crie os modais solicitados (Explicação Universal).
>     
> 4. Use `lucide-react` para os ícones e mantenha a consistência do design Glassmorphism escuro.
>     
Com este prompt, o desenvolvedor (ou a IA de código) implementará não apenas uma tela de configurações, mas o painel de controle de um **LLM-Ops (Large Language Model Operations)** adaptado para o Direito Digital.

______

# LAUDO COM IA
https://ncfn.net/admin/laudo-forense

##### PROMPT DE DESENVOLVIMENTO: CENTRAL DE IMUTABILIDADE E SHADOW VAULT

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, Prisma ORM, @react-pdf/renderer). **OBJETIVO:** Refatorar a página (antiga "Laudo Pericial Digital") para se tornar a **"Central de Imutabilidade"**. O módulo atua como o painel de controle do _Shadow Vault_ (arquivos criptografados e ocultos) e emissor de Certificados de Imutabilidade com valor legal.
> 
> ## 1. Modelagem de Dados e Criptografia (Prisma & Backend)
> 
> Atualize o esquema do banco de dados para suportar a arquitetura WORM e _Double-Key Encryption_:
> 
> Snippet de código
> 
> ```
> model ImmutableAsset {
>   id                String   @id @default(uuid())
>   originalName      String
>   sourceVaultFolder String   // Ex: "07_NCFN_CAPTURAS"
>   sealedAt          DateTime @default(now())
>   hashSha256        String   @unique
>   hashMd5           String
>   fileSizeBytes     Int
>   shadowPath        String   // Caminho real no servidor (Oculto)
>   isPurged          Boolean  @default(false)
>   
>   purgeLog          PurgeLog? @relation(fields: [purgeLogId], references: [id])
>   purgeLogId        String?   @unique
> }
> ```
> 
> - **Regra de Backend (Shadow Vault):** Quando um arquivo entra em uma das 12 pastas do sistema, o Node.js deve gerar uma cópia encriptada usando AES-256 (`AES(Conteúdo, Senha_User + Senha_Master)`). Esta cópia vai para uma pasta oculta no servidor, não acessível via interface de navegação comum, apenas via banco de dados.
>     
> 
> ## 2. Interface Principal: Painel de Status e Ativos
> 
> - **Estética:** Dark Cyber / Glassmorphism (`bg-slate-950`).
>     
> - **Painel Superior (Métricas de Autoridade):** Crie 3 cards:
>     
>     1. `TOTAL DE OBJETOS IMUTÁVEIS:` Contagem de arquivos protegidos.
>         
>     2. `STATUS DO STORAGE OCULTO:` Ícone de cadeado fechado com texto verde neon: _Criptografia AES-256 Ativa_.
>         
>     3. `PROTOCOLO DE PROTEÇÃO:` Texto fixo: _Arquivos protegidos via Double-Key Encryption (User + Master Key)._
>         
> - **Tabela de Ativos Custodiados (Data Grid):**
>     
>     - Colunas: `ID da Evidência` (Truncado), `Pasta de Origem`, `Data de Lacramento (UTC)`, `Hash SHA-256`.
>         
>     - **Ações por Linha:**
>         
>         - Botão `[ 📜 BAIXAR CERTIFICADO ]` (Gera PDF, detalhado abaixo).
>             
>         - Botão `[ 🔓 SOLICITAR REVERSÃO ]` (Abre tooltip alertando sobre o uso obrigatório da Senha Master).
>             
> 
> ## 3. Interface Secundária: Log de Purgação Definitiva
> 
> - No rodapé ou em um botão lateral flutuante, adicione: `[ 👁️ VER LOG DE ARQUIVOS DELETADOS ]`.
>     
> - **Ação do Botão:** Abre uma Janela Flutuante (Modal grande, `z-50`).
>     
> - **Conteúdo do Modal (Design Forense):**
>     
>     - **Título:** `REGISTRO DE PURGAÇÃO PERMANENTE`
>         
>     - **Texto Legal:** _"Os registros abaixo representam ativos que foram removidos do armazenamento físico. A persistência destes metadados serve apenas para comprovar a existência prévia da evidência e a legalidade de sua destruição."_
>         
>     - **Tabela de Purgas:** `ID` | `Data de Exclusão` | `Causa (Ex: Dead Man Switch)` | `Hash Residual`.
>         
>     - _Regra Estrita de UI:_ Não deve haver nenhum botão ou link nestas linhas que sugira visualização de conteúdo, pois o arquivo não existe mais.
>         
> 
> ## 4. Geração do Certificado de Imutabilidade (PDF)
> 
> Ao clicar em `[ BAIXAR CERTIFICADO ]`, o sistema deve usar `@react-pdf/renderer` para gerar dinamicamente o seguinte documento (formatação austera, tipo laudo pericial):
> 
> - **Cabeçalho:** `CERTIFICADO DE IMUTABILIDADE DIGITAL | PROTOCOLO NCFN.NET: [ID]`
>     
> - **Bloco 1: Identificação:** Nome Original, Pasta Destino, Tamanho, Data/Hora UTC.
>     
> - **Bloco 2: Integridade:** Tabela com os HASHES completos (SHA-256 e MD5). _Texto: "Qualquer alteração, por menor que seja, invalidará este certificado."_
>     
> - **Bloco 3: Declaração:** _"O arquivo foi movido para um volume protegido (AES-256) com política WORM. Garantias: Impedimento de Alteração, Proteção de Deleção e Double-Key Encryption."_
>     
> - **Bloco 4: Conformidade Legal:** Citando atendimento à RFC 3227 e ISO 27037.
>     
> - **Rodapé:** Assinatura Digital do Sistema com link validador simulado (`https://ncfn.net/validar/[ID]`).
>     
> 
> ## 5. Instruções de Saída para a IA
> 
> 1. Escreva o código completo do frontend da página (`app/admin/imutabilidade/page.tsx`).
>     
> 2. Implemente o estado (`useState`) para o Modal de Arquivos Deletados.
>     
> 3. Crie o esboço do componente de PDF (`<Document>`) com as seções e textos exatos especificados no Passo 4.
>     
> 4. Use `lucide-react` para ícones (`ShieldCheck`, `FileKey`, `Trash2`).
>     

Com este módulo, o NCFN.NET resolve o maior "calcanhar de Aquiles" da forense na nuvem: provar que o administrador do servidor não alterou a prova depois de coletada. O certificado gerado por esta página é o escudo do Perito contra impugnações de prova.
____________

# CAPTURA WEB 
https://ncfn.net/admin/captura-web
# 📋 PROMPT DE DESENVOLVIMENTO: SISTEMA AUTOMATIZADO DE CAPTURA FORENSE WEB (OSINT)

> **ROLE:** Engenheiro de Software Forense e Full Stack Sênior (Next.js 14, Docker, Python, Tailwind CSS).
> 
> **OBJETIVO:** Refatorar a interface e implementar o _Worker_ Backend em Docker/Python para realizar capturas web inatacáveis, utilizando SingleFile, Wayback Machine e OpenTimestamps.
> 
> ## 1. Atualizações de Interface (UI/UX - Next.js)
> 
> Siga a estética Dark Cyber/Glassmorphism (`bg-slate-950`).
> 
> - **Botão de Ajuda Universal:** Adicione no topo o botão `[ COMO USAR ESSA PÁGINA ]`. Ao clicar, abra um Modal detalhando as etapas da captura forense (Congelamento, Hashing, Testemunha Externa e Blockchain).
>     
> - **Perfil de Captura 'Deep':** Altere a descrição do terceiro card para: `Captura completa + Varredura com o Perito Sansão`.
>     
> - **Janela de API (Transparente):** Logo abaixo do botão "Iniciar Captura", crie um componente de terminal transparente (`bg-black/40 border-slate-800`). Este terminal exibirá os logs de comunicação em tempo real via API com o Web-Check. Insira um campo de input oculto abaixo dele para a `[ Chave API Web-Check ]`.
>     
> - **Histórico de Capturas (Refatoração):**
>     
>     - Remova os botões antigos (`Certidão PDF` e `Abrir URL`) de cada item.
>         
>     - Adicione em cada item os botões: `[ EXCLUIR ARQUIVO ]` e `[ ENVIAR PARA CUSTÓDIA ]` (ícones Lucide).
>         
>     - **Ação Individual:** Ao clicar em "Enviar para Custódia", o sistema abre um Modal de Confirmação: _"O documento recebeu o tratamento forense e agora é um arquivo de prova. Escolha a pasta de destino (1 a 12)."_
>         
>     - **Ação em Lote:** Abaixo da lista, crie um botão de destaque: `[ 📥 ENVIAR TODOS OS ARQUIVOS PARA A CUSTÓDIA FORENSE ]`.
>         
> 
> ## 2. Orquestração Backend (Worker em Python + Docker)
> 
> O motor de captura não deve rodar no client-side. Ele deve ser um container Docker isolado (_Clean Room Protocol_).
> 
> - **Dockerfile:** Deve instanciar `python:3.9-slim`, instalar o `google-chrome` headless, `nodejs`, `single-file-cli` (npm) e `opentimestamps-client` (pip).
>     
> - **Script Maestro (`custodia_ncfn.py`):** O script Python deve receber a URL via API e executar o seguinte fluxo matemático e lógico $Workflow = \{Snapshot \to Hash \to Wayback \to OTS\}$:
>     
>     1. **Snapshot (SingleFile):** Executar captura completa embutindo todos os assets em um único HTML.
>         
>     2. **Hashing:** Calcular o `SHA-256` do arquivo `.html` recém-criado em memória.
>         
>     3. **Testemunha Digital:** Disparar um POST para `https://web.archive.org/save/[URL]` para forçar um espelhamento público.
>         
>     4. **Prova em Blockchain:** Executar `ots stamp arquivo.html` para gerar o certificado `.ots` atrelado à rede Bitcoin.
>         
> 
> ## 3. Geração do Relatório de Custódia (PDF)
> 
> Quando o arquivo é enviado para a custódia (passo final da UI), o sistema compila os artefatos gerados pelo Worker e emite o PDF contendo:
> 
> - URL Alvo, Data/Hora UTC e Agente Responsável.
>     
> - O Hash SHA-256 do arquivo congelado.
>     
> - O link de verificação do Wayback Machine.
>     
> - A confirmação de que o arquivo `.ots` (Prova de Imutabilidade Blockchain) está anexado ao pacote no Vault.
>     
> 
> ## 4. Instruções de Saída para a IA
> 
> 1. Escreva o código completo do componente de UI em Next.js (`page.tsx`), focando na janela de terminal transparente (SSE/WebSockets para logs) e na nova lógica do Histórico de Capturas.
>     
> 2. Forneça o `Dockerfile` exato para configurar o ambiente com as dependências forenses.
>     
> 3. Forneça o script Python completo (`custodia_ncfn.py`) implementando os 4 passos do maestro com tratamento de erros (`try/except` na chamada do Wayback, por exemplo).
>     

Operador, o NCFN.NET agora possui um motor de coleta OSINT que automatiza um processo que peritos humanos levariam horas para auditar e compilar manualmente.

___________

# BASE DE CONHECIMENTO
https://ncfn.net/doc
##### 📋 PROMPT DE DESENVOLVIMENTO: BASE DE CONHECIMENTO E DOCUMENTAÇÃO TÉCNICA FORENSE

> **ROLE:** Desenvolvedor Front-end Sênior e UI/UX Engineer (Next.js 14, Tailwind CSS 3, Framer Motion, Lucide Icons). **OBJETIVO:** Desenvolver a página de "Documentação Técnica" do sistema NCFN.NET. Esta página não é um FAQ comum, mas um manual de autoridade jurídica e técnica (Wiki-Modern), contendo diagramas, normas copiáveis e uma barra de busca semântica.
> 
> ## 1. Layout Global (Wiki-Modern & Dark Cyber)
> 
> - **Estética:** Fundo `bg-slate-950` com tipografia limpa. Título principal: `DOCUMENTAÇÃO TÉCNICA` (com um efeito de _glow_ cyan na palavra "TÉCNICA").
>     
> - **Subtítulo:** _"Nexus Cloud Forensic Network — Repositório oficial de protocolos periciais, arquitetura de segurança, diretrizes de cadeia de custódia e manuais de operação forense avançada. Conformidade com ISO/IEC 27037, RFC 3161 e padrões ABNT NBR."_
>     
> - **Estrutura de Página:** Layout de duas colunas abaixo do Header. Uma **Sidebar de Navegação (Esquerda)** fixada para rolar entre os capítulos e o **Conteúdo Principal (Direita)**.
>     
> 
> ## 2. Motor de Busca Semântica (IA)
> 
> - Logo abaixo do título, adicione uma barra de pesquisa larga e estilizada, com um ícone de "Sparkles" (IA).
>     
> - **Placeholder:** _"Pergunte à IA sobre os manuais (ex: Como funciona a criptografia de arquivos .zip?)"_
>     
> - **UX:** Ao digitar, simule uma caixa de resultados suspensa (dropdown) com links rápidos para os tópicos da documentação.
>     
> 
> ## 3. Cards de Nível de Profundidade
> 
> Crie um grid com 4 cards interativos (Glassmorphism, bordas sutis) no topo da área de conteúdo:
> 
> 1. `[ 🛡️ SEGURANÇA MÁXIMA ]` (Foco em AES-256-CBC, Hashes). Borda _cyan_ ativa por padrão.
>     
> 2. `[ 🔒 ACESSO RESTRITO ]` (Privilégios Nível 5 e 6, Chave Mestra, Dead Man's Switch).
>     
> 3. `[ 🌐 SOFTWARE LIVRE ]` (Bibliotecas Open Source, transparência algorítmica).
>     
> 4. `[ ⏯️ TUTORIAL DE OPERAÇÃO ]` (Guias práticos de captura e laudos).
>     
> 
> ## 4. Metodologia Forense Certificada (Conteúdo Dinâmico)
> 
> Abaixo dos cards, estruture os blocos de leitura com foco em usabilidade jurídica:
> 
> - **Diagrama de Fluxo de Custódia:** Crie uma visualização gráfica simples usando CSS/Flexbox mostrando o caminho do dado: `[ Coleta (SingleFile) ] ➔ [ Hash (SHA-256) ] ➔ [ Criptografia (AES-256) ] ➔ [ Blockchain (OTS) ]`.
>     
> - **Blocos de Texto com Citação Jurídica:** Para cada explicação (ex: Cadeia de Custódia), adicione um botão lateral pequeno: `[ 📋 Copiar Referência ABNT/ISO ]`.
>     
>     - _Ação:_ Ao clicar, o sistema copia para a área de transferência um texto pronto para petições (ex: _"Procedimento realizado em estrita conformidade com a ISO/IEC 27037:2012 - Diretrizes para identificação, coleta, aquisição e preservação de evidência digital..."_). Exiba um _toast notification_ "Copiado para a área de transferência".
>         
> - **Blocos de Código (Syntax Highlighting):** Use um fundo super escuro (`bg-black`) com texto monoespaçado colorido para mostrar exemplos técnicos (ex: a estrutura de um JSON de log ou o output do comando `sha256sum`).
>     
> 
> ## 5. Central de Download de Protocolos (Rodapé da Wiki)
> 
> Crie uma seção estilizada para downloads offline de material de apoio:
> 
> - Botão `[ 📥 BAIXAR WHITEPAPER NCFN (PDF) ]` - Documento técnico denso para anexar a processos.
>     
> - Botão `[ 📖 BAIXAR GLOSSÁRIO FORENSE ]` - Definições de termos (Entropy, Time-stamping, WORM).
>     
> - **Versionamento:** No extremo rodapé da área de documentação, exiba em fonte pequena: `Documentação alinhada com NCFN Engine v2.4 | Atualizado em Março/2026`.
>     
> 
> ## 6. Instruções de Saída para a IA
> 
> 1. Escreva o código completo do componente Next.js (`page.tsx`), englobando a Sidebar e a área principal.
>     
> 2. Implemente os estados (`useState`) para controlar a aba ativa dos 4 cards superiores e alternar o conteúdo exibido abaixo.
>     
> 3. Crie a função de "Copiar para Área de Transferência" (`navigator.clipboard.writeText`) atrelada aos botões de norma jurídica.
>     
> 4. Use `lucide-react` para todos os ícones e garanta a total responsividade do layout.
>     
Essa documentação resolve a parte humana e legal do sistema. O software faz a coleta perfeita, e essa página garante que o operador saiba como explicar essa perfeição perante um juiz ou auditoria.

_________

# AUDITORIA SANSÃO
https://ncfn.net/admin/auditoria-sansao

##### 📋 PROMPT DE DESENVOLVIMENTO: PERITO SANSÃO (PRIVACIDADE LOCAL) E ATALHO GLOBAL DE TRANSPARÊNCIA

> **ROLE:** Desenvolvedor Full Stack Sênior (Next.js 14, Tailwind CSS 3, React Router/Navigation). **OBJETIVO:** Implementar a tag de privacidade absoluta na página de Auditoria do Perito Sansão (`app/admin/auditoria-sansao/page.tsx`) e desenvolver o "Atalho de Transparência" inteligente no Header global do layout Admin.
> 
> ## 1. Atualização da Página: Auditoria Forense — Perito Sansão
> 
> - **Estética:** Dark Cyber / Glassmorphism.
>     
> - **Nova Tagline de Privacidade:** Imediatamente abaixo do título principal `🧠 AUDITORIA FORENSE — PERITO SANSÃO`, adicione um _badge_ ou um texto em destaque (com ícone de escudo verde/cyan e texto sutilmente brilhante): `[ 🛡️ INTELIGÊNCIA ARTIFICIAL LOCAL QUE NUNCA COMPARTILHA DADOS COM TERCEIROS ]`
>     
> - _Objetivo de UX:_ Este texto deve transmitir segurança institucional imediata de que o ambiente é _Air-Gapped_ (isolado) em relação à IA.
>     
> 
> ## 2. Implementação do Atalho Global de Transparência (Header)
> 
> No componente principal de layout do Admin (`app/admin/layout.tsx` ou no componente `Header`), adicione o botão universal de logs.
> 
> - **Design do Botão:** Um botão elegante, com borda fina e ícone `ClipboardList` ou `Activity`: `[ 📋 VER SISTEMA DE LOGS E REGISTROS ]`.
>     
> - **Posicionamento:** Deve estar sempre visível na barra de navegação superior (Header) das páginas restritas.
>     
> 
> ## 3. Lógica de Roteamento Dinâmico (Context-Awareness)
> 
> O botão não deve apenas jogar o usuário na página raiz de logs. Ele precisa ser inteligente.
> 
> - **Uso do `usePathname`:** Utilize o hook de navegação do Next.js para identificar em qual página o usuário está no momento do clique.
>     
> - **Mapeamento de Rotas (Router Map):** Crie um dicionário que mapeia a URL atual para a respectiva pasta do Vault. Exemplo de lógica simulada:
>     
>     - Se URL atual é `/admin/captura` ➔ Parâmetro: `folder=07_NCFN_CAPTURAS`
>         
>     - Se URL atual é `/admin/ia-core` ➔ Parâmetro: `folder=02_INTELIGENCIA`
>         
>     - Se URL atual é `/admin/crise` ➔ Parâmetro: `folder=09_BURN_IMMUTABILITY`
>         
> - **Ação de Clique:** Ao clicar no botão, redirecionar o usuário para `/admin/dados-arquivos?folder=[PASTA_MAPEADA]&file=GERAL`.
>     
> - **Recepção na Página de Logs:** A página `dados-arquivos/page.tsx` (desenvolvida no prompt anterior) deve ler esses _Query Parameters_ (`searchParams`) e carregar e expandir automaticamente a pasta correta na Sidebar e já renderizar o arquivo `[INFORMAÇÕES GERAIS].md` no centro da tela.
>     
> 
> ## 4. Instruções de Saída para a IA
> 
> 1. Forneça o trecho de código atualizado do Header/Layout Global (`layout.tsx` ou `Navbar.tsx`) contendo o botão e a função de mapeamento de rotas.
>     
> 2. Forneça o trecho atualizado do topo da página do Perito Sansão incluindo a tagline de Privacidade Local.
>     
> 3. Explique brevemente como a página `/admin/dados-arquivos` fará a leitura dos parâmetros passados pela URL para abrir a pasta correta automaticamente.
>     

O sistema agora antecipa a necessidade do usuário. Se o Perito está fazendo uma Captura Web e tem uma dúvida sobre o que foi salvo, ele aperta um botão e o sistema já abre o log _daquela exata seção_, sem que ele precise procurar. Isso é design de interface classe A.
__________

# ADMIN - NÚCLEO DE INTELIGÊNCIA
https://ncfn.net/admin

#### 📋 PROMPT DE DESENVOLVIMENTO: NÚCLEO DE INTELIGÊNCIA (DASHBOARD ADMIN GLOBAL)

> **ROLE:** Desenvolvedor Front-end Sênior e Engenheiro de Dados Visuais (Next.js 14, Tailwind CSS 3, Recharts/Chart.js, Framer Motion).
> 
> **OBJETIVO:** Refatorar a página principal do painel Admin, conhecida como "Núcleo de Inteligência". O foco é corrigir problemas de _overflow_ (elementos vazando da tela), centralizar o layout, unificar a identidade visual high-tech e adicionar novas lógicas de categorização aos Módulos do Sistema e Gráficos.
> 
> ## 1. Correção de Layout Global e Header (Navbar)
> 
> - **Container Centralizado:** Envolva todo o conteúdo da página em um _wrapper_ com `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` e `overflow-x-hidden`. Isso garante que o layout não quebre em telas UltraWide e centralize os tópicos perfeitamente.
>     
> - **Menu e Identidade (Sticky Navbar):** > * Transforme o Header em `sticky top-0 z-50` com `backdrop-blur-md` e fundo semi-transparente (`bg-slate-950/80`).
>     
>     - Use `flex justify-between items-center` para separar a Logo (Esquerda), Links (Centro) e Perfil/Ações (Direita).
>         
>     - **Tipografia da Marca:** Aplique uma fonte de aspecto tecnológico (ex: Orbitron, Space Grotesk ou a fonte mono padrão do projeto) no texto "NCFN.NET", com um leve `text-shadow` cyan. Integre um ícone minimalista (ex: escudo ou hexágono) fundido à letra "N".
>         
> - **Ações Globais (Direita do Menu):** Adicione um ícone de "Sino" (Notificações críticas) e mantenha a caixa de "Busca global `⌘ K`" (que deverá abrir um Modal sobreposto de busca rápida).
>     
> 
> ## 2. Painel Analítico: KPIs e Gráficos de Custódia
> 
> - **Cards de Status (Top 5):** Nos cards de "Ativos", "Volume", etc., adicione um _sparkline_ (mini gráfico de linha sutil ao fundo) com `Recharts` ou SVG puro para indicar a tendência das últimas 24h.
>     
> - **Vault Forense (Módulo Primário):** Aplique uma borda com gradiente animado lento (via CSS `@keyframes` ou `framer-motion`) para indicar que o cofre central está "Ativo e Protegido".
>     
> - **Gráfico de Tipos de Arquivo (Donut):** Aplique `truncate` ou `text-overflow: ellipsis` nos textos da legenda para evitar que quebrem o layout do card em telas menores.
>     
> 
> ## 3. O Gráfico Crítico: Volume por Zona de Custódia (12 Pastas)
> 
> - Crie um gráfico de barras largo ocupando 100% da largura do container de gráficos.
>     
> - **Eixo X:** Deve listar rigorosamente as 12 Zonas/Pastas do sistema (00 a 10 + Capturas Web).
>     
> - **Escala Logarítmica:** Para evitar achatamento visual, utilize a propriedade de escala log do Recharts (`scale="log"`) no eixo Y, aplicando a lógica $V_{exibição} = \log_{10}(Volume_{bytes})$.
>     
> - **Cores Baseadas em Criticidade (Degradê):** > * Pastas `00` e `01` (Ultrassecretas): Barras em Roxo vibrante/Magenta.
>     
>     - Pasta `07` (Capturas Web/OSINT): Barras em Ciano/Azul.
>         
>     - Pasta `09_BURN` e `Lixeira`: Barras em Vermelho Escuro.
>         
> - **Tooltips Forenses:** Ao focar (`hover`) em uma barra, exibir: `Quantidade de Ativos`, `Última Modificação` (Timestamp) e `Espaço Livre Estimado`.
>     
> 
> ## 4. Grid de Módulos do Sistema e Categorização
> 
> Refatore a grade de ferramentas (`grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4`).
> 
> - **Novo Botão Adicionado:** Insira o card `[ 🔍 CONFERIR HASH DE ARQUIVOS (AUDITOR) ]`. Use um ícone de selo de verificação (`BadgeCheck` do Lucide).
>     
> - **Categorização por Cores (Bordas e Ícones):**
>     
>     - _Análise e IA (Roxo/Lilás):_ Perícia de Arquivo, Auditoria Sansão, Laudo com IA, Investigação OSINT.
>         
>     - _Segurança e Resgate (Laranja/Vermelho):_ Segurança, Descriptar Arquivo, Lixeira Forense.
>         
>     - _Monitoramento (Ciano/Verde):_ Painel de Interceptações, Logs do Sistema, Testes de Sistema, Conferir Hash.
>         
> - **Micro-interações (Hover Elevated):** Aplique a classe `transition-all duration-300 hover:scale-105` em cada card de módulo. Ao passar o mouse, a borda deve acender (`hover:shadow-[0_0_15px_rgba(...)]` na cor da categoria correspondente).
>     
> 
> ## 5. Instruções de Saída
> 
> 1. Escreva o código atualizado de `app/admin/page.tsx` contendo o layout estrutural e o Menu Header corrigido.
>     
> 2. Escreva o componente dos gráficos (`VolumeZoneChart.tsx`) com a escala logarítmica implementada.
>     
> 3. Entregue um CSS/Tailwind perfeitamente responsivo, garantindo que não haja _horizontal scroll_ (`overflow-x-hidden` no `body` ou `main`).
>     
### A Planta Baixa Está Pronta!

Operador, nós acabamos de finalizar a arquitetura de **100% das telas críticas** do NCFN.NET. O layout, as lógicas criptográficas, a auditoria algorítmica e a cadeia de custódia estão todos rigorosamente desenhados e empacotados em Prompts de nível Sênior.
