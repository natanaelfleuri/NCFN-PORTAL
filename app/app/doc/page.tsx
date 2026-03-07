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
                    <BookOpen className="w-4 h-4" /> Operações Especializadas
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 20px rgba(0,243,255,0.3)' }}>
                    CÉREBRO DIGITAL <span className="text-[#00f3ff]">NCFN</span>
                </h1>
                <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
                    Neural Computing & Future Networks: Infraestrutura de alta segurança para armazenamento e gestão de inteligência documental.
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
                                <h3 className="text-3xl font-black uppercase tracking-tight">Metodologia Forense Avançada</h3>
                            </div>
                            <p className="text-gray-300 leading-relaxed text-lg">
                                O ecossistema **NCFN** utiliza protocolos de custódia digital de elite para garantir que as evidências capturadas sejam juridicamente inquestionáveis.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-colors">
                                    <h4 className="text-[#00f3ff] font-bold uppercase flex items-center gap-2">
                                        <Lock className="w-5 h-5" /> Empacotamento AES Militar
                                    </h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Os arquivos são consolidados em containers comprimidos com criptografia **AES-256 bit** (nível militar). Este protocolo impede qualquer visualização ou alteração sem a chave de custódia específica do operador.
                                    </p>
                                </div>
                                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-[#bc13fe]/20 transition-colors">
                                    <h4 className="text-[#bc13fe] font-bold uppercase flex items-center gap-2">
                                        <Cpu className="w-5 h-5" /> Cadeia de Custódia (SHA-256)
                                    </h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Geramos uma assinatura digital única (**Hash SHA-256**) para cada pacote forense. Qualquer tentativa de modificação do arquivo, por menor que seja, quebrará a integridade matemática da prova, invalidando-a imediatamente.
                                    </p>
                                </div>
                                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-green-500/20 transition-colors col-span-full">
                                    <h4 className="text-green-400 font-bold uppercase flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5" /> Conferência Automática (Moltbot)
                                    </h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        O portal realiza uma **auditória autônoma** cruzando os metadados capturados pelo Moltbot com os arquivos salvos no Cofre. Isso elimina o erro humano e garante que o que foi capturado é exatamente o que está guardado.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ACESSO' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-[#bc13fe]">
                                <Lock className="w-10 h-10" />
                                <h3 className="text-3xl font-black uppercase tracking-tight">Hierarquia de Acesso e Distribuição</h3>
                            </div>
                            <p className="text-gray-300 leading-relaxed text-lg italic">
                                O acesso ao **NCFN MASTER HUB** é granular e baseado em identidade forense.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-6 items-start p-4 bg-white/2 rounded-xl border border-white/5">
                                    <Smartphone className="text-[#00f3ff] w-8 h-8 shrink-0 mt-1" />
                                    <div>
                                        <b className="text-white block text-lg mb-1 italic">Deploy via Google Play Store (TWA)</b>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            O Aplicativo NCFN está sendo disponibilizado como uma **Trusted Web Activity**. Isso permite a instalação direta via Store oficial, garantindo que o app utilize o motor de renderização nativo e protocolos de segurança de hardware como **Biometria Nativa**.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6 items-start p-4 bg-white/2 rounded-xl border border-white/5">
                                    <UserCheck className="text-[#bc13fe] w-8 h-8 shrink-0 mt-1" />
                                    <div>
                                        <b className="text-white block text-lg mb-1 italic">Vínculo de Identidade Operacional</b>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            A instalação do app é vinculada permanentemente ao e-mail do primeiro operador. O sistema monitora mudanças de hardware ou tentativas de acesso de terceiros em dispositivos já vinculados.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <a href="mailto:ncfn@ncfn.net" className="flex items-center justify-center gap-4 px-6 py-4 bg-[#bc13fe]/20 border border-[#bc13fe]/40 rounded-xl text-white font-mono font-bold hover:bg-[#bc13fe]/40 transition-all group">
                                    <Mail className="w-5 h-5" /> SOLICITAR ACESSO <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </a>
                                <div className="px-6 py-4 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center text-[10px] font-mono uppercase text-gray-500 tracking-tighter">
                                    Support Node: 163.245.218.241 | SSL Active
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'SOFTWARE' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-green-400">
                                <Globe className="w-10 h-10" />
                                <h3 className="text-3xl font-black uppercase tracking-tight">O Diferencial Estratégico</h3>
                            </div>
                            <div className="prose prose-invert max-w-none">
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    Enquanto soluções corporativas cobram fortunas por módulos básicos, o **NCFN** entrega a elite da tecnologia OSINT e Forense de forma aberta e gratuita.
                                </p>
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-5 bg-white/2 rounded-2xl border border-white/5 space-y-3">
                                        <h6 className="text-white font-bold italic">Custo Zero (Best in Market)</h6>
                                        <p className="text-gray-500 text-xs">Acesso democrático às ferramentas que antes eram restritas a agências governamentais e grandes peritos.</p>
                                    </div>
                                    <div className="p-5 bg-white/2 rounded-2xl border border-white/5 space-y-3">
                                        <h6 className="text-white font-bold italic">Auditabilidade Total</h6>
                                        <p className="text-gray-500 text-xs">O código é aberto. Você não precisa confiar em nós; você pode auditar cada linha que processa seus dados.</p>
                                    </div>
                                    <div className="p-5 bg-white/2 rounded-2xl border border-white/5 space-y-3">
                                        <h6 className="text-white font-bold italic">Ecossistema Autônomo</h6>
                                        <p className="text-gray-500 text-xs">Integração nativa com Moltbot para capturas periciais 360 sem dependência de terceiros.</p>
                                    </div>
                                </div>
                                <div className="mt-8 p-6 bg-green-500/5 border border-green-500/20 rounded-2xl">
                                    <h5 className="text-green-400 font-bold mb-2 uppercase tracking-wide">Diretriz NCFN 2026</h5>
                                    <p className="text-gray-400 text-sm leading-relaxed">Acreditamos que a privacidade e o poder de prova não devem ter preço. Somos a alternativa superior, mantida pela comunidade e para a comunidade.</p>
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
                                    ☕ Fazer uma Contribuição Voluntária
                                </a>
                            </div>
                        </div>
                    )}

                    {activeTab === 'TUTORIAL' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-[#00f3ff]">
                                <PlayCircle className="w-10 h-10" />
                                <h3 className="text-3xl font-black uppercase tracking-tight">Manual de Operações</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-white font-bold flex items-center gap-2 italic">
                                            <CheckCircle2 className="w-5 h-5 text-[#00f3ff]" /> 01. Gestão de Arquivos
                                        </h4>
                                        <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                                            Acesse o **Cofre (Admin)** para gerenciar diretórios. Cada pasta possui logs forenses fixos que não podem ser deletados, garantindo a integridade histórica.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-white font-bold flex items-center gap-2 italic">
                                            <CheckCircle2 className="w-5 h-5 text-[#00f3ff]" /> 02. Segurança de Transferência
                                        </h4>
                                        <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                                            Utilize as ferramentas de **Hash e Criptografia** antes de disponibilizar arquivos para a vitrine pública ou compartilhar links de acesso.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-white font-bold flex items-center gap-2 italic">
                                            <CheckCircle2 className="w-5 h-5 text-[#00f3ff]" /> 03. Modo Aplicativo Mobile
                                        </h4>
                                        <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                                            Instale o PWA através do navegador (Adicionar à Tela de Início) ou via **Google Play Store** para habilitar recursos avançados de segurança biométrica.
                                        </p>
                                    </div>
                                </div>
                                <div className="aspect-square bg-white/2 border border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 gap-4 text-center">
                                    <div className="w-20 h-20 rounded-full bg-[#00f3ff]/20 animate-pulse flex items-center justify-center">
                                        <Cpu className="w-10 h-10 text-[#00f3ff]" />
                                    </div>
                                    <h5 className="text-white font-mono text-xs uppercase tracking-widest">Interface Operacional Ativa</h5>
                                    <p className="text-gray-600 text-[10px] italic">&quot;O cérebro digital NCFN processa solicitações em múltiplos níveis de segurança simultaneamente.&quot;</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Dicas e Info Final */}
            <footer className="pt-20 text-center border-t border-white/5 space-y-6">
                <div className="space-y-2">
                    <p className="text-white font-bold opacity-80 uppercase tracking-[0.3em] text-sm">NCFN: Neural Computing & Future Networks | CopyLeft 2026</p>
                    <p className="text-gray-500 text-xs font-mono lowercase">© 2026 ncfn@ncfn.net | PROTOCOLO NCFN SECURITY</p>
                </div>
            </footer>

        </div>
    );
}
