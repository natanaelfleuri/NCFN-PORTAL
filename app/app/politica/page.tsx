"use client";
import React from 'react';
import { ShieldAlert, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PolicyPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-gray-300 leading-relaxed">
            <Link href="/" className="inline-flex items-center gap-2 text-[#00f3ff] hover:text-white transition-colors mb-4 font-mono text-sm uppercase tracking-widest">
                <ArrowLeft className="w-4 h-4" /> Retornar ao Hub
            </Link>

            <div className="flex items-center gap-4 border-b border-gray-800 pb-8">
                <ShieldAlert className="w-12 h-12 text-[#bc13fe]" />
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter">Políticas de Uso e Responsabilidade</h1>
                    <p className="text-gray-500 font-mono text-xs mt-1 uppercase tracking-widest">Protocolo de Operação NCFN</p>
                </div>
            </div>

            <div className="space-y-8 glass-panel p-6 sm:p-10 rounded-3xl border border-gray-800/50 bg-black/40 shadow-2xl">
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" /> 1. Natureza do Serviço e Infraestrutura
                    </h2>
                    <p>
                        O <strong>NCFN (Neural Computing & Future Networks)</strong> é uma ferramenta de infraestrutura lógica, descentralizada e self-hosted (auto-hospedada), projetada para armazenamento e gestão de dados com foco em criptografia e custódia privada. Nós fornecemos apenas o código; o ambiente de execução e os servidores físicos operacionais são de posse, configuração e controle absolutos do administrador do nó.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#bc13fe]" /> 2. Responsabilidade Integral do Usuário
                    </h2>
                    <p>
                        <strong>Os arquivos armazenados, processados e trafegados através desta plataforma são de inteira, exclusiva e intransferível responsabilidade do usuário.</strong>
                        Devido à natureza técnica do sistema e à criptografia aplicada, a entidade desenvolvedora do protocolo NCFN não audita, não monitora, não tem posse sobre chaves de acesso alheias e, portanto, é tecnologicamente incapaz de verificar o conteúdo custodiado no servidor do usuário.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" /> 3. Proibição Absoluta de Conteúdo Ilícito
                    </h2>
                    <div className="p-5 bg-red-950/20 border border-red-500/30 rounded-xl space-y-4">
                        <p className="text-red-400 font-semibold">
                            Ao utilizar esta aplicação, o usuário se compromete incondicionalmente a NÃO armazenar, transmitir, publicitar ou hospedar arquivos atrelados a crimes de qualquer natureza, positivados nas leis do país do usuário e nos tratados internacionais.
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-400 text-sm">
                            <li>É estritamente proibido o uso desta arquitetura para viabilizar exploração infantil, terrorismo, operações de tráfico, estelionato digital, distribuição de ransomware/malwares nocivos a infraestruturas críticas ou outras condutas criminosas severas.</li>
                            <li>O usuário está subordinado ativamente e concorda em ser regido pelas leis do país de sua residência, assim como do país de jurisdição onde seu servidor hospedeiro encontra-se estabelecido.</li>
                            <li>Em cenário de violações legais, o infrator invariavelmente afasta e resguarda incondicionalmente os criadores deste software livre de qualquer solidariedade, responsabilidade civil ou penal atrelada ao uso irregular do protocolo.</li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-[#00f3ff]" /> 4. Ausência de Garantias Explicitas
                    </h2>
                    <p>
                        Este pacote de software é fornecido na forma atual (modelo &quot;As-Is&quot;), sem proteção a garantias de salvaguarda contínua contra corrupção de discos de terceiros. A responsabilidade por rotinas de backup, resguardo físico contra ransomware de S.O. hospedeiro e zelo pelas chaves criptográficas vitais recai sumariamente sobre o administrador do sistema correspondente.
                    </p>
                </section>

                <section className="space-y-4 pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-500 italic">
                        O aceite implícito e irrevogável destes Termos de Responsabilidade é formalizado no momento em que o código e a arquitetura NCFN entram em execução (boot) no ambiente da implantação do usuário final.
                    </p>
                </section>
            </div>

            <div className="text-center py-6 opacity-30 font-mono text-[10px] uppercase">
                Emissão Oficial • NCFN Intelligence Protocol • {(new Date()).getFullYear()}
            </div>
        </div>
    );
}
