/**
 * Seed inicial das seções OSINT
 * Executar com: npx tsx prisma/seed-osint.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SECTIONS = [
  {
    slug: "dashboard",
    title: "Dashboard de Ferramentas",
    icon: "LayoutDashboard",
    order: 0,
    content: `# 🛠️ Dashboard de Ferramentas OSINT & Forense

| **Categoria** | **Recurso** | **Funcionalidade Principal** | **Tags** | **Link** |
| --- | --- | --- | --- | --- |
| **Doutrina** | **RFC 3227** | Estabelece a ordem de volatilidade e coleta de evidências digitais. | #Forense #Doutrina | [Link](https://academiadeforensedigital.com.br/rfc-3227-melhores-praticas-referencias/) |
| **Preservação** | **Wayback / Archive** | Recupera versões antigas de sites e "congela" provas que podem ser apagadas. | #Preservação #Web | [Link](https://web.archive.org/) |
| **Inteligência** | **OSMP NGO** | Identificação técnica de munições e armamentos de guerra através de fotos. | #Balística #Armas | [Link](https://osmp.ngo/resources/) |
| **CARINT** | **CarNet.ai** | IA que identifica marca, modelo e ano de um veículo a partir de uma foto. | #Veículos #Imagens | [Link](https://carnet.ai/) |
| **Website Recon** | **Web-Check** | Raio-X completo de um site: IP, servidor, DNS, tecnologias e segurança. | #Recon #Infra | [Link](https://web-check.as93.net/) |
| **Framework** | **OSINT Framework** | Mapa mental interativo que categoriza milhares de ferramentas de busca. | #Diretório #OSINT | [Link](https://osintframework.com/) |
| **Instagram** | **Instaloader** | Download massivo de posts, stories e metadados de contas públicas. | #SOCMINT #IG | [Link](https://bellingcat.gitbook.io/toolkit/more/all-tools/instaloader) |
| **Google** | **GHunt** | Investiga e-mails Gmail para descobrir nome real, ID, Maps e serviços ativos. | #Google #Gmail | [Link](https://github.com/mxrch/GHunt) |
| **YouTube** | **YT Metadata** | Extrai data exata de upload, tags e miniaturas ocultas de vídeos. | #YouTube #Metadados | [Link](https://mattw.io/youtube-metadata/) |
| **Phishing** | **SquatSquasher** | Identifica domínios falsos criados para aplicar golpes (typosquatting). | #Golpes #Phishing | [Link](https://github.com/Stuub/SquatSquasher) |
| **Dark Web** | **OnionSearch** | Buscador especializado para indexar e encontrar links na rede Tor (.onion). | #DarkWeb #Tor | [Link](https://github.com/megadose/OnionSearch) |
| **Forense** | **IPED** | Ferramenta oficial (PF) para processar e analisar grandes volumes de dados apreendidos. | #Forense #PF | [Link](https://github.com/sepinf-inc/IPED) |
| **WhatsApp** | **WhatsOSINT** | Monitora status, foto de perfil e presença online de números de WhatsApp. | #WhatsApp #Tel | [Link](https://github.com/HackUnderway/WhatsOSINT) |
| **Telefonia** | **OsintNum** | Validação de operadora e localização aproximada de números internacionais/nacionais. | #Phone #Telecom | [Link](https://github.com/HackUnderway/OsintNum) |
| **Username** | **Blackbird** | Busca rápida por um nome de usuário em mais de 500 redes sociais simultaneamente. | #Username #SOCMINT | [Link](https://github.com/p1ngul1n0/blackbird) |
| **E-mail** | **Holehe** | Verifica se um e-mail está cadastrado em sites como Twitter, Instagram e LinkedIn. | #Email #OSINT | [Link](https://github.com/megadose/holehe) |
| **Mobile** | **MVT Toolkit** | Detecta vestígios de invasão e spywares (como o Pegasus) em iOS e Android. | #Mobile #Spyware | [Link](https://github.com/mvt-project/mvt) |
| **Windows** | **Hayabusa** | Analisa logs do Windows em segundos para detectar invasões ou uso indevido. | #IncidentResponse #Logs | [Link](https://github.com/Yamato-Security/hayabusa) |
| **Imagens** | **Exif Looter** | Extrai coordenadas GPS e data/hora originais escondidas em arquivos de imagem. | #EXIF #GPS | [Link](https://github.com/aydinnyunus/exifLooter) |
| **Monitoramento** | **Oblivion** | Monitora em tempo real se credenciais (e-mails/senhas) foram vazadas na web. | #DataBreach #Leaks | [Link](https://github.com/loseys/Oblivion) |`,
  },
  {
    slug: "arsenal",
    title: "Arsenal OSINT — 50 Ferramentas",
    icon: "Crosshair",
    order: 1,
    content: `# 🛡️ Arsenal OSINT & Forense — Expansão (50 Ferramentas)

| **Categoria** | **Recurso** | **Funcionalidade Principal** | **Tags** | **Link** |
| --- | --- | --- | --- | --- |
| **Facial/Imagens** | **PimEyes** | Motor de busca facial que encontra fotos de uma pessoa em toda a web. | #FaceRec #OSINT | [Link](https://pimeyes.com/) |
| **Facial/Imagens** | **FaceCheck.ID** | Busca pessoas em bancos de dados de criminosos e redes sociais por foto. | #Investigação #Face | [Link](https://facecheck.id/) |
| **Pessoas/Socmint** | **Sherlock** | A ferramenta definitiva para caçar usernames em centenas de sites. | #Username #Python | [Link](https://github.com/sherlock-project/sherlock) |
| **E-mail/Leaks** | **DeHashed** | Maior banco de dados de ativos vazados (e-mails, senhas, IPs). | #Breach #Leaked | [Link](https://dehashed.com/) |
| **E-mail/Leaks** | **Have I Been Pwned** | Verifica se um e-mail ou telefone foi exposto em vazamentos públicos. | #Security #Leaks | [Link](https://haveibeenpwned.com/) |
| **Cripto/Fin** | **Blockchain Explorer** | Rastreia transações de Bitcoin e visualiza o fluxo de carteiras. | #Crypto #FinINT | [Link](https://www.blockchain.com/explorer) |
| **Cripto/Fin** | **Breadcrumbs** | Ferramenta visual para investigação de crimes com criptomoedas. | #Crypto #Tracing | [Link](https://www.breadcrumbs.app/) |
| **Infra/DNS** | **Shodan** | O "Google" para dispositivos conectados (câmeras, servidores, IoT). | #IoT #Recon | [Link](https://www.shodan.io/) |
| **Infra/DNS** | **Censys** | Analisa a superfície de ataque e certificados SSL de qualquer domínio. | #Network #DNS | [Link](https://censys.io/) |
| **Infra/DNS** | **SpiderFoot** | Automação total de OSINT: integra Shodan, HaveIBeenPwned e +100 fontes. | #Automation #Recon | [Link](https://github.com/smicallef/spiderfoot) |
| **Infra/DNS** | **theHarvester** | Coleta e-mails, subdomínios, IPs e nomes de funcionários de uma empresa. | #Recon #Enterprise | [Link](https://github.com/laramies/theHarvester) |
| **Forense/Live** | **Velociraptor** | Monitoramento e resposta a incidentes (DFIR) em escala para redes. | #DFIR #Forense | [Link](https://github.com/Velocidex/velociraptor) |
| **Forense/Disk** | **Autopsy** | Interface gráfica para o Sleuth Kit; análise de discos e cartões SD. | #Forense #Autopsy | [Link](https://www.autopsy.com/) |
| **Forense/Disk** | **FTK Imager** | Padrão ouro para criação de imagens forenses preservando integridade. | #Imaging #Evidence | [Link](https://www.exterro.com/ftk-imager) |
| **Forense/Mem** | **Volatility 3** | O framework principal para análise forense de memória RAM. | #Memory #Forensics | [Link](https://github.com/volatilityfoundation/volatility3) |
| **GEOINT** | **PeakVisor** | Identifica montanhas e picos em fotos para geolocalização precisa. | #GEOINT #Terrain | [Link](https://peakvisor.com/) |
| **GEOINT** | **Wikimapia** | Mapa colaborativo que detalha áreas militares e instalações restritas. | #Maps #Intelligence | [Link](https://wikimapia.org/) |
| **GEOINT** | **SunCalc** | Calcula a posição do sol para determinar data/hora de fotos por sombras. | #Chronolocation | [Link](https://apps.suncalc.org/) |
| **SOCMINT** | **TweetDeck** | Monitoramento de termos e hashtags no X (Twitter) em tempo real. | #Twitter #RealTime | [Link](https://tweetdeck.twitter.com/) |
| **SOCMINT** | **SocialBlade** | Analisa estatísticas e crescimento de contas em YT, Twitch e Instagram. | #Analytics #Media | [Link](https://socialblade.com/) |
| **SOCMINT** | **Twint** | Scraper de Twitter que não exige API oficial (extrai fones e e-mails). | #Twitter #Scraping | [Link](https://github.com/twintproject/twint) |
| **Username** | **Namechk** | Verifica a disponibilidade/presença de uma marca/nome em centenas de sites. | #Brand #Username | [Link](https://namechk.com/) |
| **Metadados** | **ExifTool** | A ferramenta de linha de comando mais poderosa para ler/escrever metadados. | #Metadata #CLI | [Link](https://exiftool.org/) |
| **Metadados** | **Metadata2Go** | Visualizador online de metadados para diversos formatos de arquivos. | #Metadata #Web | [Link](https://www.metadata2go.com/) |
| **Mobile** | **MobSF** | Framework de análise estática e dinâmica para apps Android/iOS. | #Mobile #Malware | [Link](https://github.com/MobSF/Mobile-Security-Framework-MobSF) |
| **Telefonia** | **TrueCaller** | Identifica nomes associados a números de telefone via crowdsourcing. | #Phone #Identidade | [Link](https://www.truecaller.com/) |
| **Telefonia** | **PhoneInfoga** | Ferramenta avançada para scan de números e detecção de operadora/local. | #Phone #Scan | [Link](https://github.com/sundowndev/phoneinfoga) |
| **Dark Web** | **Ahmia** | Motor de busca que filtra conteúdo abusivo na rede Tor. | #Search #Onion | [Link](https://ahmia.fi/) |
| **Inteligência** | **Maltego** | Visualização de gráficos de relacionamento entre pessoas e infraestrutura. | #Graph #Intel | [Link](https://www.maltego.com/) |
| **Empresas** | **OpenCorporates** | A maior base de dados aberta de empresas e diretores do mundo. | #FinINT #Corporate | [Link](https://opencorporates.com/) |
| **Empresas** | **Crunchbase** | Informações sobre investimentos, fundadores e conexões empresariais. | #FinINT #Business | [Link](https://www.crunchbase.com/) |
| **Nuvem** | **CloudEnum** | Busca por buckets da AWS, Azure e Google Cloud expostos. | #Cloud #Leaks | [Link](https://github.com/initstring/cloud_enum) |
| **Documentos** | **FOCA** | Extrai metadados de documentos (PDF, DOCX) para revelar nomes e software. | #Metadata #Docs | [Link](https://github.com/ElevenPaths/FOCA) |
| **Documentos** | **IntelX** | Motor de busca para dumps de dados, pastes e documentos históricos. | #Intelligence #Breach | [Link](https://intelx.io/) |
| **Rede/IP** | **Wireshark** | Analisador de tráfego de rede; essencial para forense de rede. | #Network #Packet | [Link](https://www.wireshark.org/) |
| **Rede/IP** | **IPinfo** | Dados precisos sobre ASN, localização e tipo de IP (Proxy/VPN). | #IP #Geoloc | [Link](https://ipinfo.io/) |
| **Rádio/Sinal** | **MarineTraffic** | Monitoramento global de navios e embarcações via AIS. | #Maritime #OSINT | [Link](https://www.marinetraffic.com/) |
| **Forense Web** | **SingleFile** | Extensão para salvar uma página web completa em um único arquivo HTML. | #Evidence #Preservation | [Link](https://github.com/gildas-lormeau/SingleFile) |
| **Pesquisa** | **Google Dork Check** | Gerador e base de dados de Google Dorks para buscas avançadas. | #Dorks #Google | [Link](https://www.exploit-db.com/google-hacking-database) |
| **Segurança** | **VirusTotal** | Analisa arquivos e URLs para detectar malwares e infraestrutura maliciosa. | #Malware #ThreatIntel | [Link](https://www.virustotal.com/) |
| **Segurança** | **URLScan.io** | Faz um "print" e analisa o comportamento de uma URL sem visitá-la. | #Sandbox #Web | [Link](https://urlscan.io/) |
| **Nacional (BR)** | **Portal da Transparência** | Fonte primária para investigação de gastos e vínculos públicos no Brasil. | #GovBR #FinINT | [Link](https://portaldatransparencia.gov.br/) |
| **Nacional (BR)** | **Escavador** | Agregador de processos judiciais e diários oficiais brasileiros. | #Legal #Brasil | [Link](https://www.escavador.com/) |`,
  },
  {
    slug: "sistemas",
    title: "Sistemas & Frameworks",
    icon: "Server",
    order: 2,
    content: `# 🖥️ Sistemas e Frameworks Estruturais para OSINT

| **Categoria** | **Sistema / Framework** | **Funcionalidade Principal** | **Tags** | **Link** |
| --- | --- | --- | --- | --- |
| **Sistemas Operacionais** | **CSI Linux** | Sistema focado em investigações, com módulos para Dark Web, SIGINT e preservação de evidências. | #Distro #Investigação | [Link](https://csilinux.com/) |
| **Sistemas Operacionais** | **Tsurugi Linux** | Distro focada em DFIR (Digital Forensics and Incident Response) e análise de evidências vivas. | #Forense #DFIR | [Link](https://tsurugi-linux.org/) |
| **Sistemas Operacionais** | **Trace Labs OSINT VM** | Construída sobre o Kali Linux, é otimizada especificamente para busca de pessoas desaparecidas. | #SOCMINT #MissingPersons | [Link](https://www.tracelabs.org/) |
| **Sistemas Operacionais** | **Buscador OS** | VM baseada em Debian, projetada especificamente para analistas de inteligência e OSINT. | #Intel #Analysis | [Link](https://inteltechniques.com/) |
| **Framework de Gestão** | **Maltego** | Sistema de inteligência gráfica para mapear conexões entre pessoas, redes e infraestruturas. | #GraphIntel #Maltego | [Link](https://www.maltego.com/) |
| **Framework de Gestão** | **Kasware (Social Links)** | Plataforma profissional de investigação com integração de IA para reconhecimento facial e buscas em massa. | #Professional #FacialRec | [Link](https://sociallinks.io/) |
| **Automação** | **SpiderFoot** | Framework que automatiza a coleta de dados de mais de 100 fontes diferentes simultaneamente. | #Automation #Recon | [Link](https://www.spiderfoot.net/) |
| **Inteligência de Rede** | **Shodan** | Sistema de varredura global que indexa todos os dispositivos conectados à internet (IoT). | #IoT #Infrastructure | [Link](https://www.shodan.io/) |
| **Coleta de Provas** | **Hunchly** | Sistema que documenta e captura automaticamente cada passo da sua navegação para fins judiciais. | #Custódia #Evidência | [Link](https://www.hunchly.com/) |
| **Sistemas de Busca** | **IntelTechniques** | Coleção de ferramentas e scripts customizados pelo especialista Michael Bazzell. | #Doutrina #OSINT | [Link](https://inteltechniques.com/) |
| **Busca de Dados** | **Intelligence X** | Motor de busca e arquivo que permite pesquisar em vazamentos de dados, e-mails e histórico da web. | #DarkWeb #DataBreach | [Link](https://intelx.io/) |
| **Monitoramento** | **EchoSec / Flashpoint** | Sistemas de nível governamental para monitoramento de ameaças em redes sociais e fóruns da Deep Web. | #Government #Intel | [Link](https://www.flashpoint.io/) |
| **Mapeamento/Geo** | **Google Earth Pro** | Essencial para análise cronológica de imagens de satélite e geolocalização tática. | #GEOINT #Satélite | [Link](https://www.google.com/earth/) |
| **Análise de Arquivos** | **ExifTool** | O motor padrão da indústria para extração e análise de metadados em qualquer tipo de arquivo. | #Metadata #CLI | [Link](https://exiftool.org/) |
| **Forense Mobile** | **Cellebrite Reader** | Sistema (leitor) para análise de extrações de dispositivos móveis, muito usado em perícias criminais. | #Mobile #Perícia | [Link](https://www.cellebrite.com/) |`,
  },
  {
    slug: "fluxogramas",
    title: "Fluxogramas de Investigação",
    icon: "GitBranch",
    order: 3,
    content: `# 🔄 Fluxogramas de Investigação OSINT

## 📊 Metodologia OSINT Geral

\`\`\`mermaid
flowchart TD
    Start([Início da Investigação]) --> Define[Definir Objetivo]
    Define --> Collect[Coletar Informações Iniciais]
    Collect --> Plan[Planejar Estratégia]
    Plan --> Legal{Verificar Legalidade?}
    Legal -->|Não Legal| Stop1([❌ Cancelar Investigação])
    Legal -->|Legal| Sources[Identificar Fontes]
    Sources --> Execute[Executar Consultas]
    Execute --> Document[Documentar Evidências]
    Document --> CrossCheck[Cruzar Informações]
    CrossCheck --> Verify{Dados Consistentes?}
    Verify -->|Não| MoreData{Precisa mais dados?}
    MoreData -->|Sim| Execute
    MoreData -->|Não| Analyze
    Verify -->|Sim| Analyze[Analisar Resultados]
    Analyze --> Report[Gerar Relatório]
    Report --> End([✅ Fim])
\`\`\`

---

## 🏢 Due Diligence Empresarial

\`\`\`mermaid
flowchart TD
    Start([Iniciar Due Diligence]) --> Input[Coletar CNPJ/Razão Social]
    Input --> RF[1. Receita Federal — Situação Cadastral]
    RF --> CheckRF{CNPJ Regular?}
    CheckRF -->|Não| Alert1[🚩 CNPJ Irregular]
    CheckRF -->|Sim| JUCESP
    Alert1 --> Decision1{Continuar Análise?}
    Decision1 -->|Não| Stop([❌ Reprovado])
    Decision1 -->|Sim| JUCESP
    JUCESP[2. JUCESP — Contrato Social] --> Portal[3. Portal Transparência]
    Portal --> CheckContracts{Contratos Suspeitos?}
    CheckContracts -->|Sim| Alert2[🚩 Analisar Profundamente]
    CheckContracts -->|Não| Consumer
    Alert2 --> Consumer[4. Consumidor.gov.br]
    Consumer --> Judicial[5. CNJ/JusBrasil — Processos]
    Judicial --> CheckProcesses{Processos Graves?}
    CheckProcesses -->|Sim| Alert4[🚩 Histórico Problemático]
    CheckProcesses -->|Não| Partners[6. Verificar Sócios]
    Alert4 --> Partners
    Partners --> Final{Aprovado?}
    Final -->|Sim| Approved([✅ Aprovado])
    Final -->|Não| Stop
\`\`\`

---

## 👤 Verificação de Pessoa Física

\`\`\`mermaid
flowchart TD
    Start([Iniciar Verificação]) --> Input[Coletar CPF/Nome Completo]
    Input --> CPF[1. Receita Federal — CPF]
    CPF --> CheckCPF{CPF Regular?}
    CheckCPF -->|Não| Alert1[🚩 CPF Irregular]
    CheckCPF -->|Sim| CNJ
    Alert1 --> Decision{Eliminatório?}
    Decision -->|Sim| Stop([❌ Reprovado])
    Decision -->|Não| CNJ
    CNJ[2. CNJ/Escavador — Processos] --> CheckCriminal{Processos Criminais?}
    CheckCriminal -->|Sim| Serious{Processo Grave?}
    Serious -->|Sim| Stop
    Serious -->|Não| Transparency
    CheckCriminal -->|Não| Transparency
    Transparency[3. Portal Transparência] --> TSE[4. TSE — Doações]
    TSE --> Social[5. Redes Sociais]
    Social --> Email[6. Have I Been Pwned]
    Email --> Final{Resultado Final?}
    Final -->|Aprovado| Approved([✅ Aprovado])
    Final -->|Reprovado| Stop
    Final -->|Ressalvas| Conditional([⚠️ Aprovado com Ressalvas])
\`\`\`

---

## 🚗 Verificação de Veículo

\`\`\`mermaid
flowchart TD
    Start([Verificar Veículo]) --> Input[Coletar Placa/Chassi/RENAVAM]
    Input --> DETRAN[1. DETRAN — Dados Básicos]
    DETRAN --> CheckStatus{Status OK?}
    CheckStatus -->|Restrição Judicial| Fraud1([🚨 NÃO COMPRAR])
    CheckStatus -->|OK| Theft
    Theft[2. SINESP — Roubo/Furto] --> Stolen{Roubo?}
    Stolen -->|Sim| Fraud1
    Stolen -->|Não| Debts[3. IPVA + Multas]
    Debts --> Seller[4. Validar Vendedor]
    Seller --> Price[5. Tabela FIPE]
    Price --> PriceOK{Preço OK?}
    PriceOK -->|Muito Baixo| Alert[🚩 Preço Suspeito]
    PriceOK -->|OK| Doc[6. Verificar Documentação]
    Alert --> Doc
    Doc --> DocOK{Documentos Legítimos?}
    DocOK -->|Não| Fraud2([🚨 Documentação Falsa])
    DocOK -->|Sim| Buy([✅ Pode Comprar])
\`\`\`

---

## 🌐 Análise de Domínio Suspeito

\`\`\`mermaid
flowchart TD
    Start([Domínio Suspeito]) --> Whois[1. WHOIS — Registro.br]
    Whois --> Recent{Criado Recentemente?}
    Recent -->|Menos de 30 dias| Alert1[🚩 Domínio Muito Novo]
    Recent -->|Não| RDAP[2. RDAP — Dados Técnicos]
    Alert1 --> RDAP
    RDAP --> VT[3. VirusTotal — Reputação]
    VT --> HasMalware{Malware?}
    HasMalware -->|Sim| Fraud1([🚨 FRAUDE — Não Acessar])
    HasMalware -->|Não| URLScan[4. URLScan.io — Screenshot]
    URLScan --> Suspicious{Suspeito?}
    Suspicious -->|Sim| Alert2[🚩 Design Fraudulento]
    Suspicious -->|Não| SSL[5. Verificar SSL]
    Alert2 --> SSL
    SSL --> ValidSSL{SSL Válido?}
    ValidSSL -->|Não| Alert3[🚩 Sem Segurança]
    ValidSSL -->|Sim| Safe([✅ Domínio Confiável])
    Alert3 --> Caution([⚠️ Usar com Cautela])
\`\`\`

---

## 🌳 Árvore de Decisão: Qual Investigação Fazer?

\`\`\`mermaid
flowchart TD
    Start([Iniciar OSINT]) --> Question[O que você precisa investigar?]
    Question --> Type{Tipo?}
    Type -->|Pessoa| Person[👤 Verificação Pessoa Física]
    Type -->|Empresa| Company[🏢 Due Diligence Empresarial]
    Type -->|Imóvel| Property[🏠 Fraude Imobiliária]
    Type -->|Veículo| Vehicle[🚗 Verificação Veículo]
    Type -->|Digital| Digital{O que verificar?}
    Digital -->|Site/Domínio| Domain[🌐 Domínio Suspeito]
    Digital -->|E-mail| Email[📧 Have I Been Pwned + EmailRep]
    Digital -->|Telefone| Phone[📱 Truecaller + PhoneInfoga]
    Person --> Execute1[Ver fluxo: Pessoa Física]
    Company --> Execute4[Ver fluxo: Due Diligence]
    Property --> Execute7[Ver fluxo: Imóvel]
    Vehicle --> Execute9[Ver fluxo: Veículo]
    Domain --> Execute10[Ver fluxo: Domínio]
    Email --> End([Fim])
    Phone --> End
    Execute1 --> End
    Execute4 --> End
    Execute7 --> End
    Execute9 --> End
    Execute10 --> End
\`\`\``,
  },
  {
    slug: "metodologia",
    title: "Como Usar os Fluxogramas",
    icon: "BookOpen",
    order: 4,
    content: `# 📝 Como Usar os Fluxogramas

### 1. Identificar o Tipo de Investigação
Use a **Árvore de Decisão** para determinar qual fluxo seguir.

### 2. Seguir o Fluxo Passo a Passo
Cada caixa representa uma ação ou consulta específica. Execute na ordem apresentada.

### 3. Observar os Alertas

| Símbolo | Significado |
| --- | --- |
| 🚩 **Red Flag** | Problema grave, avaliar se continua |
| ⚠️ **Alerta** | Atenção necessária, mas não eliminatório |
| ✅ **Aprovado** | Tudo certo |
| 🚨 **Fraude** | Indicativo forte de fraude |
| ❌ **Reprovado** | Critério eliminatório |

### 4. Documentar Cada Etapa
- Salve screenshots das consultas
- Anote data e hora
- Registre fontes utilizadas
- **Mantenha cadeia de custódia** (RFC 3227)

### 5. Cruzar Informações
Não confie em uma única fonte. Valide com múltiplas consultas.

---

> **Última atualização:** Dezembro 2025 — Projeto OSINT Brazuca`,
  },
];

async function main() {
  console.log("Seeding OSINT sections...");

  for (const section of SECTIONS) {
    await prisma.osintSection.upsert({
      where: { slug: section.slug },
      update: { title: section.title, icon: section.icon, content: section.content, order: section.order },
      create: section,
    });
    console.log(`  ✓ ${section.title}`);
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
