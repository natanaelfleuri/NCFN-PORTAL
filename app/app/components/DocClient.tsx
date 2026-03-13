"use client";
import React, { useState } from 'react';
import {
    BookOpen,
    ShieldCheck,
    Cpu,
    Lock,
    Fingerprint,
    UserCheck,
    Mail,
    PlayCircle,
    CheckCircle2,
    Smartphone,
    Globe,
    Coffee,
    ArrowRight
} from 'lucide-react';

export default function DocPage() {
    const [activeTab, setActiveTab] = useState<'SEGURANÇA' | 'ACESSO' | 'SOFTWARE' | 'TUTORIAL'>('SEGURANÇA');

    const tabs = [
        { id: 'SEGURANÇA', label: 'Segurança Máxima', icon: <ShieldCheck className="w-5 h-5" />, color: 'from-[#00f3ff]/20 to-transparent' },
        { id: 'ACESSO', label: 'Acesso Restrito', icon: <Lock className="w-5 h-5" />, color: 'from-[#bc13fe]/20 to-transparent' },
        { id: 'SOFTWARE', label: 'Software Livre', icon: <Globe className="w-5 h-5" />, color: 'from-green-500/20 to-transparent' },
        { id: 'TUTORIAL', label: 'Tutorial de Operação', icon: <PlayCircle className="w-5 h-5" />, color: 'from-orange-500/20 to-transparent' },
    ];

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 space-y-12 max-w-6xl mx-auto pb-32">

            {/* Hero Section */}
            <header className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-full text-[#00f3ff] text-sm font-bold tracking-widest uppercase">
                    <BookOpen className="w-4 h-4" /> Base de Conhecimento Operacional
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 20px rgba(0,243,255,0.3)' }}>
                    DOCUMENTAÇÃO <span className="text-[#00f3ff]">TÉCNICA</span>
                </h1>
                <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
                    Nexus Cloud Forensic Network — Repositório oficial de protocolos periciais, arquitetura de segurança, diretrizes de cadeia de custódia e manuais de operação forense avançada. Conformidade com ISO/IEC 27037, RFC 3161 e padrões ABNT NBR.
                </p>
            </header>

            {/* Interactive Tab Buttons (Images as Buttons) */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 aspect-[4/3] bg-black ${activeTab === tab.id ? 'border-[#00f3ff] ring-2 ring-[#00f3ff]/20 scale-[1.02] shadow-[0_0_30px_rgba(0,243,255,0.1)]' : 'border-white/10 hover:border-white/30 hover:bg-gray-950'}`}
                    >
                        <div
                            className={`absolute inset-0 w-full h-full bg-gradient-to-br ${tab.color} opacity-20 group-hover:opacity-40 transition-opacity duration-700 ${activeTab === tab.id ? 'opacity-50' : ''}`}
                        />
                        <div className="absolute bottom-4 left-4 right-4 flex flex-col items-start gap-1">
                            <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-[#00f3ff] text-black' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
                                {tab.icon}
                            </div>
                            <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${activeTab === tab.id ? 'text-[#00f3ff]' : 'text-gray-300'}`}>
                                {tab.label}
                            </span>
                        </div>
                    </button>
                ))}
            </section>

            {/* Pertinent Documentation Content */}
            <main className="glass-panel rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative min-h-[400px]">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <BookOpen className="w-64 h-64 text-white" />
                </div>

                <div className="p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'SEGURANÇA' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-orange-500">
                                <ShieldCheck className="w-10 h-10" />
                                <h3 className="text-3xl font-black uppercase tracking-tight">Metodologia Forense Certificada</h3>
                            </div>
                            <p className="text-gray-300 leading-relaxed text-lg">
                                O ecossistema <strong>NCFN</strong> implementa uma pilha completa de protocolos de custódia digital em padrão pericial avançado, garantindo que cada evidência capturada seja matematicamente imutável e juridicamente inquestionável perante qualquer instância judicial ou arbitral.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-colors">
                                    <h4 className="text-[#00f3ff] font-bold uppercase flex items-center gap-2">
                                        <Lock className="w-5 h-5" /> Criptografia AES-256-CBC
                                    </h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Cada ativo forense é encapsulado com cifra simétrica <strong>AES-256-CBC</strong> (padrão FIPS 197, adotado pelo governo norte-americano para documentos classificados). A chave de sessão é gerada aleatoriamente por operação — jamais reutilizada. Sem a chave de custódia do operador, qualquer tentativa de acesso produz somente texto ininteligível irrecuperável.
                                    </p>
                                </div>
                                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-[#bc13fe]/20 transition-colors">
                                    <h4 className="text-[#bc13fe] font-bold uppercase flex items-center gap-2">
                                        <Cpu className="w-5 h-5" /> Cadeia de Custódia SHA-256 + RFC 3161
                                    </h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Cada pacote forense recebe uma assinatura digital <strong>SHA-256</strong> (256 bits de entropia — 2²⁵⁶ combinações possíveis). A modificação de um único bit do arquivo altera radicalmente o hash, invalidando a prova matematicamente. O carimbo temporal <strong>RFC 3161</strong> vincula o hash a um instante cronológico certificado por autoridade externa, tornando impossível alegar que o arquivo foi alterado após o registro.
                                    </p>
                                </div>
                                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-green-500/20 transition-colors col-span-full">
                                    <h4 className="text-green-400 font-bold uppercase flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5" /> Auditoria Autônoma e Rastreabilidade Completa
                                    </h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        O portal registra em log imutável cada operação de acesso, download e modificação — incluindo IP do operador, geolocalização, User-Agent e timestamp UTC. O Bot Auditor realiza varredura cruzada periódica dos metadados forenses contra os arquivos armazenados no Vault, detectando automaticamente divergências de integridade e acionando alertas em tempo real. Eliminamos o vetor de erro humano na verificação da cadeia de evidências.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ACESSO' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-[#bc13fe]">
                                <Lock className="w-10 h-10" />
                                <h3 className="text-3xl font-black uppercase tracking-tight">Hierarquia de Acesso e Credenciamento</h3>
                            </div>
                            <p className="text-gray-300 leading-relaxed text-lg">
                                O acesso ao <strong>Portal NCFN</strong> é controlado por identidade forense vinculada a credencial Google verificada. O modelo de autorização é baseado em lista de permissões explícitas (allowlist) — nenhum acesso ocorre por padrão sem validação prévia do administrador do nó.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-6 items-start p-4 bg-white/2 rounded-xl border border-white/5">
                                    <Smartphone className="text-[#00f3ff] w-8 h-8 shrink-0 mt-1" />
                                    <div>
                                        <b className="text-white block text-lg mb-1">Aplicativo Nativo — PWA & TWA</b>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            O Portal NCFN opera como <strong>Progressive Web App (PWA)</strong> instalável diretamente pelo navegador, e como <strong>Trusted Web Activity (TWA)</strong> distribuída via Google Play Store. A arquitetura TWA garante que o app utilize o motor de renderização nativo do sistema operacional (Chrome/WebView), habilitando protocolos de segurança de hardware como autenticação biométrica por impressão digital, acesso ao keystore criptográfico do dispositivo e isolamento de processo seguro.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start p-4 bg-white/2 rounded-xl border border-white/5">
                                    <UserCheck className="text-[#bc13fe] w-8 h-8 shrink-0 mt-1" />
                                    <div>
                                        <b className="text-white block text-lg mb-1">Vínculo de Identidade Operacional</b>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Cada operador é vinculado a uma identidade digital única — e-mail Google verificado + registro de dispositivo. O sistema detecta e registra automaticamente variações de hardware, mudança de IP, acesso de jurisdições incomuns e tentativas de sessão concorrente. Em caso de anomalia, a sessão é encerrada e o administrador do nó é notificado. Sem permissão prévia, o sistema retorna erro 401 sem expor informações da infraestrutura.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <a href="mailto:ncfn@ncfn.net" className="flex items-center justify-center gap-4 px-6 py-4 bg-[#bc13fe]/20 border border-[#bc13fe]/40 rounded-xl text-white font-mono font-bold hover:bg-[#bc13fe]/40 transition-all group">
                                    <Mail className="w-5 h-5" /> SOLICITAR CREDENCIAMENTO <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </a>
                                <div className="px-6 py-4 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center text-[10px] font-mono uppercase text-gray-500 tracking-tighter">
                                    Endpoint: ncfn.net | TLS 1.3 | HSTS Ativo
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'SOFTWARE' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-green-400">
                                <Globe className="w-10 h-10" />
                                <h3 className="text-3xl font-black uppercase tracking-tight">Posicionamento Estratégico</h3>
                            </div>
                            <div className="prose prose-invert max-w-none">
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    Soluções corporativas de custódia forense cobram entre R$15.000 e R$80.000/ano por módulos que o <strong>NCFN</strong> entrega de forma completa, auto-hospedada e livre. Não somos uma alternativa — somos o padrão técnico superior. Construído sobre a mesma base tecnológica usada por laboratórios de criminalística estatais, com uma vantagem decisiva: você controla 100% da infraestrutura.
                                </p>
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-5 bg-white/2 rounded-2xl border border-white/5 space-y-3">
                                        <h6 className="text-white font-bold">Soberania de Dados Total</h6>
                                        <p className="text-gray-500 text-xs leading-relaxed">Auto-hospedado em servidor próprio ou VPS. Nenhum dado forense transita por infraestrutura de terceiros. Zero telemetria, zero dependência de nuvem pública, zero risco de vazamento por fornecedor.</p>
                                    </div>
                                    <div className="p-5 bg-white/2 rounded-2xl border border-white/5 space-y-3">
                                        <h6 className="text-white font-bold">Auditabilidade Técnica Completa</h6>
                                        <p className="text-gray-500 text-xs leading-relaxed">Código-fonte aberto e auditável linha a linha. Não exigimos confiança cega — você pode verificar cada algoritmo criptográfico, cada rota de API e cada rotina de log. Conformidade demonstrável, não apenas declarada.</p>
                                    </div>
                                    <div className="p-5 bg-white/2 rounded-2xl border border-white/5 space-y-3">
                                        <h6 className="text-white font-bold">Stack OSINT Integrada</h6>
                                        <p className="text-gray-500 text-xs leading-relaxed">Integração nativa com ferramentas de coleta de inteligência (Sherlock, theHarvester, recon-ng, nmap) dentro do ambiente de custódia — sem exportar dados para plataformas externas não auditadas.</p>
                                    </div>
                                </div>
                                <div className="mt-8 p-6 bg-green-500/5 border border-green-500/20 rounded-2xl">
                                    <h5 className="text-green-400 font-bold mb-2 uppercase tracking-wide">Manifesto NCFN 2026</h5>
                                    <p className="text-gray-400 text-sm leading-relaxed">A capacidade técnica de provar a verdade digital não deve ser monopólio de grandes corporações ou agências governamentais. O NCFN democratiza o acesso a ferramentas periciais de elite — porque privacidade, integridade e poder de prova são direitos, não produtos.</p>
                                </div>
                            </div>

                            <div className="pt-8">
                                <h3 className="text-2xl font-bold text-[#ffdd00] flex items-center gap-3 mb-4">
                                    <Coffee className="w-7 h-7" /> Sustentabilidade do Projeto
                                </h3>
                                <a
                                    href="https://buymeacoffee.com/ncfn"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-[#ffdd00] text-black font-black rounded-2xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,221,0,0.3)] uppercase tracking-wide text-sm"
                                >
                                    ☕ Contribuir com o Projeto
                                </a>
                            </div>
                        </div>
                    )}

                    {activeTab === 'TUTORIAL' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-[#00f3ff]">
                                <PlayCircle className="w-10 h-10" />
                                <h3 className="text-3xl font-black uppercase tracking-tight">Procedimentos Operacionais</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-white font-bold flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-[#00f3ff]" /> 01. Ingresso e Custódia de Evidências
                                        </h4>
                                        <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                                            Acesse o <strong>Vault Forense</strong> para ingressar ativos digitais nas zonas de custódia. Cada diretório mantém log de operações imutável (append-only), com registro automático de operador, timestamp UTC e hash de integridade do arquivo ingresso. O sistema rejeita automaticamente arquivos corrompidos ou com hash divergente.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-white font-bold flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-[#00f3ff]" /> 02. Perícia e Certificação de Integridade
                                        </h4>
                                        <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                                            Utilize o módulo <strong>Auditoria de Integridade</strong> para verificar a autenticidade de qualquer arquivo — processado in-memory sem gravação em disco. Para arquivos do Vault, aplique o módulo de <strong>Perícia Automática</strong> que extrai metadados ExifTool completos e calcula SHA-256, SHA-1 e MD5 simultaneamente. O download forense produz um bundle ZIP com arquivo original + cópia AES-256 + relatório PDF técnico-jurídico.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-white font-bold flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-[#00f3ff]" /> 03. Captura Web e OSINT
                                        </h4>
                                        <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                                            O módulo <strong>Captura Forense Web</strong> preserva páginas digitais com valor probatório: screenshot full-page, PDF renderizado, DOM/HTML completo, tráfego HAR, certificado SSL, WHOIS e carimbo temporal RFC 3161 — tudo em custódia automática. O ambiente <strong>OSINT Desktop</strong> disponibiliza um desktop Ubuntu/XFCE via noVNC no browser com Sherlock, theHarvester, nmap e recon-ng pré-instalados.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-white font-bold flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-[#00f3ff]" /> 04. Distribuição e Acesso Público Controlado
                                        </h4>
                                        <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                                            Arquivos marcados como públicos aparecem na <strong>Vitrine NCFN</strong> com acesso monitorado. Cada download é registrado com IP, geolocalização, dispositivo e timestamp — rastreabilidade forense completa. Links de compartilhamento têm validade configurável e monitoramento de interceptação por canary token.
                                        </p>
                                    </div>
                                </div>
                                <div className="aspect-square bg-white/2 border border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 gap-4 text-center">
                                    <div className="w-20 h-20 rounded-full bg-[#00f3ff]/20 animate-pulse flex items-center justify-center">
                                        <Cpu className="w-10 h-10 text-[#00f3ff]" />
                                    </div>
                                    <h5 className="text-white font-mono text-xs uppercase tracking-widest">Motor Forense Ativo</h5>
                                    <p className="text-gray-500 text-[10px] leading-relaxed mt-2">O núcleo NCFN processa múltiplos protocolos de segurança em camadas paralelas — criptografia, hashing, auditoria e registro forense operam simultaneamente em cada transação.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Dicas e Info Final */}
            <footer className="pt-20 text-center border-t border-white/5 space-y-6">
                <div className="space-y-2">
                    <p className="text-white font-bold opacity-80 uppercase tracking-[0.3em] text-sm">NCFN: Nexus Cloud Forensic Network | CopyLeft 2026</p>
                    <p className="text-gray-500 text-xs font-mono lowercase">© 2026 ncfn@ncfn.net | PROTOCOLO NCFN SECURITY v2.0</p>
                </div>
            </footer>

        </div>
    );
}
