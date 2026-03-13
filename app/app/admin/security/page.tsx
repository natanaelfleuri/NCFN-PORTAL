"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Save, Loader2, Hourglass, Trash2, LockIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SecuritySettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [days, setDays] = useState<number>(0);
    const [action, setAction] = useState<string>('LOCKDOWN');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/admin/security');
                if (res.ok) {
                    const data = await res.json();
                    setDays(data.deadManSwitchDays || 0);
                    setAction(data.deadManTriggerAction || 'LOCKDOWN');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deadManSwitchDays: days, deadManTriggerAction: action })
            });

            if (res.ok) {
                toast.success('Configurações de Segurança atualizadas!');
            } else {
                toast.error('Erro ao salvar as configurações.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Ocorreu um erro de rede.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-[#00f3ff]" /></div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-4 border-b border-red-500/30 pb-6">
                <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Painel de Crise</h1>
                    <p className="text-gray-400 text-sm font-mono tracking-widest mt-1">Protocolos Terminais (Dead Man&apos;s Switch)</p>
                </div>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-red-500/20 bg-black/60 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>

                <div className="flex items-start gap-4 mb-8 bg-red-950/20 p-4 rounded-xl border border-red-500/30">
                    <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                    <p className="text-sm text-gray-300 leading-relaxed">
                        <strong className="text-white">ATENÇÃO:</strong> O &quot;Dead Man&apos;s Switch&quot; (Gatilho do Homem-Morto) é uma contramedida passiva. Se a sua conta de Administrador-Chefe não se conectar ao sistema durante o período configurado, o protocolo terminal selecionado será ativado automaticamente por cronjobs de nuvem. Esta ação é <strong className="text-red-400">IRREVERSÍVEL</strong>.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Hourglass className="w-4 h-4 text-[#00f3ff]" /> Período de Latência (Dias)
                        </label>
                        <select
                            value={days}
                            onChange={(e) => setDays(parseInt(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-4 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                        >
                            <option value={0}>DESATIVADO - Gatilho Desligado</option>
                            <option value={1}>1 Dia (24 Horas) - Altíssimo Risco</option>
                            <option value={3}>3 Dias (72 Horas) - Curto Prazo</option>
                            <option value={7}>7 Dias - Risco Médio</option>
                            <option value={14}>14 Dias - Risco Moderado</option>
                            <option value={30}>30 Dias - Risco Baixo</option>
                            <option value={90}>90 Dias - Risco Mínimo</option>
                            <option value={360}>360 Dias - Monitoramento Anual</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2 ml-1">Sua última conexão com sucesso resetará a contagem deste timer.</p>
                    </div>

                    <div className={days === 0 ? 'opacity-30 pointer-events-none' : 'transition-opacity duration-300'}>
                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-orange-500" /> Ação Terminal
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className={`cursor-pointer rounded-2xl border-2 p-5 flex flex-col items-center gap-3 transition-all ${action === 'LOCKDOWN' ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
                                <input type="radio" name="action" value="LOCKDOWN" checked={action === 'LOCKDOWN'} onChange={() => setAction('LOCKDOWN')} className="sr-only" />
                                <LockIcon className={`w-8 h-8 ${action === 'LOCKDOWN' ? 'text-orange-500' : 'text-gray-500'}`} />
                                <div className="text-center">
                                    <h3 className="font-bold text-white mb-1">Lockdown Total</h3>
                                    <p className="text-xs text-gray-400">Suspende todos os convidados, revoga links e desabilita APIs externas temporariamente.</p>
                                </div>
                            </label>

                            <label className={`cursor-pointer rounded-2xl border-2 p-5 flex flex-col items-center gap-3 transition-all ${action === 'DELETE_ALL' ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
                                <input type="radio" name="action" value="DELETE_ALL" checked={action === 'DELETE_ALL'} onChange={() => setAction('DELETE_ALL')} className="sr-only" />
                                <Trash2 className={`w-8 h-8 ${action === 'DELETE_ALL' ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                                <div className="text-center">
                                    <h3 className="font-bold text-red-500 mb-1">Expurgar Storage (Wipe)</h3>
                                    <p className="text-xs text-gray-400">Exclui permanentemente TODOS os arquivos descriptografados armazenados nos nós físicos.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all hover:scale-105 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Gravar Diretrizes Militares
                    </button>
                </div>
            </div>
        </div>
    );
}
