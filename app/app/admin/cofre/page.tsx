"use client";
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    ShieldAlert, Lock, File, Folder, FolderOpen, ChevronDown, ChevronRight,
    ChevronsDown, ChevronsUp, Hash, HardDrive, Clock, Eye, FileText,
    FileCheck2, Shield, AlertTriangle, Activity, Menu, X, BookOpen, HelpCircle,
    ArrowLeft,
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
    '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS': '11 · Compartilhamento c/ Terceiros',
    '12_NCFN-METADADOS-LIMPOS': '12 · Metadados Limpos',
    '100_BURN_IMMUTABILITY': '100 · Burn / Imutabilidade',
};

function formatBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    read:     { label: 'Leitura',   color: 'text-cyan-400' },
    download: { label: 'Download',  color: 'text-blue-400' },
    custody:  { label: 'Custódia',  color: 'text-purple-400' },
    pericia:  { label: 'Perícia',   color: 'text-violet-400' },
    delete:   { label: 'Excluído',  color: 'text-red-400' },
    trash:    { label: 'Lixeira',   color: 'text-yellow-400' },
    canary:   { label: '⚠ CANARY',  color: 'text-red-500 font-black' },
};

function FileTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
    if (type === 'image') return <Eye size={size} className="text-blue-400 flex-shrink-0" />;
    if (type === 'pdf') return <FileText size={size} className="text-red-400 flex-shrink-0" />;
    if (type === 'text') return <FileText size={size} className="text-green-400 flex-shrink-0" />;
    if (type === 'encrypted') return <Lock size={size} className="text-orange-400 flex-shrink-0" />;
    return <File size={size} className="text-gray-400 flex-shrink-0" />;
}

