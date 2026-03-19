"use client";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
    Trash2, RotateCcw, Download, Clock, AlertTriangle,
    Shield, FileText, Timer, X, HelpCircle
} from 'lucide-react';

type TrashItem = {
    id: string;
    filename: string;
    originalPath: string;
    folder: string;
    deletedAt: string;
    size: number;
};

function formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getCountdown(deletedAt: string): { label: string; urgency: 'safe' | 'warn' | 'critical' } {
    const expiry = new Date(deletedAt).getTime() + 10 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const msLeft = expiry - now;

    if (msLeft <= 0) return { label: '⚠️ EXPIRADO', urgency: 'critical' };

    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (daysLeft > 3) {
        return { label: `Restam ${daysLeft}d ${hoursLeft}h`, urgency: 'safe' };
    } else if (daysLeft >= 1) {
        return { label: `Restam ${daysLeft}d ${hoursLeft}h`, urgency: 'warn' };
    } else {
        return { label: `⚠️ Restam ${hoursLeft}h — EXPIRAÇÃO IMINENTE`, urgency: 'critical' };
    }
}

type PurgeTarget = { id: string; name: string } | null;

export default function LixeiraPage() {
    const { data: session, status } = useSession();
    const [items, setItems] = useState<TrashItem[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [tick, setTick] = useState(0);

    // Per-row restore spinner state
    const [restoringId, setRestoringId] = useState<string | null>(null);

    // Purge modal state
    const [purgeTarget, setPurgeTarget] = useState<PurgeTarget>(null);
    const [justification, setJustification] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [purging, setPurging] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [showHelp, setShowHelp] = useState(false);

    // Global purge modal
    const [globalPurgeModal, setGlobalPurgeModal] = useState(false);
    const [globalJustification, setGlobalJustification] = useState('');
    const [globalConfirmed, setGlobalConfirmed] = useState(false);
    const [globalPurging, setGlobalPurging] = useState(false);

    // Restore all modal
    const [restoreAllModal, setRestoreAllModal] = useState(false);
    const [restoringAll, setRestoringAll] = useState(false);

    const fetchTrash = async () => {
        const res = await fetch('/api/trash');
        if (res.ok) setItems(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchTrash(); }, []);

    // Tick every minute to update countdown timers
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const restoreFile = async (id: string) => {
        setRestoringId(id);
        const res = await fetch('/api/trash', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) await fetchTrash();
        setRestoringId(null);
    };

    const openPurgeModal = (item: TrashItem) => {
        setPurgeTarget({ id: item.id, name: item.originalPath });
        setJustification('');
        setConfirmed(false);
        setPurging(false);
        setSuccessMsg(null);
    };

    const closePurgeModal = () => {
        if (purging) return;
        setPurgeTarget(null);
        setSuccessMsg(null);
    };

    const executePurge = async () => {
        if (!purgeTarget || !confirmed || purging) return;
        setPurging(true);
        const res = await fetch('/api/trash', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: purgeTarget.id, justification }),
        });
        if (res.ok) {
            setSuccessMsg('Certificado de Destruição Gerado. Arquivo eliminado e hash registrado no LOG DE PURGAÇÃO.');
            await fetchTrash();
        }
        setPurging(false);
    };

    const executeGlobalPurge = async () => {
        if (!globalConfirmed || globalPurging) return;
        setGlobalPurging(true);
        for (const item of items) {
            await fetch('/api/trash', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, justification: globalJustification }),
            });
        }
        await fetchTrash();
        setGlobalPurging(false);
        setGlobalPurgeModal(false);
        setGlobalJustification('');
        setGlobalConfirmed(false);
    };

    const executeRestoreAll = async () => {
        setRestoringAll(true);
        for (const item of items) {
            await fetch('/api/trash', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id }),
            });
        }
        await fetchTrash();
        setRestoringAll(false);
        setRestoreAllModal(false);
    };

    const downloadAll = () => {
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lixeira_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Timer className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
                    <p className="text-purple-400 font-mono animate-pulse tracking-widest text-sm">
                        INICIALIZANDO PROTOCOLO DE PURGAÇÃO...
                    </p>
                </div>
            </div>
        );
    }

    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Shield className="w-16 h-16 text-red-500 mx-auto" />
                    <p className="text-2xl font-bold text-red-400">ACESSO RESTRITO</p>
                    <p className="text-slate-500 font-mono text-sm">Credenciais insuficientes para este módulo forense.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 px-4 py-8 pb-24">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* ── HEADER ── */}
                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-3">
                            <Trash2 className="w-8 h-8 text-purple-400" />
                            <h1 className="text-2xl md:text-3xl font-bold font-mono text-white tracking-widest"
                                style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
                                LIXEIRA VIRTUAL
                            </h1>
                        </div>
                        <p className="text-purple-300 font-mono text-xs tracking-[0.3em] uppercase">
                            · PROTOCOLO DE PURGAÇÃO FORENSE ·
                        </p>
                        <div className="flex justify-center mt-2">
                            <button onClick={() => setShowHelp(true)}
                                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all">
                                <HelpCircle size={14} /> Como funciona
                            </button>
                        </div>
                        <p className="text-slate-500 text-sm font-mono">
                            Arquivos são purgados automaticamente após 10 dias. Operações registradas em LOG criptográfico.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={downloadAll}
                            disabled={items.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 backdrop-blur-xl border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700/60 hover:border-slate-500 hover:text-white transition-all font-mono text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            BAIXAR TODOS
                        </button>
                        <button
                            onClick={() => setRestoreAllModal(true)}
                            disabled={items.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-900/30 backdrop-blur-xl border border-cyan-700/50 text-cyan-300 rounded-lg hover:bg-cyan-800/40 hover:border-cyan-500 transition-all font-mono text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <RotateCcw className="w-4 h-4" />
                            RESTAURAR TODOS
                        </button>
                        <button
                            onClick={() => {
                                setGlobalJustification('');
                                setGlobalConfirmed(false);
                                setGlobalPurgeModal(true);
                            }}
                            disabled={items.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-red-900/30 backdrop-blur-xl border border-red-700/50 text-red-300 rounded-lg hover:bg-red-800/40 hover:border-red-500 transition-all font-mono text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-4 h-4" />
                            EXCLUIR TODOS PERMANENTEMENTE
                        </button>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                {items.length === 0 ? (
                    /* Empty State */
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-20 text-center">
                        <Trash2 className="w-20 h-20 mx-auto mb-6 text-slate-700" />
                        <p className="text-xl font-bold font-mono text-slate-500 tracking-widest">LIXEIRA VAZIA</p>
                        <p className="text-slate-600 font-mono text-sm mt-2">Nenhum arquivo em processo de purgação.</p>
                    </div>
                ) : (
                    /* File Table */
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-[2fr_1.2fr_0.7fr_1.2fr_auto] gap-4 px-6 py-3 bg-slate-950/80 border-b border-slate-800">
                            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Nome do Arquivo
                            </span>
                            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">Pasta de Origem</span>
                            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">Tamanho</span>
                            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Timer de Expiração
                            </span>
                            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">Ações</span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-slate-800/60">
                            {items.map((item) => {
                                const countdown = getCountdown(item.deletedAt);
                                const isRestoring = restoringId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_0.7fr_1.2fr_auto] gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors items-center"
                                    >
                                        {/* Filename */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 bg-purple-900/20 border border-purple-800/30 rounded-lg shrink-0">
                                                <FileText className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-mono text-white text-sm truncate" title={item.originalPath}>
                                                    {item.originalPath}
                                                </p>
                                                <p className="font-mono text-slate-600 text-xs truncate" title={item.filename}>
                                                    {item.filename}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Folder */}
                                        <div className="flex items-center gap-2 md:block">
                                            <span className="md:hidden font-mono text-slate-500 text-xs uppercase">Pasta:</span>
                                            <span className="font-mono text-slate-400 text-xs bg-slate-800/50 border border-slate-700/50 px-2 py-1 rounded">
                                                {item.folder.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        {/* Size */}
                                        <div className="flex items-center gap-2 md:block">
                                            <span className="md:hidden font-mono text-slate-500 text-xs uppercase">Tamanho:</span>
                                            <span className="font-mono text-slate-400 text-xs">{formatSize(item.size)}</span>
                                        </div>

                                        {/* Timer */}
                                        <div className="flex items-center gap-2 md:block">
                                            <span className="md:hidden font-mono text-slate-500 text-xs uppercase">Timer:</span>
                                            <span
                                                className={[
                                                    'font-mono text-xs flex items-center gap-1',
                                                    countdown.urgency === 'safe'
                                                        ? 'text-emerald-400'
                                                        : countdown.urgency === 'warn'
                                                        ? 'text-orange-400 animate-pulse'
                                                        : 'text-red-400 animate-pulse',
                                                ].join(' ')}
                                            >
                                                <Timer className="w-3 h-3 shrink-0" />
                                                {countdown.label}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => restoreFile(item.id)}
                                                disabled={isRestoring || restoringId !== null}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-900/20 border border-cyan-700/40 text-cyan-300 rounded hover:bg-cyan-800/30 hover:border-cyan-500/60 transition-all font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed min-w-[90px] justify-center"
                                            >
                                                {isRestoring ? (
                                                    <>
                                                        <RotateCcw className="w-3 h-3 animate-spin" />
                                                        <span>Recalculando Hash...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <RotateCcw className="w-3 h-3" />
                                                        RESTAURAR
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openPurgeModal(item)}
                                                disabled={isRestoring}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/20 border border-red-700/40 text-red-300 rounded hover:bg-red-800/30 hover:border-red-500/60 transition-all font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                EXCLUIR
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

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
                            <h2 className="font-black text-white text-lg uppercase tracking-widest">COMO FUNCIONA</h2>
                        </div>
                        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                            <p>A <strong className="text-white">Lixeira Virtual</strong> armazena temporariamente arquivos excluídos do Vault antes de sua eliminação definitiva.</p>
                            <p>Os arquivos ficam retidos por <strong className="text-white">10 dias</strong> e podem ser <strong className="text-white">restaurados</strong> para a pasta de origem a qualquer momento durante esse período.</p>
                            <p>A <strong className="text-white">exclusão permanente</strong> sobrescreve o arquivo fisicamente e registra um log criptográfico com o identificador do operador e timestamp — garantindo rastreabilidade total.</p>
                            <p>Uma vez excluído permanentemente, o arquivo <strong className="text-white">não pode ser recuperado</strong>. O hash do arquivo é registrado no LOG DE PURGAÇÃO para fins de auditoria.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SINGLE PURGE MODAL ── */}
            {purgeTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-red-800/60 rounded-2xl w-full max-w-lg shadow-2xl shadow-red-950/40">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-red-800/40 bg-red-950/30 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                <span className="font-mono font-bold text-red-300 text-sm tracking-widest">
                                    ⚠️ AVISO DE SEGURANÇA DE DADOS
                                </span>
                            </div>
                            {!purging && !successMsg && (
                                <button onClick={closePurgeModal} className="text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 space-y-5">
                            {successMsg ? (
                                <div className="text-center space-y-4 py-4">
                                    <Shield className="w-12 h-12 text-emerald-400 mx-auto" />
                                    <p className="font-mono text-emerald-400 font-bold tracking-wider text-sm">
                                        CERTIFICADO DE DESTRUIÇÃO GERADO
                                    </p>
                                    <p className="font-mono text-slate-400 text-xs">{successMsg}</p>
                                    <button
                                        onClick={closePurgeModal}
                                        className="mt-2 px-6 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition font-mono text-sm"
                                    >
                                        FECHAR
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                                        <p className="font-mono text-slate-300 text-xs leading-relaxed">
                                            A exclusão permanente no ecossistema NCFN.NET utiliza algoritmos de sobrescrita para garantir a impossibilidade de recuperação física.
                                        </p>
                                        <ul className="space-y-2">
                                            <li className="font-mono text-slate-400 text-xs leading-relaxed">
                                                • <span className="text-slate-300">Rastreabilidade:</span> Um registro criptográfico (LOG) será gerado contendo o identificador do Gerente e o timestamp da operação.
                                            </li>
                                            <li className="font-mono text-slate-400 text-xs leading-relaxed">
                                                • <span className="text-slate-300">Materialidade:</span> Este sistema não atesta a ausência de prova após a deleção; a responsabilidade pela manutenção da custódia é exclusiva do operador.
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="bg-slate-800/30 border border-slate-700/50 rounded px-3 py-2 font-mono text-xs text-slate-400 break-all">
                                        Alvo: <span className="text-red-300">{purgeTarget.name}</span>
                                    </div>

                                    {/* Justification */}
                                    <div className="space-y-1.5">
                                        <label className="font-mono text-slate-400 text-xs uppercase tracking-wider">
                                            Justificativa Legal/Técnica para a Exclusão
                                            <span className="text-slate-600 ml-1">(opcional)</span>
                                        </label>
                                        <textarea
                                            value={justification}
                                            onChange={e => setJustification(e.target.value)}
                                            rows={3}
                                            placeholder="Descreva o motivo técnico ou legal para esta exclusão..."
                                            className="w-full bg-slate-950/60 border border-slate-700 text-slate-300 font-mono text-xs rounded-lg px-3 py-2 placeholder-slate-700 focus:outline-none focus:border-red-700/60 resize-none"
                                        />
                                    </div>

                                    {/* Confirmation Checkbox */}
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={confirmed}
                                            onChange={e => setConfirmed(e.target.checked)}
                                            className="mt-0.5 w-4 h-4 accent-red-500 shrink-0"
                                        />
                                        <span className="font-mono text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                                            Entendo que esta ação é irreversível e que o hash deste arquivo será registrado no{' '}
                                            <span className="text-red-400 font-bold">LOG DE PURGAÇÃO</span> como{' '}
                                            <span className="text-red-400">{'\'Eliminado pelo Usuário\''}</span>.
                                        </span>
                                    </label>

                                    {/* Proceed Button */}
                                    <button
                                        onClick={executePurge}
                                        disabled={!confirmed || purging}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-700/20 border border-red-600/50 text-red-300 rounded-lg font-mono text-sm font-bold tracking-wider transition-all hover:bg-red-700/30 hover:border-red-500 hover:text-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {purging ? (
                                            <>
                                                <Timer className="w-4 h-4 animate-spin" />
                                                PROCESSANDO DESTRUIÇÃO...
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="w-4 h-4" />
                                                PROCEDER COM DESTRUIÇÃO DEFINITIVA
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── GLOBAL PURGE MODAL ── */}
            {globalPurgeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-red-800/60 rounded-2xl w-full max-w-lg shadow-2xl shadow-red-950/40">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-red-800/40 bg-red-950/30 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                <span className="font-mono font-bold text-red-300 text-sm tracking-widest">
                                    ⚠️ PURGAÇÃO GLOBAL — {items.length} ARQUIVO(S)
                                </span>
                            </div>
                            {!globalPurging && (
                                <button onClick={() => setGlobalPurgeModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <div className="px-6 py-5 space-y-5">
                            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                                <p className="font-mono text-slate-300 text-xs leading-relaxed">
                                    A exclusão permanente no ecossistema NCFN.NET utiliza algoritmos de sobrescrita para garantir a impossibilidade de recuperação física.
                                </p>
                                <ul className="space-y-2">
                                    <li className="font-mono text-slate-400 text-xs leading-relaxed">
                                        • <span className="text-slate-300">Rastreabilidade:</span> Um registro criptográfico (LOG) será gerado contendo o identificador do Gerente e o timestamp da operação.
                                    </li>
                                    <li className="font-mono text-slate-400 text-xs leading-relaxed">
                                        • <span className="text-slate-300">Materialidade:</span> Este sistema não atesta a ausência de prova após a deleção; a responsabilidade pela manutenção da custódia é exclusiva do operador.
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-mono text-slate-400 text-xs uppercase tracking-wider">
                                    Justificativa Legal/Técnica <span className="text-slate-600">(opcional)</span>
                                </label>
                                <textarea
                                    value={globalJustification}
                                    onChange={e => setGlobalJustification(e.target.value)}
                                    rows={3}
                                    placeholder="Descreva o motivo técnico ou legal para a purgação total..."
                                    className="w-full bg-slate-950/60 border border-slate-700 text-slate-300 font-mono text-xs rounded-lg px-3 py-2 placeholder-slate-700 focus:outline-none focus:border-red-700/60 resize-none"
                                />
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={globalConfirmed}
                                    onChange={e => setGlobalConfirmed(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 accent-red-500 shrink-0"
                                />
                                <span className="font-mono text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                                    Entendo que esta ação é irreversível e que os hashes de <span className="text-red-400 font-bold">{items.length} arquivo(s)</span> serão registrados no{' '}
                                    <span className="text-red-400 font-bold">LOG DE PURGAÇÃO</span> como{' '}
                                    <span className="text-red-400">{'\'Eliminado pelo Usuário\''}</span>.
                                </span>
                            </label>

                            <button
                                onClick={executeGlobalPurge}
                                disabled={!globalConfirmed || globalPurging}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-700/20 border border-red-600/50 text-red-300 rounded-lg font-mono text-sm font-bold tracking-wider transition-all hover:bg-red-700/30 hover:border-red-500 hover:text-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {globalPurging ? (
                                    <>
                                        <Timer className="w-4 h-4 animate-spin" />
                                        PURGANDO {items.length} ARQUIVO(S)...
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4" />
                                        PROCEDER COM DESTRUIÇÃO DEFINITIVA
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── RESTORE ALL MODAL ── */}
            {restoreAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-cyan-800/60 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-800/40 bg-cyan-950/20 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <RotateCcw className="w-5 h-5 text-cyan-400" />
                                <span className="font-mono font-bold text-cyan-300 text-sm tracking-widest">
                                    RESTAURAR TODOS — {items.length} ARQUIVO(S)
                                </span>
                            </div>
                            {!restoringAll && (
                                <button onClick={() => setRestoreAllModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <div className="px-6 py-5 space-y-5">
                            <p className="font-mono text-slate-300 text-xs leading-relaxed">
                                Todos os <span className="text-cyan-300 font-bold">{items.length} arquivo(s)</span> serão restaurados para suas pastas de origem. Caso haja conflito de nome, será adicionado sufixo <code className="text-cyan-400">_restaurado</code>.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRestoreAllModal(false)}
                                    disabled={restoringAll}
                                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg font-mono text-sm hover:bg-slate-700 transition disabled:opacity-40"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={executeRestoreAll}
                                    disabled={restoringAll}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-900/30 border border-cyan-700/50 text-cyan-300 rounded-lg font-mono text-sm hover:bg-cyan-800/40 transition disabled:opacity-40"
                                >
                                    {restoringAll ? (
                                        <>
                                            <RotateCcw className="w-4 h-4 animate-spin" />
                                            RESTAURANDO...
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="w-4 h-4" />
                                            CONFIRMAR
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
