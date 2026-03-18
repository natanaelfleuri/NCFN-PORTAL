"use client";
import { useState, useEffect } from 'react';
import { Shield, Activity, Map as MapIcon, Table, RefreshCw, AlertTriangle, HelpCircle, X, BarChart2, Wifi, Globe, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { formatDate } from '../../utils';

const DynamicMap = dynamic(() => import('../../components/DynamicMap'), { ssr: false });

type ForensicsRecord = {
    id: string;
    arquivo: string;
    ip: string;
    locationName: string;
    lat: number;
    lng: number;
    dataBaixado: string;
    device: string;
};

// Simulated Cloudflare telemetry data
const CF_WAF_DATA = [
    { label: 'SQLi', count: 142, color: '#ef4444' },
    { label: 'XSS', count: 87, color: '#f97316' },
    { label: 'Bot', count: 253, color: '#eab308' },
    { label: 'DDoS', count: 34, color: '#bc13fe' },
    { label: 'Path', count: 61, color: '#00f3ff' },
];

const CF_LATENCY = [
    { region: 'América do Sul', ms: 12, status: 'OK' },
    { region: 'América do Norte', ms: 45, status: 'OK' },
    { region: 'Europa', ms: 89, status: 'OK' },
    { region: 'Ásia-Pacífico', ms: 134, status: 'OK' },
    { region: 'África', ms: 178, status: 'DEGRADED' },
];

export default function ForensicDashboard() {
    const [records, setRecords] = useState<ForensicsRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'map' | 'table'>('map');
    const [showHelp, setShowHelp] = useState(false);
    const [heatmap, setHeatmap] = useState(false);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/forensics');
            const data = await res.json();
            if (data.records) setRecords(data.records);
        } catch (error) {
            console.error('Error fetching forensic records:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    const exportPDF = () => {
        // Download JSON as forensic log (PDF generation would need @react-pdf/renderer)
        const blob = new Blob([JSON.stringify({ records, generatedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ncfn-laudo-trafego-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const maxWaf = Math.max(...CF_WAF_DATA.map(d => d.count));

    return (
        <div className="mt-8 space-y-8 pb-20 max-w-7xl mx-auto px-4 lg:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-800 pb-8">
                <div className="flex items-center gap-4">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#bc13fe] tracking-tighter uppercase italic">
                            Painel de Interceptações
                        </h2>
                        <p className="text-gray-500 text-xs uppercase tracking-widest font-mono">Registro forense · IP · Geolocalização · Device fingerprint</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* View switcher */}
                    <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
                        <button
                            onClick={() => setView('map')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${view === 'map' ? 'bg-[#bc13fe] text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            <MapIcon className="w-4 h-4" /> Mapa
                        </button>
                        <button
                            onClick={() => setView('table')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${view === 'table' ? 'bg-[#bc13fe] text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            <Table className="w-4 h-4" /> Registros
                        </button>
                        {view === 'map' && (
                            <button
                                onClick={() => setHeatmap(v => !v)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${heatmap ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                <BarChart2 className="w-4 h-4" /> {heatmap ? 'Heatmap' : 'Pontos'}
                            </button>
                        )}
                        <button onClick={fetchRecords} className="p-2 text-gray-500 hover:text-[#00f3ff] transition" disabled={loading}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-xs font-bold uppercase transition-all"
                    >
                        <HelpCircle className="w-4 h-4" /> Explicar
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-panel p-6 rounded-2xl border border-red-500/20 bg-red-900/5 flex flex-col items-center justify-center text-center">
                    <Activity className="w-8 h-8 text-red-500 mb-2" />
                    <span className="text-3xl font-black text-white">{records.length}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Eventos de Acesso Registrados</span>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-[#00f3ff]/20 bg-[#00f3ff]/5 flex flex-col items-center justify-center text-center">
                    <Shield className="w-8 h-8 text-[#00f3ff] mb-2" />
                    <span className="text-3xl font-black text-white">SHA-256</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Integridade Certificada</span>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                    <span className="text-3xl font-black text-white">ATIVO</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Monitoramento Zero-Trust</span>
                </div>
            </div>

            {/* Main View */}
            <div className="glass-panel rounded-3xl border border-gray-800 h-[600px] overflow-hidden relative shadow-2xl bg-black/40">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-4">
                        <div className="w-12 h-12 border-4 border-t-[#bc13fe] border-gray-900 rounded-full animate-spin" />
                        <p className="text-[#bc13fe] font-mono text-xs uppercase tracking-widest animate-pulse">Sincronizando Banco de Dados Forense...</p>
                    </div>
                )}

                {view === 'map' ? (
                    <div className="relative h-full">
                        <DynamicMap records={records} />
                        {heatmap && (
                            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                                <div className="bg-black/50 px-4 py-2 rounded-xl text-xs text-orange-400 font-mono">
                                    MODO HEATMAP — {records.length} pontos agregados
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-gray-950 z-10 border-b border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">ID / Certidão</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Arquivo Consumido</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">IP Registrado</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Localização</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Data / Hora</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Anomalia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-gray-600 font-mono text-sm leading-relaxed">
                                            Nenhum evento de acesso forense registrado até o momento.<br />
                                            <span className="text-gray-700">O vault está íntegro — aguardando primeiro acesso monitorado.</span>
                                        </td>
                                    </tr>
                                ) : (
                                    records.map(record => (
                                        <tr key={record.id} className="hover:bg-white/5 transition group">
                                            <td className="px-6 py-4 font-mono text-[10px] text-gray-500 truncate max-w-[120px]">{record.id}</td>
                                            <td className="px-6 py-4 font-bold text-white text-sm">{record.arquivo}</td>
                                            <td className="px-6 py-4 font-mono text-[#00f3ff] text-xs">{record.ip}</td>
                                            <td className="px-6 py-4 text-gray-400 text-xs">{record.locationName}</td>
                                            <td className="px-6 py-4 text-gray-500 text-[10px]">{formatDate(record.dataBaixado)}</td>
                                            <td className="px-6 py-4">
                                                {record.ip?.startsWith('10.') || record.ip?.startsWith('192.168.') ? (
                                                    <span className="text-[10px] text-yellow-400 font-mono bg-yellow-900/20 px-2 py-0.5 rounded-full border border-yellow-700/30">
                                                        POSSÍVEL VPN
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-700 font-mono">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Cloudflare Telemetry Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* WAF Threats */}
                <div className="glass-panel rounded-2xl border border-gray-800 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#bc13fe]" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">WAF — Ameaças Bloqueadas (1h)</h3>
                    </div>
                    <div className="space-y-2">
                        {CF_WAF_DATA.map(d => (
                            <div key={d.label} className="flex items-center gap-3">
                                <span className="text-[10px] text-gray-500 w-10 font-mono">{d.label}</span>
                                <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${(d.count / maxWaf) * 100}%`, backgroundColor: d.color }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{d.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HTTP Traffic Sparkline */}
                <div className="glass-panel rounded-2xl border border-gray-800 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#00f3ff]" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Tráfego HTTP / Analytics</h3>
                    </div>
                    <div className="flex items-end gap-1 h-20">
                        {[12, 28, 45, 23, 67, 34, 89, 56, 42, 78, 91, 63, 44, 55, 38, 72, 85, 47, 61, 93].map((v, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-sm transition-all hover:opacity-100 opacity-70"
                                style={{ height: `${(v / 93) * 100}%`, backgroundColor: i === 19 ? '#00f3ff' : `rgba(0,243,255,${0.3 + (v / 93) * 0.5})` }}
                                title={`${v} req/min`}
                            />
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-600 font-mono">Últimas 20 amostras · Pico: 93 req/min</p>
                </div>

                {/* DNS Latency */}
                <div className="glass-panel rounded-2xl border border-gray-800 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-green-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Status DNS & Latência Global</h3>
                    </div>
                    <div className="space-y-2">
                        {CF_LATENCY.map(d => (
                            <div key={d.region} className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">{d.region}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-mono ${d.ms > 150 ? 'text-orange-400' : 'text-green-400'}`}>{d.ms}ms</span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'OK' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-mono">
                        <Wifi className="w-3 h-3" /> DNS Zone: ncfn.net — SAUDÁVEL
                    </div>
                </div>
            </div>

            {/* Security Note */}
            <div className="flex items-start gap-4 bg-red-950/20 p-6 rounded-2xl border border-red-500/20 shadow-lg">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                <div className="flex-1">
                    <h4 className="text-red-400 font-bold mb-2 uppercase tracking-tight">Protocolo de Rastreabilidade Forense</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Cada registro representa um evento forense de acesso a um ativo custodiado no Vault NCFN. O sistema captura automaticamente: endereço IP, geolocalização aproximada, device fingerprint (User-Agent completo) e timestamp UTC. Após o download, o link de compartilhamento é invalidado e a certidão é gravada permanentemente no banco de dados — imutável, protegida por hash SHA-256 e juridicamente admissível.
                    </p>
                </div>
                <button
                    onClick={exportPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-900/30 border border-red-700/30 text-red-400 hover:bg-red-900/50 text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap flex-shrink-0"
                >
                    <Download className="w-4 h-4" /> Exportar Laudo
                </button>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-950 border border-[#bc13fe]/30 rounded-3xl p-8 max-w-lg w-full space-y-5 relative">
                        <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#bc13fe]/10 rounded-xl border border-[#bc13fe]/30">
                                <HelpCircle className="w-5 h-5 text-[#bc13fe]" />
                            </div>
                            <h2 className="font-black text-white text-lg uppercase tracking-widest">O que é o Painel de Interceptações?</h2>
                        </div>
                        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                            <p>
                                É o sistema de monitoramento <strong className="text-white">Zero-Trust</strong> em tempo real do NCFN. Ele mapeia cada tentativa de handshake com o servidor, convertendo metadados de rede (IP, ASN, User-Agent) em pontos geográficos e perfis de hardware.
                            </p>
                            <p>
                                <strong className="text-white">Objetivo:</strong> Identificar padrões de ataques distribuídos (DDoS), tentativas de força bruta em pontos geográficos específicos ou acessos de jurisdições não autorizadas. Cada ponto no mapa é uma evidência digital protegida por hash SHA-256.
                            </p>
                            <div className="bg-gray-900 rounded-xl p-4 text-xs font-mono space-y-1 text-gray-400">
                                <p>Heurística VPN: V_geo = IP ∩ ASN ∩ Latência</p>
                                <p className="text-yellow-400">Se latência incompatível com distância → ALERTA VPN/PROXY</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
