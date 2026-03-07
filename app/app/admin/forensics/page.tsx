"use client";
import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, Activity, Map as MapIcon, Table, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
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

export default function ForensicDashboard() {
    const [records, setRecords] = useState<ForensicsRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'map' | 'table'>('map');

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/forensics');
            const data = await res.json();
            if (data.records) {
                setRecords(data.records);
            }
        } catch (error) {
            console.error('Error fetching forensic records:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    return (
        <div className="mt-8 space-y-8 pb-20 max-w-7xl mx-auto px-4 lg:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-800 pb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-3 bg-gray-900 rounded-full hover:bg-white/5 border border-[#bc13fe]/30 transition">
                        <ArrowLeft className="text-[#bc13fe] w-6 h-6" />
                    </Link>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#bc13fe] tracking-tighter uppercase italic">
                            Painel Forense
                        </h2>
                        <p className="text-gray-500 text-xs uppercase tracking-widest font-mono">Monitoramento de Acessos Únicos NCFN</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
                    <button
                        onClick={() => setView('map')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${view === 'map' ? 'bg-[#bc13fe] text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                        <MapIcon className="w-4 h-4" /> Cartografia
                    </button>
                    <button
                        onClick={() => setView('table')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${view === 'table' ? 'bg-[#bc13fe] text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Table className="w-4 h-4" /> Registros
                    </button>
                    <button
                        onClick={fetchRecords}
                        className="p-2 text-gray-500 hover:text-[#00f3ff] transition"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-panel p-6 rounded-2xl border border-red-500/20 bg-red-900/5 items-center flex flex-col justify-center text-center">
                    <Activity className="w-8 h-8 text-red-500 mb-2" />
                    <span className="text-3xl font-black text-white">{records.length}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Interceptações Registradas</span>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-[#00f3ff]/20 bg-[#00f3ff]/5 items-center flex flex-col justify-center text-center">
                    <Shield className="w-8 h-8 text-[#00f3ff] mb-2" />
                    <span className="text-3xl font-black text-white">100%</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Certificação Ativa</span>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 items-center flex flex-col justify-center text-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                    <span className="text-3xl font-black text-white">ALVO</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Monitoramento Back-to-End</span>
                </div>
            </div>

            {/* Main View Area */}
            <div className="glass-panel rounded-3xl border border-gray-800 h-[600px] overflow-hidden relative shadow-2xl bg-black/40">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-4">
                        <div className="w-12 h-12 border-4 border-t-[#bc13fe] border-gray-900 rounded-full animate-spin"></div>
                        <p className="text-[#bc13fe] font-mono text-xs uppercase tracking-widest animate-pulse">Sincronizando Banco de Dados Forense...</p>
                    </div>
                ) : null}

                {view === 'map' ? (
                    <DynamicMap records={records} />
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-gray-600 font-mono text-sm leading-relaxed">
                                            Nenhuma interceptação forense detectada até o momento.<br />
                                            O cofre de acesso temporário está intacto.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map(record => (
                                        <tr key={record.id} className="hover:bg-white/5 transition group">
                                            <td className="px-6 py-4 font-mono text-[10px] text-gray-500 truncate max-w-[150px]">{record.id}</td>
                                            <td className="px-6 py-4 font-bold text-white text-sm">{record.arquivo}</td>
                                            <td className="px-6 py-4 font-mono text-[#00f3ff] text-xs">{record.ip}</td>
                                            <td className="px-6 py-4 text-gray-400 text-xs">{record.locationName}</td>
                                            <td className="px-6 py-4 text-gray-500 text-[10px]">{formatDate(record.dataBaixado)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Security Note */}
            <div className="flex items-start gap-4 bg-red-950/20 p-6 rounded-2xl border border-red-500/20 shadow-lg">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                <div>
                    <h4 className="text-red-400 font-bold mb-2 uppercase tracking-tight">Protocolo de Limpeza Forense</h4>
                    <p className="text-gray-400 text-sm leading-relaxed font-medium">
                        Cada registro acima representa um evento de acesso a um arquivo do cofre temporário. NoPortal NCFN, uma vez que o arquivo é baixado, o link é invalidado e a certidão de acesso é permanentemente gravada no banco de dados para trilha de auditoria. Estes dados são imutáveis e protegidos por hash.
                    </p>
                </div>
            </div>
        </div>
    );
}
