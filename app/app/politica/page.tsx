// @ts-nocheck
export const dynamic = "force-dynamic";

import { Scale, Crosshair, AlertTriangle, ShieldAlert, LockKeyhole, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PoliticaPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-mono text-sm uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Retornar ao Hub
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-tight">
            TERMOS DE CUSTÓDIA DIGITAL E COMPLIANCE JURÍDICO
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest leading-relaxed">
            PROTOCOLO DE OPERAÇÃO, RESPONSABILIDADE E CONFORMIDADE LEGAL — NEXUS CLOUD FORENSIC NETWORK
          </p>
        </div>

        {/* Section 1 — blue */}
        <div
          className="bg-slate-900/50 backdrop-blur-xl border rounded-2xl p-8 space-y-4"
          style={{ borderColor: "rgba(59,130,246,0.4)" }}
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <Scale className="w-5 h-5 text-blue-400 shrink-0" />
            Seção 1 — Natureza do Serviço e Conformidade Normativa
          </h2>
          <p className="text-slate-300 leading-relaxed">
            O NCFN é uma arquitetura de infraestrutura forense digital descentralizada (self-hosted). Sua engenharia de
            preservação foi desenhada em estrita observância a marcos regulatórios globais e nacionais, incluindo, mas
            não se limitando a:
          </p>
          <p className="text-slate-300 leading-relaxed">
            <span className="font-semibold text-white">Brasil:</span> Código de Processo Penal (
            <code className="font-mono text-sm bg-slate-800 px-1 rounded">Art. 158-A</code> e seguintes — Cadeia de
            Custódia), Código de Processo Civil (
            <code className="font-mono text-sm bg-slate-800 px-1 rounded">Art. 369 e 411</code> — Provas Digitais),
            Marco Civil da Internet (
            <code className="font-mono text-sm bg-slate-800 px-1 rounded">Lei 12.965/14</code>) e LGPD (
            <code className="font-mono text-sm bg-slate-800 px-1 rounded">Lei 13.709/18</code>).
          </p>
          <p className="text-slate-300 leading-relaxed">
            <span className="font-semibold text-white">Internacional:</span>{" "}
            <code className="font-mono text-sm bg-slate-800 px-1 rounded">ISO/IEC 27037</code> (Diretrizes para
            identificação, coleta, aquisição e preservação de evidência digital), Convenção de Budapeste sobre o
            Cibercrime, Regulamento Geral de Proteção de Dados (
            <code className="font-mono text-sm bg-slate-800 px-1 rounded">GDPR</code> — Europa) e os princípios das{" "}
            <code className="font-mono text-sm bg-slate-800 px-1 rounded">Federal Rules of Evidence (FRE)</code> —
            EUA.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Sendo um software de execução autônoma, as chaves criptográficas e dados são de posse exclusiva do
            administrador do nó, sem qualquer acesso, auditoria ou intervenção remota pelos desenvolvedores do
            protocolo original.
          </p>
        </div>

        {/* Section 2 — green */}
        <div
          className="bg-slate-900/50 backdrop-blur-xl border rounded-2xl p-8 space-y-4"
          style={{ borderColor: "rgba(34,197,94,0.4)" }}
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-green-400 shrink-0" />
            Seção 2 — Garantias da Captura Web Integrada NCFN
          </h2>
          <ul className="space-y-3 text-slate-300 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-green-400 font-bold shrink-0 mt-0.5">•</span>
              <span>
                <span className="font-semibold text-white">Isolamento de Coleta:</span> O acesso ao alvo ocorre via
                infraestrutura de servidor (Headless), garantindo que a captura não sofra interferência do ambiente
                cliente nem de extensões de navegador, preservando a integridade técnica do registro.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-400 font-bold shrink-0 mt-0.5">•</span>
              <span>
                <span className="font-semibold text-white">Acondicionamento e Armazenamento:</span> Congelamento
                estrutural da página em arquivo estático único, armazenado em cofre criptografado (
                <code className="font-mono text-sm bg-slate-800 px-1 rounded">AES-256</code>).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-400 font-bold shrink-0 mt-0.5">•</span>
              <span>
                <span className="font-semibold text-white">Levantamento de Dados Ocultos:</span> Extração automatizada
                de logs de rede (Tráfego{" "}
                <code className="font-mono text-sm bg-slate-800 px-1 rounded">HAR</code>), metadados latentes, IPs de
                origem e resolução de DNS no exato milissegundo da captura.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-400 font-bold shrink-0 mt-0.5">•</span>
              <span>
                <span className="font-semibold text-white">Perícia Prévia Eletrônica e Veracidade:</span> Confirmação
                por testemunhas de terceiros (Wayback Machine) e carimbo temporal descentralizado em Blockchain (
                <code className="font-mono text-sm bg-slate-800 px-1 rounded">OpenTimestamps</code> /{" "}
                <code className="font-mono text-sm bg-slate-800 px-1 rounded">RFC 3161</code>).
              </span>
            </li>
          </ul>
        </div>

        {/* Section 3 — yellow */}
        <div
          className="bg-slate-900/50 backdrop-blur-xl border rounded-2xl p-8 space-y-4"
          style={{ borderColor: "rgba(234,179,8,0.4)" }}
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            Seção 3 — Restrições e Limitações de Responsabilidade
          </h2>
          <p className="text-slate-300 leading-relaxed">
            O sistema garante a <span className="font-semibold text-white">imutabilidade pós-custódia</span> dos
            arquivos recebidos, registrando hash criptográfico no momento do ingresso ao cofre. Contudo, não é possível
            atestar a integridade original do material <span className="italic">anterior</span> ao ato de upload — a
            higidez do arquivo em sua origem é ônus probatório intransferível do depositante.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Defensores jurídicos que utilizem evidências custodiadas nesta plataforma devem estar preparados para
            demonstrar a cadeia completa de custódia desde a geração do arquivo original até o ingresso no sistema,
            conforme exigido pelos marcos normativos aplicáveis.
          </p>
        </div>

        {/* Section 4 — red */}
        <div
          className="bg-slate-900/50 backdrop-blur-xl border rounded-2xl p-8 space-y-4"
          style={{ borderColor: "rgba(239,68,68,0.4)" }}
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            Seção 4 — Proibição Absoluta de Conteúdo Ilícito
          </h2>
          <p className="text-slate-300 leading-relaxed">
            É vedado, em caráter absoluto e sem exceção, o armazenamento, transmissão, hospedagem ou publicação de
            conteúdo vinculado a:
          </p>
          <ul className="space-y-2 text-slate-300 leading-relaxed">
            {[
              "Exploração sexual infantojuvenil (CSAM) em qualquer formato ou modalidade",
              "Terrorismo, financiamento de grupos armados e infraestrutura de ataque a estados soberanos",
              "Operações de tráfico de drogas, armas ou pessoas",
              "Fraude digital, estelionato eletrônico e engenharia social ofensiva",
              "Distribuição de ransomware, malware ou qualquer software destrutivo a infraestruturas críticas",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-300 leading-relaxed">
            Usuários que descumprirem estas proibições afastam irrevogavelmente os criadores do protocolo de qualquer
            responsabilidade civil ou penal decorrente do uso irregular, respondendo pessoal e integralmente pelas
            consequências jurídicas aplicáveis em sua jurisdição.
          </p>
        </div>

        {/* Section 5 — purple */}
        <div
          className="bg-slate-900/50 backdrop-blur-xl border rounded-2xl p-8 space-y-4"
          style={{ borderColor: "rgba(168,85,247,0.4)" }}
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <LockKeyhole className="w-5 h-5 text-purple-400 shrink-0" />
            Seção 5 — Garantia de Custódia de Documentos e Segurança
          </h2>
          <p className="text-slate-300 leading-relaxed">
            O NCFN garante{" "}
            <span className="font-semibold text-white">
              integridade matemática, congelamento criptográfico e versionamento imutável
            </span>{" "}
            de todo arquivo ingressado no cofre durante o período em que o sistema permanece operacional sob
            administração do nó responsável.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Todavia, a <span className="font-semibold text-white">custódia física</span> — incluindo rotinas de backup
            offsite, proteção contra ransomware no sistema operacional hospedeiro e guarda das chaves criptográficas
            mestras — é responsabilidade exclusiva do administrador do ambiente. O protocolo não implementa backdoor,
            mecanismo de recuperação de chaves ou escrow criptográfico de qualquer natureza.
          </p>
          <p className="text-slate-300 leading-relaxed">
            <span className="font-semibold text-red-400">Atenção:</span> A perda das chaves criptográficas implica
            perda definitiva e irrecuperável das evidências custodiadas. Não existe procedimento de recuperação de
            acesso pelos desenvolvedores do protocolo.
          </p>
        </div>

        {/* Footer accept notice */}
        <div className="border-t border-slate-800 pt-8">
          <p className="text-slate-500 text-sm italic leading-relaxed text-center">
            O aceite implícito e irrevogável destes Termos de Responsabilidade e Compliance é formalizado tecnicamente
            no momento em que o código e a arquitetura NCFN entram em execução (boot inicial) no ambiente de
            implantação do usuário final.
          </p>
        </div>

        {/* Footer stamp */}
        <div className="text-center opacity-30 font-mono text-[10px] uppercase tracking-widest pb-6">
          Emissão Oficial • NCFN Intelligence Protocol • {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
}