// ─── Main inner component ──────────────────────────────────────────────────
function CofreAuditInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initCustody = searchParams.get('custody');
    const fromPath = searchParams.get('from');

    const [folders, setFolders] = useState<Record<string, VaultFolder>>({});
    const [loadingFolders, setLoadingFolders] = useState(true);
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<VaultFile | null>(null);
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string>('');
    const [pdfType, setPdfType] = useState<'relatorio' | 'pericia' | ''>('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const fetchFolders = useCallback(async () => {
        setLoadingFolders(true);
        try {
            const res = await fetch('/api/vault/browse');
            const data = await res.json();
            setFolders(data);
            // If custody param, auto-select
            if (initCustody) {
                for (const f of Object.values(data) as VaultFolder[]) {
                    const found = f.files?.find((x: VaultFile) => x.path === initCustody);
                    if (found) { selectFile(found); break; }
                }
            }
        } catch { /* ignore */ } finally { setLoadingFolders(false); }
    }, []);

    useEffect(() => { fetchFolders(); }, [fetchFolders]);

    const selectFile = async (file: VaultFile) => {
        setSelected(file);
        setPdfUrl('');
        setPdfType('');
        setLogsLoading(true);
        setLogs([]);
        try {
            const res = await fetch(`/api/vault/logs?filePath=${encodeURIComponent(file.path)}&limit=200`);
            const data = await res.json();
            setLogs(data.logs || []);
        } catch { /* ignore */ } finally { setLogsLoading(false); }
    };

    const loadPdf = async (type: 'relatorio' | 'pericia') => {
        if (!selected) return;
        setPdfLoading(true);
        setPdfType(type);
        setPdfUrl('');
        try {
            const [folderName, ...rest] = selected.path.split('/');
            const filename = rest.join('/');
            let res: Response;
            if (type === 'relatorio') {
                res = await fetch(`/api/generate-report?folder=${encodeURIComponent(folderName)}`);
            } else {
                res = await fetch('/api/vault/custody-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: selected.path }),
                });
            }
            if (!res.ok) throw new Error(await res.text());
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally { setPdfLoading(false); }
    };

    const totalFiles = Object.values(folders).reduce((s, f) => s + f.files.length, 0);
    const canaryAlerts = logs.filter(l => l.isCanary).length;

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
                <div className="p-4 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Shield size={18} className="text-[#8b5cf6]" />
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">Auditoria Vault</h2>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">IMUTÁVEL</span>
                    </div>
                    <p className="text-[10px] text-gray-600 font-mono">{totalFiles} ativos · somente leitura</p>
                    <button
                        onClick={() => {
                            if (fromPath) {
                                const parts = fromPath.split('/');
                                const folder = parts[0];
                                const file = parts.slice(1).join('/');
                                router.push(`/vault?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(file)}`);
                            } else {
                                router.push('/vault');
                            }
                        }}
                        className="flex items-center gap-2 text-xs text-cyan-400 hover:text-white border border-cyan-700/40 hover:border-cyan-500/60 bg-cyan-900/10 hover:bg-cyan-900/25 px-3 py-2 rounded-xl transition-all mt-2 w-full justify-center"
                    >
                        <ArrowLeft size={13} />
                        {fromPath ? 'Voltar ao Cofre de Arquivos' : 'Ir ao Cofre de Arquivos'}
                    </button>
                    <button onClick={() => setShowHelp(true)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all mt-2">
                        <HelpCircle size={14} /> Como funciona
                    </button>
                    <div className="flex gap-1 mt-2">
                        <button onClick={() => setOpenFolders(new Set(Object.keys(folders)))}
                            className="flex-1 flex items-center justify-center gap-1 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#8b5cf6] rounded text-[10px] transition-all">
                            <ChevronsDown size={9} /> Abrir todas
                        </button>
                        <button onClick={() => setOpenFolders(new Set())}
                            className="flex-1 flex items-center justify-center gap-1 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 rounded text-[10px] transition-all">
                            <ChevronsUp size={9} /> Fechar todas
                        </button>
                    </div>
                </div>

                {/* Folder tree */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loadingFolders ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-4 h-4 border-2 border-[#8b5cf6]/40 border-t-[#8b5cf6] rounded-full animate-spin" />
                        </div>
                    ) : (
                        Object.entries(folders).map(([folderName, folder]) => {
                            const isOpen = openFolders.has(folderName);
                            const label = FOLDER_LABELS[folderName] || folderName;
                            return (
                                <div key={folderName} className="mb-1">
                                    <button
                                        onClick={() => setOpenFolders(prev => { const n = new Set(prev); n.has(folderName) ? n.delete(folderName) : n.add(folderName); return n; })}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs font-semibold uppercase tracking-wide ${isOpen ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/3'}`}
                                    >
                                        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                        {isOpen ? <FolderOpen size={13} className="text-[#8b5cf6]" /> : <Folder size={13} className="text-[#8b5cf6]/50" />}
                                        <span className="flex-1 truncate">{label}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${folder.files.length > 0 ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'bg-white/5 text-gray-600'}`}>
                                            {folder.files.length}
                                        </span>
                                    </button>
                                    {isOpen && (
                                        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/5 pl-2">
                                            {folder.files.length === 0 ? (
                                                <p className="text-[10px] text-gray-700 italic px-2 py-1">Pasta vazia</p>
                                            ) : folder.files.map(file => (
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
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* ── Main panel ── */}
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                {selected ? (
                    <div className="flex flex-col h-full">
                        {/* File header */}
                        <div className="flex-shrink-0 px-5 py-4 border-b border-white/5">
                            <div className="flex items-start gap-3">
                                <FileTypeIcon type={selected.type} size={18} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-base font-bold text-white truncate">{selected.name}</h1>
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">SOMENTE LEITURA</span>
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 uppercase">IMUTÁVEL</span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-mono text-gray-600 mt-1">
                                        <span className="flex items-center gap-1"><Hash size={9} />{selected.hash.slice(0, 16)}...</span>
                                        <span className="flex items-center gap-1"><HardDrive size={9} />{formatBytes(selected.size)}</span>
                                        <span className="flex items-center gap-1"><Clock size={9} />{new Date(selected.modifiedAt).toLocaleString('pt-BR')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* View buttons - NO download */}
                            <div className="mt-3 flex gap-2 flex-wrap">
                                <button
                                    onClick={() => loadPdf('relatorio')}
                                    disabled={pdfLoading && pdfType === 'relatorio'}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-900/30 hover:bg-indigo-800/40 text-indigo-400 rounded-lg text-xs border border-indigo-700/30 disabled:opacity-50 transition-all"
                                >
                                    <BookOpen size={11} /> {pdfLoading && pdfType === 'relatorio' ? 'Gerando...' : 'Ver Relatório (inline)'}
                                </button>
                                <button
                                    onClick={() => loadPdf('pericia')}
                                    disabled={pdfLoading && pdfType === 'pericia'}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-900/30 hover:bg-violet-800/40 text-violet-400 rounded-lg text-xs border border-violet-700/30 disabled:opacity-50 transition-all"
                                >
                                    <FileCheck2 size={11} /> {pdfLoading && pdfType === 'pericia' ? 'Gerando...' : 'Ver Perícia Sansão (inline)'}
                                </button>
                                {pdfUrl && (
                                    <button onClick={() => { setPdfUrl(''); setPdfType(''); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs border border-white/10 transition-all">
                                        <X size={11} /> Fechar PDF
                                    </button>
                                )}
                                {canaryAlerts > 0 && (
                                    <span className="flex items-center gap-1 px-3 py-1.5 bg-red-900/40 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold animate-pulse">
                                        <AlertTriangle size={11} /> {canaryAlerts} ALERTA{canaryAlerts > 1 ? 'S' : ''} CANARY
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* PDF inline viewer */}
                        {pdfUrl && (
                            <div className="flex-shrink-0 h-64 border-b border-white/5 bg-black/30">
                                <iframe src={pdfUrl} className="w-full h-full" title="Visualização PDF" />
                            </div>
                        )}

                        {/* File preview (read-only) */}
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            {/* File content preview */}
                            <div className="flex-shrink-0 h-48 overflow-auto bg-black/20 border-b border-white/5 relative">
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rotate-[-20deg] select-none z-10">
                                    <span className="text-3xl font-black text-white/[0.04] uppercase tracking-widest whitespace-nowrap">
                                        AUDITORIA · SOMENTE LEITURA · IMUTÁVEL
                                    </span>
                                </div>
                                {selected.type === 'image' && (
                                    <div className="flex justify-center p-4">
                                        <img src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                                            alt={selected.name}
                                            className="max-h-36 rounded-lg border border-white/10 object-contain" />
                                    </div>
                                )}
                                {selected.type === 'pdf' && (
                                    <iframe src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                                        className="w-full h-48 border-0" title={selected.name} />
                                )}
                                {selected.type === 'text' && (
                                    <FileTextPreview path={selected.path} />
                                )}
                                {selected.type === 'video' && (
                                    <div className="flex justify-center p-2">
                                        <video controls className="max-h-40 rounded-lg border border-white/10"
                                            src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`} />
                                    </div>
                                )}
                                {selected.type === 'audio' && (
                                    <div className="flex justify-center items-center h-full">
                                        <audio controls src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`} className="w-full max-w-sm" />
                                    </div>
                                )}
                                {(selected.type === 'encrypted' || selected.type === 'binary' || selected.type === 'capture') && (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                                        <Lock size={32} className="text-gray-600/40" />
                                        <p className="text-xs text-gray-600 font-mono">Prévia não disponível para este tipo</p>
                                        <p className="text-[10px] text-gray-700 font-mono break-all max-w-sm text-center">SHA256: {selected.hash}</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Access logs ── */}
                            <div className="flex-1 overflow-auto">
                                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-shrink-0 bg-black/20">
                                    <Activity size={13} className="text-[#8b5cf6]" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Log de Acessos</span>
                                    {logs.length > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] font-mono">{logs.length} registros</span>
                                    )}
                                    {canaryAlerts > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold animate-pulse">{canaryAlerts} CANARY</span>
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
                                                <th className="text-left px-4 py-2">Data / Hora</th>
                                                <th className="text-left px-4 py-2">Ação</th>
                                                <th className="text-left px-4 py-2">Usuário</th>
                                                <th className="text-left px-4 py-2">IP</th>
                                                <th className="text-left px-4 py-2">Canary</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map(log => {
                                                const act = ACTION_LABELS[log.action] || { label: log.action, color: 'text-gray-400' };
                                                return (
                                                    <tr key={log.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${log.isCanary ? 'bg-red-950/20' : ''}`}>
                                                        <td className="px-4 py-2 font-mono text-gray-500 whitespace-nowrap">
                                                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                                                        </td>
                                                        <td className={`px-4 py-2 font-bold ${act.color}`}>{act.label}</td>
                                                        <td className="px-4 py-2 font-mono text-gray-400 truncate max-w-[160px]">{log.userEmail}</td>
                                                        <td className="px-4 py-2 font-mono text-gray-600">{log.ip || '—'}</td>
                                                        <td className="px-4 py-2">
                                                            {log.isCanary && (
                                                                <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                                                                    ⚠ ATIVADO
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
                        </div>

                        {/* Immutable footer */}
                        <div className="flex-shrink-0 px-5 py-2 border-t border-white/5 flex items-center justify-center gap-2 text-[9px] text-gray-700 font-mono bg-black/20">
                            <Shield size={9} />
                            AUDITORIA NCFN · SOMENTE LEITURA · IMUTÁVEL · SHA-256 + AES-256-CBC + CADEIA DE CUSTÓDIA
                        </div>
                    </div>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
                        <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-[#8b5cf6]/60" />
                        </div>
                        <div>
                            <p className="text-white/60 font-bold text-base">Auditoria do Vault Forense</p>
                            <p className="text-gray-600 text-xs mt-1 max-w-sm">
                                Selecione um arquivo na barra lateral para visualizar sua prévia, relatório pericial e log completo de acessos.
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <span className="text-[9px] font-black px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">SOMENTE LEITURA</span>
                                <span className="text-[9px] font-black px-2 py-1 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 uppercase">IMUTÁVEL</span>
                                <span className="text-[9px] font-black px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">AUDITORIA</span>
                            </div>
                        </div>
                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-2">
                            {Object.entries(folders).slice(0, 6).map(([key, f]) => (
                                <button key={key} onClick={() => { setOpenFolders(new Set([key])); }}
                                    className="bg-white/[0.03] border border-white/5 hover:border-[#8b5cf6]/20 rounded-xl p-3 text-center transition-all">
                                    <p className="text-lg font-black text-white/50">{f.files.length}</p>
                                    <p className="text-[9px] text-gray-600 truncate">{FOLDER_LABELS[key]?.split('·')[1]?.trim() || key}</p>
                                </button>
                            ))}
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
                        <p>Este módulo é uma <strong className="text-white">auditoria somente leitura</strong> do Vault Forense NCFN — nenhuma alteração pode ser feita aqui.</p>
                        <p>Navegue pelas <strong className="text-white">12 zonas de custódia</strong> na barra lateral e selecione um arquivo para visualizar sua prévia, metadados e log completo de acessos.</p>
                        <p>Para cada arquivo, você pode gerar inline um <strong className="text-white">Relatório de Custódia PDF</strong> ou uma <strong className="text-white">Perícia Forense Sansão</strong> com hash SHA-256 verificável.</p>
                        <p>Todos os acessos a arquivos são <strong className="text-white">registrados de forma imutável</strong> no log — alertas de Canary Token são destacados em vermelho.</p>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}

// ─── Text file preview sub-component ──────────────────────────────────────
function FileTextPreview({ path }: { path: string }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`/api/vault/file?path=${encodeURIComponent(path)}`)
            .then(r => r.text())
            .then(t => setContent(t.slice(0, 2000)))
            .catch(() => setContent('[Erro ao carregar]'))
            .finally(() => setLoading(false));
    }, [path]);
    if (loading) return <p className="text-gray-600 text-xs font-mono p-4 animate-pulse">Carregando...</p>;
    return (
        <pre className="text-[10px] text-gray-400 font-mono p-4 whitespace-pre-wrap break-all leading-relaxed">{content}</pre>
    );
}

// ─── Default export with Suspense ─────────────────────────────────────────
export default function CofrePage() {
    return (
        <Suspense fallback={
            <div className="flex h-[calc(100vh-80px)] items-center justify-center rounded-2xl border border-[#8b5cf6]/20 bg-black/40">
                <div className="w-6 h-6 border-2 border-[#8b5cf6]/40 border-t-[#8b5cf6] rounded-full animate-spin" />
            </div>
        }>
            <CofreAuditInner />
        </Suspense>
    );
}
