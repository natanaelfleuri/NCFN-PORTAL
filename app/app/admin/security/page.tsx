"use client";

import React, { useState, useEffect } from 'react';
import {
    ShieldAlert, AlertTriangle, Loader2, Hourglass,
    Trash2, LockIcon, Key, HelpCircle, X, Eye, EyeOff,
    CheckCircle2, Clock, Wifi
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ACTION_CARDS = [
    {
        value: 'LOCKDOWN',
        label: 'Lockdown Total',
        icon: LockIcon,
        color: 'orange',
        borderClass: 'border-orange-500',
        bgClass: 'bg-orange-500/10',
        shadowClass: 'shadow-[0_0_20px_rgba(249,115,22,0.25)]',
        iconColor: 'text-orange-500',
        desc: 'Suspende todos os convidados, revoga links compartilhados e desabilita APIs externas temporariamente. Reversível via autenticação de emergência.',
        pulse: false,
    },
    {
        value: 'EMERGENCY_CRYPTO',
        label: 'Criptografia de Emergência',
        icon: Key,
        color: 'yellow',
        borderClass: 'border-yellow-500',
        bgClass: 'bg-yellow-500/10',
        shadowClass: 'shadow-[0_0_20px_rgba(234,179,8,0.25)]',
        iconColor: 'text-yellow-400',
        desc: 'Troca todas as chaves de criptografia do Vault por chaves aleatórias de 256-bit, tornando o HD fisicamente ilegível sem a nova chave mestra gerada.',
        pulse: false,
    },
    {
        value: 'WIPE_AND_BACKUP',
        label: 'Expurgar Storage (Wipe)',
        icon: Trash2,
        color: 'red',
        borderClass: 'border-red-600',
        bgClass: 'bg-red-600/10',
        shadowClass: 'shadow-[0_0_20px_rgba(220,38,38,0.3)]',
        iconColor: 'text-red-500',
        desc: 'Envia backup (.zip) do núcleo crítico para o e-mail de emergência e exclui permanentemente TODOS os arquivos do Vault (Wipe Gutmann 35-pass).',
        pulse: true,
    },
];

export default function SecuritySettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [days, setDays] = useState<number>(0);
    const [action, setAction] = useState<string>('LOCKDOWN');
    const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
    const [lastCheckInIp, setLastCheckInIp] = useState<string | null>(null);

    const [showHelp, setShowHelp] = useState(false);
    const [showMfa, setShowMfa] = useState(false);
    const [showWipeWarning, setShowWipeWarning] = useState(false);

    const [masterPassword, setMasterPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/admin/security');
                if (res.ok) {
                    const data = await res.json();
                    setDays(data.deadManSwitchDays || 0);
                    setAction(data.deadManTriggerAction || 'LOCKDOWN');
                    setLastCheckIn(data.lastCheckIn || null);
                    setLastCheckInIp(data.lastCheckInIp || null);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleActionSelect = (val: string) => {
        setAction(val);
        if (val === 'WIPE_AND_BACKUP') setShowWipeWarning(true);
        else setShowWipeWarning(false);
    };

    const handleSave = async () => {
        if (!masterPassword || totpCode.length !== 6) {
            toast.error('Preencha a Senha Mestra e o código TOTP (6 dígitos).');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/admin/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deadManSwitchDays: days,
                    deadManTriggerAction: action,
                    masterPassword,
                    totpCode,
                }),
            });
            if (res.ok) {
                toast.success('Diretrizes militares gravadas com sucesso.');
                setShowMfa(false);
                setMasterPassword('');
                setTotpCode('');
            } else {
                const err = await res.json();
                toast.error(err.error || 'Credenciais inválidas.');
            }
        } catch {
            toast.error('Erro de rede.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const daysUntilTrigger = () => {
        if (!lastCheckIn || days === 0) return null;
        const diff = days - Math.floor((Date.now() - new Date(lastCheckIn).getTime()) / 86400000);
        return Math.max(0, diff);
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="w-10 h-10 animate-spin text-[#00f3ff]" />
            </div>
        );
    }

    const remaining = daysUntilTrigger();

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in duration-500">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-red-500/30 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Painel de Crise</h1>
                        <p className="text-gray-400 text-sm font-mono tracking-widest mt-1">Protocolos Terminais — Dead Man&apos;s Switch</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowHelp(true)}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all"
                >
                    <HelpCircle size={14} /> Como funciona
                </button>
            </div>

            {/* Status Banner */}
            {days > 0 && (
                <div className="border border-orange-500/40 bg-orange-500/8 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-orange-400 font-bold text-sm uppercase tracking-widest">
                            STATUS: MONITORAMENTO DE VIDA ATIVO
                            {remaining !== null && ` — PRÓXIMO CHECK-IN EM ${remaining} DIA${remaining !== 1 ? 'S' : ''}`}
                        </p>
                        {lastCheckIn && (
                            <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                Último reset: {formatDate(lastCheckIn)}
                                {lastCheckInIp && ` (IP: ${lastCheckInIp})`}
                            </p>
                        )}
                    </div>
                    <Wifi size={18} className="text-orange-400 flex-shrink-0" />
                </div>
            )}

            {/* Wipe Warning */}
            {showWipeWarning && (
                <div className="border border-red-600 bg-red-950/30 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-sm text-red-300 leading-relaxed">
                        <strong className="text-red-400">CUIDADO:</strong> Você selecionou a autodestruição de dados. Esta ação apagará permanentemente todos os volumes do Vault sem possibilidade de recuperação forense (Wipe Gutmann 35-pass).
                    </p>
                </div>
            )}

            {/* Warning */}
            <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300 leading-relaxed">
                    <strong className="text-white">ATENÇÃO:</strong> Se a conta de Administrador-Chefe não se conectar ao sistema dentro do período configurado, o protocolo terminal selecionado será ativado automaticamente. Esta ação é{' '}
                    <strong className="text-red-400">IRREVERSÍVEL</strong>.
                </p>
            </div>

            {/* Period selector */}
            <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-300 uppercase tracking-widest">
                    <Hourglass className="w-4 h-4 text-[#00f3ff]" /> Período de Latência (Dias)
                </label>
                <select
                    value={days}
                    onChange={e => setDays(parseInt(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-4 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                >
                    <option value={0}>DESATIVADO — Gatilho Desligado</option>
                    <option value={1}>1 Dia (24h) — Altíssimo Risco</option>
                    <option value={3}>3 Dias (72h) — Curto Prazo</option>
                    <option value={7}>7 Dias — Risco Médio</option>
                    <option value={14}>14 Dias — Risco Moderado</option>
                    <option value={30}>30 Dias — Risco Baixo</option>
                    <option value={90}>90 Dias — Risco Mínimo</option>
                    <option value={360}>360 Dias — Monitoramento Anual</option>
                </select>
                <p className="text-xs text-gray-600">Cada login com sucesso reseta esta contagem regressiva.</p>
            </div>

            {/* Action Cards */}
            <div className={`space-y-4 transition-opacity duration-300 ${days === 0 ? 'opacity-30 pointer-events-none' : ''}`}>
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-500" /> Ação Terminal
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    {ACTION_CARDS.map(card => {
                        const Icon = card.icon;
                        const isSelected = action === card.value;
                        return (
                            <button
                                key={card.value}
                                onClick={() => handleActionSelect(card.value)}
                                className={`w-full text-left rounded-2xl border-2 p-5 flex items-start gap-4 transition-all ${
                                    isSelected
                                        ? `${card.borderClass} ${card.bgClass} ${card.shadowClass}`
                                        : `border-gray-800 bg-gray-900/50 hover:border-gray-700`
                                } ${card.pulse ? 'animate-pulse' : ''}`}
                            >
                                <div className={`p-3 rounded-xl ${isSelected ? card.bgClass : 'bg-gray-800'} flex-shrink-0`}>
                                    <Icon className={`w-6 h-6 ${isSelected ? card.iconColor : 'text-gray-500'}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{card.label}</h3>
                                        {isSelected && (
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${card.bgClass} ${card.iconColor} border border-current`}>
                                                SELECIONADO
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 transition-all ${
                                    isSelected ? `${card.borderClass} ${card.bgClass}` : 'border-gray-700'
                                }`}>
                                    {isSelected && <div className={`w-full h-full rounded-full ${card.bgClass.replace('/10', '')} scale-50`} />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowMfa(true)}
                    className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all hover:scale-105"
                >
                    <ShieldAlert className="w-5 h-5" />
                    Gravar Diretrizes Militares
                </button>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-5 relative">
                        <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/30">
                                <HelpCircle className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="font-black text-white text-lg uppercase tracking-widest">O que é o Protocolo Terminal?</h2>
                        </div>
                        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                            <p>
                                É uma contramedida de segurança baseada na <strong className="text-white">ausência de interação</strong>. Se você configurar 7 dias de latência, o sistema iniciará uma contagem regressiva a cada logout. Se você não realizar um login com sucesso dentro do prazo, a ação selecionada será executada pelo kernel do servidor.
                            </p>
                            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4">
                                <p className="text-red-300">
                                    <strong>Atenção:</strong> O "Expurgar Storage" utiliza o padrão de destruição de dados <strong>Gutmann (35 passagens)</strong> ou equivalente, impossibilitando a recuperação forense dos arquivos.
                                </p>
                            </div>
                            <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs space-y-1">
                                <p className="text-gray-500">// Heurística de disparo</p>
                                <p className="text-green-400">Crise = (T_atual - T_ultimo_login) {'>'} Latência</p>
                                <p className="text-gray-500">// Se verdadeiro → exec_protocolo_terminal()</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MFA Modal */}
            {showMfa && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-950 border border-orange-500/30 rounded-3xl p-8 max-w-md w-full space-y-6 relative">
                        <button onClick={() => setShowMfa(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/30">
                                <ShieldAlert className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <h2 className="font-black text-white text-lg uppercase tracking-widest">Verificação de Segurança</h2>
                                <p className="text-xs text-gray-500 font-mono">Autenticação dupla obrigatória</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Senha Mestra do Administrador
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={masterPassword}
                                        onChange={e => setMasterPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Código TOTP / MFA (6 dígitos)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={totpCode}
                                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-center text-2xl font-mono tracking-[0.5em]"
                                />
                            </div>

                            <div className="bg-gray-900/50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                                <p className="flex items-center gap-2"><Clock size={10} /> Latência configurada: <strong className="text-white">{days === 0 ? 'DESATIVADO' : `${days} dia${days !== 1 ? 's' : ''}`}</strong></p>
                                <p className="flex items-center gap-2"><ShieldAlert size={10} /> Ação terminal: <strong className="text-white">{ACTION_CARDS.find(c => c.value === action)?.label}</strong></p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowMfa(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !masterPassword || totpCode.length !== 6}
                                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
