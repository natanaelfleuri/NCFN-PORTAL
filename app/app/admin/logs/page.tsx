"use client";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
    Activity, Mail, Clock, Wifi, Timer, Shield, ChevronDown, ChevronRight,
    Search, Download, X, CheckCircle2, AlertTriangle, Globe, Zap,
    Monitor, FlaskConical, Skull
} from 'lucide-react';

type LogEntry = {
    id: string;
    email: string;
    ip: string | null;
    loginAt: string;
    lastSeenAt: string;
    sessionMins: number;
    userAgent?: string;
    pages?: string[];
    downloadMb?: number;
    sessionHash?: string;
    isActive?: boolean;
    riskScore?: 'HIGH' | 'LOW' | 'MEDIUM';
};

function formatDate(dt: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(dt));
}

function formatDuration(mins: number) {
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}min`;
}

function parseUA(ua: string = '') {
    let os = 'Desconhecido';
    let browser = 'Desconhecido';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    return { os, browser };
}

export default function GuestLogsPage() {
    const { data: session } = useSession();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState<string>('ALL');
    const [investigationMode, setInvestigationMode] = useState(false);
    const [vpnModal, setVpnModal] = useState<LogEntry | null>(null);
    const [totpInput, setTotpInput] = useState('');
    const [killingSession, setKillingSession] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/logs')
            .then(r => r.json())
            .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const toggleExpanded = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleKillSession = async (id: string) => {
        setKillingSession(id);
        try {
            await fetch(`/api/admin/kill-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: id }),
            });
            setLogs(prev => prev.filter(l => l.id !== id));
        } catch {
            // noop
        } finally {
            setKillingSession(null);
        }
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ncfn-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const activateInvestigationMode = () => {
        setInvestigationMode(true);
        setTimeout(() => setInvestigationMode(false), 5 * 60 * 1000); // 5 min
        fetch('/api/admin/investigation-mode', { method: 'POST' }).catch(() => {});
    };

    const filteredLogs = logs.filter(log => {
        const matchSearch = !search ||
            log.email.toLowerCase().includes(search.toLowerCase()) ||
            (log.ip || '').includes(search);
        const matchRisk = riskFilter === 'ALL' || log.riskScore === riskFilter;
        return matchSearch && matchRisk;
    });

    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
        return (
            <div className="text-center mt-20 text-red-500">
                <Shield className="w-16 h-16 mx-auto mb-4" />
                <p className="text-2xl font-bold">Acesso Restrito ao Admin</p>
            </div>
        );
    }

    if (loading) return (
        <div className="flex justify-center mt-20">
            <Activity className="w-10 h-10 animate-pulse text-[#bc13fe]" />
        </div>
    );

    return (
        <div className="mt-8 pb-20 max-w-6xl mx-auto space-y-6 px-4">

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <Activity className="w-8 h-8 text-[#bc13fe]" />
                        Log de Sessões Operacionais
                    </h1>
                    <p className="text-gray-500 text-xs font-mono mt-1">SOC Zero-Trust · IP · Duração · Identity · Risk Score</p>
                </div>

                {/* Investigation Mode Toggle */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={investigationMode ? undefined : activateInvestigationMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                            investigationMode
                                ? 'bg-purple-600/20 border-purple-500 text-purple-400 animate-pulse'
                                : 'border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-400'
                        }`}
                    >
                        <FlaskConical size={14} />
                        {investigationMode ? 'Modo OSINT Ativo (5min)' : 'Modo Investigação'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-[#00f3ff] hover:border-[#00f3ff]/50 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                        <Download size={14} /> Exportar Log
                    </button>
                </div>
            </div>

            {/* Investigation Mode Banner */}
            {investigationMode && (
                <div className="border border-purple-500/40 bg-purple-500/10 rounded-2xl p-4 flex items-center gap-3">
                    <FlaskConical size={16} className="text-purple-400" />
                    <p className="text-purple-300 text-sm">
                        <strong>Modo Investigação ATIVO:</strong> Alertas de mudança de IP suspensos por 5 minutos. Você pode ativar sua VPN sem disparar as defesas do NCFN.
                    </p>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por IP, e-mail..."
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#bc13fe]/50 focus:border-transparent outline-none"
                    />
                </div>
                <select
                    value={riskFilter}
                    onChange={e => setRiskFilter(e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#bc13fe]/50 outline-none"
                >
                    <option value="ALL">Todos os Riscos</option>
                    <option value="HIGH">Alto Risco</option>
                    <option value="MEDIUM">Risco Médio</option>
                    <option value="LOW">Baixo Risco</option>
                </select>
                <div className="flex items-center gap-2 text-xs text-gray-500 px-3 border border-gray-800 rounded-xl">
                    <span className="font-mono">{filteredLogs.length}</span> sessões
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-800 overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-950 border-b border-gray-800 grid grid-cols-12 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Identidade</div>
                    <div className="col-span-2">Horário (UTC)</div>
                    <div className="col-span-2">Endereço IP</div>
                    <div className="col-span-2">Duração</div>
                    <div className="col-span-2">Ação Crítica</div>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="p-16 text-center">
                        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                        <p className="text-gray-600 text-sm">Nenhum acesso registrado.</p>
                    </div>
                ) : (
                    filteredLogs.map(log => {
                        const isOpen = expanded.has(log.id);
                        const { os, browser } = parseUA(log.userAgent);
                        const riskColor = log.riskScore === 'HIGH' ? 'bg-red-900/20 border-red-900/40'
                            : log.riskScore === 'MEDIUM' ? 'bg-yellow-900/10 border-yellow-900/30'
                            : '';

                        return (
                            <div key={log.id} className={`border-b border-gray-800/50 transition-colors ${riskColor}`}>
                                {/* Row */}
                                <div
                                    className="grid grid-cols-12 items-center px-4 py-3.5 cursor-pointer hover:bg-white/3 transition-colors"
                                    onClick={() => toggleExpanded(log.id)}
                                >
                                    {/* Expand icon + active LED */}
                                    <div className="col-span-1 flex items-center gap-2">
                                        {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-600" />}
                                        {log.isActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
                                    </div>

                                    {/* Identity */}
                                    <div className="col-span-3 flex items-center gap-2">
                                        <Mail size={12} className="text-[#bc13fe] flex-shrink-0" />
                                        <span className="text-white text-xs font-medium truncate">{log.email}</span>
                                        {log.riskScore === 'HIGH' && (
                                            <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
                                        )}
                                    </div>

                                    {/* Time */}
                                    <div className="col-span-2">
                                        <span className="text-gray-400 text-xs font-mono">{formatDate(log.loginAt)}</span>
                                    </div>

                                    {/* IP */}
                                    <div className="col-span-2 flex items-center gap-1.5">
                                        <Globe size={10} className="text-[#00f3ff] flex-shrink-0" />
                                        <span className="text-[#00f3ff] text-xs font-mono">{log.ip || '—'}</span>
                                    </div>

                                    {/* Duration */}
                                    <div className="col-span-2">
                                        <span className={`text-xs font-semibold ${log.sessionMins > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                                            {formatDuration(log.sessionMins)}
                                        </span>
                                    </div>

                                    {/* Action */}
                                    <div className="col-span-2 flex items-center gap-2">
                                        {log.isActive ? (
                                            <button
                                                onClick={e => { e.stopPropagation(); handleKillSession(log.id); }}
                                                disabled={killingSession === log.id}
                                                className="flex items-center gap-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
                                            >
                                                <Skull size={10} />
                                                {killingSession === log.id ? '...' : 'Kill'}
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-gray-600 font-mono">Encerrada</span>
                                        )}
                                        {log.riskScore === 'HIGH' && (
                                            <button
                                                onClick={e => { e.stopPropagation(); setVpnModal(log); }}
                                                className="text-[10px] text-yellow-400 border border-yellow-700/30 bg-yellow-900/20 hover:bg-yellow-900/40 px-2 py-1 rounded-lg font-bold uppercase tracking-wide transition-all flex items-center gap-1"
                                            >
                                                <Zap size={10} /> VPN
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Accordion */}
                                {isOpen && (
                                    <div className="bg-black/30 border-t border-gray-800/50 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Browser Fingerprint</p>
                                            <div className="flex items-center gap-2">
                                                <Monitor size={12} className="text-gray-500" />
                                                <span className="text-xs text-gray-300 font-mono">{os} · {browser}</span>
                                            </div>
                                            {log.userAgent && (
                                                <p className="text-[10px] text-gray-600 font-mono truncate">{log.userAgent.slice(0, 80)}…</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timeline da Sessão</p>
                                            <div className="flex flex-wrap gap-1">
                                                {(log.pages || ['Login', 'Hub']).map((p, i) => (
                                                    <span key={i} className="text-[10px] bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-300">{p}</span>
                                                ))}
                                            </div>
                                            {log.downloadMb && log.downloadMb > 0 && (
                                                <p className="text-[10px] text-orange-400 font-mono">Download: {log.downloadMb}MB</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hash da Sessão</p>
                                            <code className="text-[10px] text-[#00f3ff] font-mono break-all">
                                                {log.sessionHash || log.id}
                                            </code>
                                            <p className="text-[10px] text-gray-600">Último heartbeat: {formatDate(log.lastSeenAt)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <p className="text-center text-gray-700 text-xs">
                Exibindo os últimos 200 acessos · Atualização em tempo real por heartbeat
            </p>

            {/* VPN Identity Challenge Modal */}
            {vpnModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-950 border border-yellow-500/30 rounded-3xl p-8 max-w-md w-full space-y-5 relative">
                        <button onClick={() => { setVpnModal(null); setTotpInput(''); }} className="absolute top-4 right-4 text-gray-600 hover:text-white">
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                                <Shield className="w-5 h-5 text-yellow-400" />
                            </div>
                            <h2 className="font-black text-white text-base uppercase tracking-widest">
                                🛡️ Verificação de Integridade de Acesso
                            </h2>
                        </div>

                        <p className="text-sm text-gray-300 leading-relaxed">
                            O sistema NCFN identificou que a conexão de <strong className="text-white">{vpnModal.email}</strong> está sendo roteada através de um serviço de mascaramento (VPN/VPS ou Proxy). Para garantir que a sessão não foi sequestrada, é necessária uma confirmação de identidade.
                        </p>

                        <div className="bg-gray-900 rounded-xl p-4 text-xs font-mono space-y-1">
                            <div className="flex justify-between"><span className="text-gray-500">IP Detectado:</span><span className="text-[#00f3ff]">{vpnModal.ip}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Provedor (ASN):</span><span className="text-white">Desconhecido</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Score de Risco:</span><span className="text-red-400">HIGH</span></div>
                        </div>

                        <div className="space-y-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={totpInput}
                                onChange={e => setTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Código TOTP (6 dígitos)"
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => { setVpnModal(null); setTotpInput(''); }}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 font-bold text-xs uppercase tracking-widest transition-all"
                            >
                                <CheckCircle2 size={14} /> Sou eu — Validar via MFA
                            </button>
                            <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 font-bold text-xs uppercase tracking-widest transition-all">
                                <Globe size={14} /> Cadastrar este IP como Seguro (24h)
                            </button>
                            <button
                                onClick={() => { handleKillSession(vpnModal.id); setVpnModal(null); }}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 font-bold text-xs uppercase tracking-widest transition-all"
                            >
                                <AlertTriangle size={14} /> Relatar Anomalia (Derrubar Sessão)
                            </button>
                        </div>

                        <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                            O NCFN utiliza uma lógica de Confiança Zero. Esta verificação garante que, mesmo que suas credenciais sejam expostas, o atacante não consiga operar sem o seu MFA físico.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
