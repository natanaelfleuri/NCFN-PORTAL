"use client";
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setFileCtx } from '@/app/components/FileContextNav';
import {
    ShieldAlert, Lock, File, Folder, FolderOpen, ChevronDown, ChevronRight,
    Hash, HardDrive, Clock, Eye, FileText,
    FileCheck2, Shield, AlertTriangle, Activity, Menu, X, BookOpen, HelpCircle,
    ArrowLeft, ChevronDown as ChDown,
} from 'lucide-react';

interface VaultFile {
    name: string;
    path: string;
    size: number;
    modifiedAt: string;
    type: string;
    hash: string;
}

interface VaultFolder {
    name: string;
    files: VaultFile[];
}

interface AccessLog {
    id: string;
    filePath: string;
    action: string;
    userEmail: string;
    ip: string | null;
    isCanary: boolean;
    createdAt: string;
}

const FOLDER_LABELS: Record<string, string> = {
    '0_NCFN-ULTRASECRETOS': '0 · Ultrasecretos',
    '1_NCFN-PROVAS-SENSÍVEIS': '1 · Provas Sensíveis',
    '2_NCFN-ELEMENTOS-DE-PROVA': '2 · Elementos de Prova',
    '3_NCFN-DOCUMENTOS-GERENTE': '3 · Documentos Gerente',
    '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS': '4 · Processos / Contratos',
    '5_NCFN-GOVERNOS-EMPRESAS': '5 · Governos / Empresas',
    '6_NCFN-FORNECIDOS_sem_registro_de_coleta': '6 · Fornecidos s/ Registro',
    '7_NCFN-CAPTURAS-WEB_OSINT': '7 · Capturas Web / OSINT',
    '8_NCFN-VIDEOS': '8 · Vídeos',
    '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS': '9 · Perfis Criminais',
    '10_NCFN-ÁUDIO': '10 · Áudio',
    '12_NCFN-METADADOS-LIMPOS': '12 · Metadados Limpos',
};

function formatBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
}

const ACTION_LABELS: Record<string, { label: string; color: string; actor: string }> = {
    read:     { label: 'Leitura',           color: '#22d3ee', actor: 'Usuário' },
    upload:   { label: 'Custódia',          color: '#8b5cf6', actor: 'Usuário' },
    download: { label: 'Download',          color: '#3b82f6', actor: 'Usuário' },
    custody:  { label: 'Custódia Inicial',  color: '#8b5cf6', actor: 'Usuário' },
    pericia:  { label: 'Perícia Digital',   color: '#a78bfa', actor: 'Sistema NCFN' },
    encrypt:  { label: 'Encriptação',       color: '#f59e0b', actor: 'Sistema NCFN' },
    decrypt:  { label: 'Decriptação',       color: '#10b981', actor: 'Usuário' },
    share:    { label: 'Compartilhamento',  color: '#6366f1', actor: 'Usuário' },
    trash:    { label: 'Lixeira',           color: '#eab308', actor: 'Usuário' },
    delete:   { label: 'Exclusão',          color: '#ef4444', actor: 'Usuário' },
    burn:     { label: 'Burn Token',        color: '#f97316', actor: 'Usuário' },
    canary:   { label: '⚠ CANARY',         color: '#ef4444', actor: 'Sistema NCFN' },
};

function FileTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
    if (type === 'image') return <Eye size={size} className="text-blue-400 flex-shrink-0" />;
    if (type === 'pdf') return <FileText size={size} className="text-red-400 flex-shrink-0" />;
    if (type === 'text') return <FileText size={size} className="text-green-400 flex-shrink-0" />;
    if (type === 'encrypted') return <Lock size={size} className="text-orange-400 flex-shrink-0" />;
    return <File size={size} className="text-gray-400 flex-shrink-0" />;
}

// ─── Timeline Graph Components ─────────────────────────────────────────────
interface TimelinePoint {
    label: string;
    actor: string;
    color: string;
    isCanary: boolean;
    datetime: string;
    user: string;
}

function CombinedTimeline({ points }: { points: TimelinePoint[] }) {
    if (points.length === 0) return null;
    const W = 900;
    const pad = 60;
    const usable = W - pad * 2;
    const step = points.length > 1 ? usable / (points.length - 1) : 0;

    // Top section: actors/actions (height 130 to leave room for 45° labels)
    const actorRowY = 100;
    // Bottom section: date/time (starts at 160)
    const dateRowY = 165;
    const H = dateRowY + 60; // total height

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" style={{ height: H }}>
                {/* ── Actor/action baseline ── */}
                {points.length > 1 && (
                    <line x1={pad} y1={actorRowY} x2={pad + step * (points.length - 1)} y2={actorRowY}
                        stroke="#1e293b" strokeWidth="2" />
                )}
                {/* ── Dotted vertical connectors between rows ── */}
                {points.map((pt, i) => {
                    const cx = pad + step * i;
                    return (
                        <line key={`conn-${i}`}
                            x1={cx} y1={actorRowY + 8} x2={cx} y2={dateRowY - 8}
                            stroke={pt.color} strokeWidth="1.5" strokeDasharray="3 3" opacity={0.5} />
                    );
                })}
                {/* ── DateTime baseline ── */}
                {points.length > 1 && (
                    <line x1={pad} y1={dateRowY} x2={pad + step * (points.length - 1)} y2={dateRowY}
                        stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 3" />
                )}

                {points.map((pt, i) => {
                    const cx = pad + step * i;
                    const dt = new Date(pt.datetime);
                    const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    return (
                        <g key={i}>
                            {/* ── Top row: action dot + 45° labels ── */}
                            <circle cx={cx} cy={actorRowY} r={6} fill={pt.color} opacity={0.9}
                                filter={pt.isCanary ? 'drop-shadow(0 0 6px #ef4444)' : `drop-shadow(0 0 4px ${pt.color}55)`} />
                            {/* Label (action) — 45° above dot */}
                            <text
                                x={cx} y={actorRowY - 12}
                                textAnchor="start" fontSize="9"
                                fill={pt.color} fontWeight="bold" fontFamily="monospace"
                                transform={`rotate(-45, ${cx}, ${actorRowY - 12})`}
                            >
                                {pt.label}
                            </text>
                            {/* Actor — 45° below dot */}
                            <text
                                x={cx} y={actorRowY + 14}
                                textAnchor="start" fontSize="8"
                                fill="#64748b" fontFamily="monospace"
                                transform={`rotate(45, ${cx}, ${actorRowY + 14})`}
                            >
                                #{i + 1} {pt.actor.length > 12 ? pt.actor.slice(0, 10) + '…' : pt.actor}
                            </text>

                            {/* ── Bottom row: datetime dot + labels ── */}
                            <circle cx={cx} cy={dateRowY} r={4} fill={pt.color} opacity={0.7} />
                            <text x={cx} y={dateRowY + 14} textAnchor="middle" fontSize="8"
                                fill="#94a3b8" fontFamily="monospace">{dateStr}</text>
                            <text x={cx} y={dateRowY + 24} textAnchor="middle" fontSize="8"
                                fill="#64748b" fontFamily="monospace">{timeStr}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ─── Main inner component ──────────────────────────────────────────────────
function CofreAuditInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const fromPath = searchParams.get('from');
    const initFolder = searchParams.get('folder');
    const initFile = searchParams.get('file');

    const [folders, setFolders] = useState<Record<string, VaultFolder>>({});
    const [loadingFolders, setLoadingFolders] = useState(true);
    const [selectedFolder, setSelectedFolder] = useState<string>('');
    const [selected, setSelected] = useState<VaultFile | null>(null);
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [custodyState, setCustodyState] = useState<any>(null);

    const fetchFolders = useCallback(async () => {
        setLoadingFolders(true);
        try {
            const res = await fetch('/api/vault/browse');
            const data = await res.json();
            setFolders(data);
            // Auto-select folder from URL param
            const paramFolder = initFolder || Object.keys(data)[0] || '';
            setSelectedFolder(paramFolder);
            // Auto-select file from URL param
            if (initFolder && initFile && data[initFolder]) {
                const fileObj = data[initFolder].files.find((f: VaultFile) => f.name === initFile || f.path === `${initFolder}/${initFile}`);
                if (fileObj) selectFile(fileObj);
            }
        } catch { /* ignore */ } finally { setLoadingFolders(false); }
    }, []);

    useEffect(() => { fetchFolders(); }, [fetchFolders]);

    const selectFile = async (file: VaultFile) => {
        setSelected(file);
        setLogsLoading(true);
        setLogs([]);
        setCustodyState(null);
        const [folder, ...rest] = file.path.split('/');
        const filename = rest.join('/');
        setFileCtx(folder, filename);
        try {
            const [logsRes, stateRes] = await Promise.all([
                fetch(`/api/vault/logs?filePath=${encodeURIComponent(file.path)}&limit=200`),
                fetch('/api/vault/custody-state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get', folder, filename }),
                }),
            ]);
            const logsData = await logsRes.json();
            setLogs(logsData.logs || []);
            if (stateRes.ok) {
                const stateData = await stateRes.json();
                setCustodyState(stateData.state || null);
            }
        } catch { /* ignore */ } finally { setLogsLoading(false); }
    };

    // Build timeline points: custody state events + access logs merged chronologically
    const custodyEvents: TimelinePoint[] = [];
    if (custodyState) {
        if (custodyState.custodyStartedAt) custodyEvents.push({
            label: 'T0 — Custódia Iniciada', actor: 'Sistema NCFN', color: '#bc13fe',
            isCanary: false, datetime: custodyState.custodyStartedAt, user: 'Sistema NCFN',
        });
        if (custodyState.encryptedAt) custodyEvents.push({
            label: 'Encriptação AES-256', actor: 'Sistema NCFN', color: '#f59e0b',
            isCanary: false, datetime: custodyState.encryptedAt, user: 'Sistema NCFN',
        });
        if (custodyState.initialReportAt) custodyEvents.push({
            label: 'Relatório Inicial', actor: 'Sistema NCFN', color: '#22c55e',
            isCanary: false, datetime: custodyState.initialReportAt, user: 'Sistema NCFN',
        });
        if (custodyState.intermediaryReportAt) custodyEvents.push({
            label: 'Relatório Intermediário', actor: 'Sistema NCFN', color: '#3b82f6',
            isCanary: false, datetime: custodyState.intermediaryReportAt, user: 'Sistema NCFN',
        });
        if (custodyState.finalReportAt) custodyEvents.push({
            label: 'Relatório Final', actor: 'Sistema NCFN', color: '#ef4444',
            isCanary: false, datetime: custodyState.finalReportAt, user: 'Sistema NCFN',
        });
    }
    const logPoints: TimelinePoint[] = [...logs].reverse().map(log => {
        const act = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280', actor: log.userEmail };
        return {
            label: act.label,
            actor: log.userEmail || act.actor,
            color: act.color,
            isCanary: log.isCanary,
            datetime: log.createdAt,
            user: log.userEmail,
        };
    });
    const timelinePoints: TimelinePoint[] = [...custodyEvents, ...logPoints]
        .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    const folderFiles = selectedFolder && folders[selectedFolder]
        ? folders[selectedFolder].files.filter(f => !f.name.startsWith('_'))
        : [];

    const canaryAlerts = logs.filter(l => l.isCanary).length;

    // Calculate custody duration
    const custodyDuration = custodyState?.custodyStartedAt
        ? (() => {
            const start = new Date(custodyState.custodyStartedAt).getTime();
            const end = custodyState.finalReportAt
                ? new Date(custodyState.finalReportAt).getTime()
                : Date.now();
            const hrs = Math.round((end - start) / 3600000);
            if (hrs < 24) return `${hrs}h`;
            return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
        })()
        : null;

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-[#8b5cf6]/20 bg-black/40 backdrop-blur-xl">

            {/* Mobile overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
            <button className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-black/80 border border-white/10 rounded-xl" onClick={() => setSidebarOpen(v => !v)}>
                <Menu size={16} className="text-[#8b5cf6]" />
            </button>

            {/* ── Sidebar ── */}
            <aside className={`fixed lg:relative z-40 lg:z-auto h-full transition-transform duration-300 w-72 border-r border-white/5 flex flex-col bg-black/60 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex-shrink-0 space-y-2">
                    <div className="flex items-center gap-2">
                        <Shield size={18} className="text-[#8b5cf6]" />
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">Log's Imutáveis</h2>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">LEITURA</span>
                    </div>
                    <p className="text-[10px] text-gray-600 font-mono">
                        {Object.values(folders).reduce((s, f) => s + f.files.filter(ff => !ff.name.startsWith('_')).length, 0)} ativos · somente leitura
                    </p>
                    <button
                        onClick={() => router.push(fromPath ? `/vault?folder=${encodeURIComponent(fromPath.split('/')[0])}&file=${encodeURIComponent(fromPath.split('/').slice(1).join('/'))}` : '/vault')}
                        className="flex items-center gap-2 text-xs text-cyan-400 hover:text-white border border-cyan-700/40 hover:border-cyan-500/60 bg-cyan-900/10 hover:bg-cyan-900/25 px-3 py-2 rounded-xl transition-all w-full justify-center"
                    >
                        <ArrowLeft size={13} />
                        Cofre de Arquivos
                    </button>
                    <button onClick={() => setShowHelp(true)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all w-full justify-center">
                        <HelpCircle size={14} /> Como funciona
                    </button>

                    {/* Folder Selector */}
                    <div>
                        <label className="block text-[10px] text-gray-600 font-mono mb-1 uppercase tracking-widest">Selecionar Pasta</label>
                        <div className="relative">
                            <select
                                value={selectedFolder}
                                onChange={e => { setSelectedFolder(e.target.value); setSelected(null); }}
                                className="w-full bg-black/60 border border-[#8b5cf6]/30 focus:border-[#8b5cf6]/60 text-white text-xs px-3 py-2 pr-8 rounded-xl focus:outline-none appearance-none transition-all"
                            >
                                <option value="">— Selecione uma pasta —</option>
                                {Object.keys(folders).map(key => (
                                    <option key={key} value={key} className="bg-gray-900">
                                        {FOLDER_LABELS[key] || key}
                                    </option>
                                ))}
                            </select>
                            <ChDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* File list for selected folder */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loadingFolders ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-4 h-4 border-2 border-[#8b5cf6]/40 border-t-[#8b5cf6] rounded-full animate-spin" />
                        </div>
                    ) : !selectedFolder ? (
                        <p className="text-[10px] text-gray-700 italic text-center py-6">Selecione uma pasta acima</p>
                    ) : folderFiles.length === 0 ? (
                        <p className="text-[10px] text-gray-700 italic text-center py-6">Pasta vazia</p>
                    ) : (
                        <div className="space-y-0.5">
                            <p className="text-[9px] text-gray-700 font-mono uppercase tracking-widest px-2 pb-1">
                                {FOLDER_LABELS[selectedFolder] || selectedFolder}
                            </p>
                            {folderFiles.map(file => (
                                <button
                                    key={file.path}
                                    onClick={() => { selectFile(file); setSidebarOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all text-xs ${
                                        selected?.path === file.path
                                            ? 'bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/20'
                                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <FileTypeIcon type={file.type} size={11} />
                                    <span className="flex-1 truncate font-mono text-[10px]">{file.name}</span>
                                    {file.type === 'encrypted' && <Lock size={9} className="text-orange-500 flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Main panel ── */}
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                {selected ? (
                    <div className="flex flex-col h-full overflow-auto">
                        {/* File header */}
                        <div className="flex-shrink-0 px-5 py-4 border-b border-white/5">
                            <div className="flex items-start gap-3 flex-wrap">
                                <FileTypeIcon type={selected.type} size={18} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-base font-bold text-white truncate">{selected.name}</h1>
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">SOMENTE LEITURA</span>
                                        {canaryAlerts > 0 && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase animate-pulse">
                                                ⚠ {canaryAlerts} CANARY
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-mono text-gray-600 mt-1">
                                        <span className="flex items-center gap-1"><Hash size={9} />{selected.hash.slice(0, 24)}...</span>
                                        <span className="flex items-center gap-1"><Shield size={9} />{FOLDER_LABELS[selected.path.split('/')[0]] || selected.path.split('/')[0]}</span>
                                        {custodyDuration && (
                                            <span className="flex items-center gap-1 text-[#8b5cf6]">
                                                <Clock size={9} />Custódia: {custodyDuration} · {timelinePoints.length} registros
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Timeline Unificada: Ações/Atores + Data/Hora ── */}
                        {timelinePoints.length > 0 && (
                            <div className="flex-shrink-0 border-b border-white/5 bg-black/30">
                                <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
                                    <Activity size={12} className="text-[#8b5cf6]" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Linha do Tempo — Ações · Atores · Datas</span>
                                    <span className="text-[9px] text-gray-600 font-mono ml-auto">{timelinePoints.length} pontos</span>
                                </div>
                                <div className="px-4 py-3">
                                    <CombinedTimeline points={timelinePoints} />
                                </div>
                            </div>
                        )}

                        {/* ── Access logs (text) ── */}
                        <div className="flex-1 min-h-0 overflow-auto">
                            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-black/20 sticky top-0 z-10">
                                <FileText size={12} className="text-[#8b5cf6]" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Registros de Log</span>
                                {logs.length > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] font-mono ml-1">{logs.length} registros</span>
                                )}
                            </div>

                            {logsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-4 h-4 border-2 border-[#8b5cf6]/40 border-t-[#8b5cf6] rounded-full animate-spin" />
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-8 text-gray-700 text-xs font-mono">
                                    Nenhum acesso registrado para este arquivo.
                                </div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                            <th className="text-left px-4 py-2">#</th>
                                            <th className="text-left px-4 py-2">Data / Hora</th>
                                            <th className="text-left px-4 py-2">Ação</th>
                                            <th className="text-left px-4 py-2">Usuário</th>
                                            <th className="text-left px-4 py-2">IP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...logs].reverse().map((log, idx) => {
                                            const act = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280', actor: '' };
                                            return (
                                                <tr key={log.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${log.isCanary ? 'bg-red-950/20' : ''}`}>
                                                    <td className="px-4 py-2 font-mono text-gray-700 text-[10px]">#{idx + 1}</td>
                                                    <td className="px-4 py-2 font-mono text-gray-500 whitespace-nowrap text-[10px]">
                                                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-2 font-bold text-[10px]" style={{ color: act.color }}>{act.label}</td>
                                                    <td className="px-4 py-2 font-mono text-gray-400 truncate max-w-[160px] text-[10px]">{log.userEmail}</td>
                                                    <td className="px-4 py-2 font-mono text-gray-600 text-[10px]">
                                                        {log.ip || '—'}
                                                        {log.isCanary && (
                                                            <span className="ml-2 text-[8px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                                                                ⚠ CANARY
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 px-5 py-2 border-t border-white/5 flex items-center justify-center gap-2 text-[9px] text-gray-700 font-mono bg-black/20">
                            <Shield size={9} />
                            AUDITORIA NCFN · SOMENTE LEITURA · IMUTÁVEL · SHA-256 + AES-256-CBC
                        </div>
                    </div>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
                        <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-[#8b5cf6]/60" />
                        </div>
                        <div>
                            <p className="text-white/60 font-bold text-base">Log's Imutáveis do Vault</p>
                            <p className="text-gray-600 text-xs mt-1 max-w-sm">
                                Selecione uma pasta e depois um arquivo para visualizar a linha do tempo e o log completo de acessos.
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <span className="text-[9px] font-black px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">SOMENTE LEITURA</span>
                                <span className="text-[9px] font-black px-2 py-1 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 uppercase">IMUTÁVEL</span>
                                <span className="text-[9px] font-black px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">AUDITORIA</span>
                            </div>
                        </div>
                        {/* Stats per selected folder */}
                        {selectedFolder && folderFiles.length > 0 && (
                            <div className="w-full max-w-sm space-y-1">
                                <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                                    {FOLDER_LABELS[selectedFolder] || selectedFolder} — {folderFiles.length} ativos
                                </p>
                                <div className="space-y-1">
                                    {folderFiles.slice(0, 5).map(f => (
                                        <button key={f.path} onClick={() => selectFile(f)}
                                            className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/5 hover:border-[#8b5cf6]/20 rounded-xl text-left transition-all">
                                            <FileTypeIcon type={f.type} size={12} />
                                            <span className="text-[10px] text-gray-400 truncate font-mono">{f.name}</span>
                                        </button>
                                    ))}
                                    {folderFiles.length > 5 && (
                                        <p className="text-[9px] text-gray-700 font-mono text-center">+ {folderFiles.length - 5} mais na barra lateral</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Help modal */}
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
                        <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
                            <p>Este módulo é uma <strong className="text-white">auditoria somente leitura</strong> do Vault Forense NCFN — nenhuma alteração pode ser feita aqui.</p>
                            <p>Selecione uma <strong className="text-white">pasta</strong> no dropdown e depois um <strong className="text-white">arquivo</strong> para visualizar dois gráficos de linha:</p>
                            <p><strong className="text-purple-400">Gráfico 1</strong> — mostra cada ação realizada no arquivo (Custódia, Perícia, Encriptação...) e quem a executou.</p>
                            <p><strong className="text-purple-400">Gráfico 2</strong> — exibe a data e hora de cada ponto do gráfico acima, conectados por linhas pontilhadas.</p>
                            <p>Abaixo dos gráficos, o <strong className="text-white">log textual completo</strong> de todos os registros de acesso ao arquivo.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Default export with Suspense ─────────────────────────────────────────
// /admin/cofre existe apenas como registro interno — visualmente redireciona para /vault
import { redirect } from 'next/navigation';
export default function CofrePage() {
    redirect('/vault');
}
