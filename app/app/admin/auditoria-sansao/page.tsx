"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle, ChevronDown, ChevronRight, Clock, Download, FileSearch, Folder, Loader2, Play, Shield, XCircle } from 'lucide-react';
import Link from 'next/link';

type LogEntry = { id: number; msg: string; type: 'log' | 'error' | 'progress' };
type ReportFile = { name: string; size: number; mtime: string };

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR');
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AuditoriaSansaoPage() {
    const [selectedFolder, setSelectedFolder] = useState<string>('');
    const [running, setRunning]       = useState(false);
    const [logs, setLogs]             = useState<LogEntry[]>([]);
    const [progress, setProgress]     = useState<{ i: number; total: number; file: string; protocol: string } | null>(null);
    const [report, setReport]         = useState<string | null>(null);
    const [reportName, setReportName] = useState('');
    const [done, setDone]             = useState(false);
    const [reports, setReports]       = useState<ReportFile[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [selectedContent, setSelectedContent] = useState<string | null>(null);
    const [loadingSelected, setLoadingSelected] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    const logsEndRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);

    const addLog = useCallback((msg: string, type: LogEntry['type'] = 'log') => {
        setLogs(prev => [...prev, { id: idRef.current++, msg, type }]);
    }, []);

    // scroll logs to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // load report list
    const loadReports = useCallback(async () => {
        setLoadingReports(true);
        try {
            const res = await fetch('/api/admin/auditoria-sansao?action=list');
            if (res.ok) setReports(await res.json());
        } finally {
            setLoadingReports(false);
        }
    }, []);

    useEffect(() => { loadReports(); }, [loadReports]);

    // load a historical report
    const openReport = useCallback(async (name: string) => {
        if (selectedReport === name) { setSelectedReport(null); setSelectedContent(null); return; }
        setSelectedReport(name);
        setLoadingSelected(true);
        setSelectedContent(null);
        const res = await fetch(`/api/admin/auditoria-sansao?action=read&name=${encodeURIComponent(name)}`);
        if (res.ok) {
            const data = await res.json();
            setSelectedContent(data.content);
        }
        setLoadingSelected(false);
    }, [selectedReport]);

    // ── start audit ─────────────────────────────────────────────────────────
    const startAudit = useCallback(async () => {
        if (running) return;
        setRunning(true);
        setDone(false);
        setLogs([]);
        setProgress(null);
        setReport(null);
        setReportName('');

        const abort = new AbortController();
        abortRef.current = abort;

        try {
            const res = await fetch('/api/admin/auditoria-sansao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: selectedFolder || null }),
                signal: abort.signal,
            });

            if (!res.ok || !res.body) {
                addLog(`Erro HTTP ${res.status}`, 'error');
                setRunning(false);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done: streamDone, value } = await reader.read();
                if (streamDone) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const payload = JSON.parse(line.slice(6));

                        if (payload.type === 'log') {
                            addLog(payload.msg, 'log');
                        } else if (payload.type === 'error') {
                            addLog(payload.msg, 'error');
                        } else if (payload.type === 'progress') {
                            setProgress({ i: payload.index, total: payload.total, file: payload.file, protocol: payload.protocol });
                        } else if (payload.type === 'complete') {
                            if (payload.report) setReport(payload.report);
                            if (payload.reportName) setReportName(payload.reportName);
                            setDone(true);
                            loadReports();
                        }
                    } catch (_) {}
                }
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') addLog(`Erro: ${e?.message ?? e}`, 'error');
        } finally {
            setRunning(false);
        }
    }, [running, addLog, loadReports]);

    // download report
    const downloadReport = useCallback(() => {
        if (!report) return;
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = reportName || 'relatorio-sansao.md';
        a.click();
        URL.revokeObjectURL(url);
    }, [report, reportName]);

    const pct = progress ? Math.round((progress.i / progress.total) * 100) : 0;

    return (
        <div className="max-w-5xl mx-auto mt-8 pb-20 px-4 space-y-6">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
                        <Shield className="w-6 h-6 text-[#bc13fe]" />
                        Auditoria Forense — <span className="text-[#bc13fe]">Perito Sansão</span>
                    </h1>
                    <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-1">
                        Varredura inteligente com 6 protocolos forenses + Ollama
                    </p>
                </div>
            </div>

            {/* ── Trigger card ─────────────────────────────────────────── */}
            <div className="glass-panel rounded-2xl border border-[#bc13fe]/20 p-6 space-y-4">
                {/* Explanatory text */}
                <div className="flex items-start gap-3 p-3 bg-[#bc13fe]/5 border border-[#bc13fe]/15 rounded-xl text-xs text-gray-400">
                    <Shield className="w-4 h-4 text-[#bc13fe] flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-white mb-1">Como funciona o Perito Sansão</p>
                        Percorre os arquivos de custódia e aplica 6 protocolos forenses (Web, Áudio/Vídeo, Texto, Binário, Imagem, Banco de Dados).
                        Cada arquivo é analisado pelo Ollama e um relatório unificado é gerado em{" "}
                        <code className="text-[#bc13fe]">COFRE_NCFN/RELATORIOS/</code>.
                        Selecione uma pasta para auditar apenas ela, ou deixe em branco para varrer todo o cofre.
                    </div>
                </div>

                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <FileSearch className="w-4 h-4 text-[#bc13fe]" />
                            Iniciar Varredura Forense
                        </h2>
                        <p className="text-xs text-gray-500 max-w-lg">
                            Percorre todos os arquivos de custódia, aplica o protocolo Perito Sansão correspondente a cada formato
                            e gera um relatório unificado em <code className="text-[#bc13fe] text-[10px]">COFRE_NCFN/RELATORIOS/</code>.
                        </p>
                    </div>
                    <button
                        onClick={startAudit}
                        disabled={running}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#bc13fe]/15 border border-[#bc13fe]/40 text-[#bc13fe] font-black uppercase tracking-wider text-sm hover:bg-[#bc13fe]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(188,19,254,0.15)] hover:shadow-[0_0_30px_rgba(188,19,254,0.3)]"
                    >
                        {running
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Auditando...</>
                            : <><Play className="w-4 h-4" /> Iniciar Auditoria</>}
                    </button>
                </div>

                {/* Folder selector */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <Folder className="w-3.5 h-3.5 text-[#bc13fe]" />
                        Pasta alvo (opcional)
                    </label>
                    <select
                        value={selectedFolder}
                        onChange={e => setSelectedFolder(e.target.value)}
                        disabled={running}
                        className="w-full bg-black/50 border border-gray-800 text-white rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/60 disabled:opacity-50"
                    >
                        <option value="">— Todas as pastas (cofre completo) —</option>
                        <option value="0_NCFN-ULTRASECRETOS">0_NCFN-ULTRASECRETOS</option>
                        <option value="1_NCFN-PROVAS-SENSÍVEIS">1_NCFN-PROVAS-SENSÍVEIS</option>
                        <option value="2_NCFN-ELEMENTOS-DE-PROVA">2_NCFN-ELEMENTOS-DE-PROVA</option>
                        <option value="3_NCFN-DOCUMENTOS-GERENTE">3_NCFN-DOCUMENTOS-GERENTE</option>
                        <option value="4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS">4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS</option>
                        <option value="5_NCFN-GOVERNOS-EMPRESAS">5_NCFN-GOVERNOS-EMPRESAS</option>
                        <option value="6_NCFN-FORNECIDOS_sem_registro_de_coleta">6_NCFN-FORNECIDOS_sem_registro_de_coleta</option>
                        <option value="7_NCFN-CAPTURAS-WEB_OSINT">7_NCFN-CAPTURAS-WEB_OSINT</option>
                        <option value="8_NCFN-VIDEOS">8_NCFN-VIDEOS</option>
                        <option value="9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS">9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS</option>
                        <option value="10_NCFN-ÁUDIO">10_NCFN-ÁUDIO</option>
                        <option value="11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS">11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS</option>
                        <option value="12_NCFN-METADADOS-LIMPOS">12_NCFN-METADADOS-LIMPOS</option>
                    </select>
                    {selectedFolder && (
                        <p className="text-[10px] font-mono text-[#bc13fe]/60">
                            Varredura restrita a: <span className="text-[#bc13fe]">{selectedFolder}</span>
                        </p>
                    )}
                </div>

                {/* progress bar */}
                {running && progress && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                            <span className="truncate max-w-sm">{progress.file}</span>
                            <span className="flex-shrink-0 ml-2 text-[#bc13fe] font-bold">{progress.i}/{progress.total} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#bc13fe] to-[#8b5cf6] rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-gray-600 font-mono">
                            Protocolo: <span className="text-[#bc13fe]">{progress.protocol}</span>
                        </div>
                    </div>
                )}

                {/* done badge */}
                {done && !running && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <CheckCircle className="w-4 h-4" />
                        Auditoria concluída! Relatório salvo no Cofre.
                    </div>
                )}
            </div>

            {/* ── Live log ─────────────────────────────────────────────── */}
            {(logs.length > 0 || running) && (
                <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-black/40">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> Log de execução
                        </span>
                        {running && <span className="flex items-center gap-1 text-[10px] text-[#bc13fe] font-mono animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> ao vivo</span>}
                    </div>
                    <div className="p-3 max-h-72 overflow-y-auto font-mono text-[11px] space-y-0.5 bg-black/60">
                        {logs.map(entry => (
                            <div key={entry.id} className={`leading-relaxed ${entry.type === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                                {entry.msg}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            )}

            {/* ── Current report ───────────────────────────────────────── */}
            {report && (
                <div className="glass-panel rounded-2xl border border-emerald-500/20 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Relatório Final</span>
                            {reportName && <span className="text-[10px] text-gray-600 font-mono">{reportName}</span>}
                        </div>
                        <button
                            onClick={downloadReport}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download .md
                        </button>
                    </div>
                    <pre className="p-5 text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-[500px] overflow-y-auto leading-relaxed bg-black/40">
                        {report}
                    </pre>
                </div>
            )}

            {/* ── Historical reports ───────────────────────────────────── */}
            <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
                <button
                    onClick={() => setHistoryOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-800 hover:bg-white/5 transition"
                >
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#bc13fe]" />
                        Relatórios Anteriores
                        {!loadingReports && <span className="text-[#bc13fe] font-mono">({reports.length})</span>}
                    </span>
                    {historyOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>

                {historyOpen && (
                    <div className="divide-y divide-gray-900">
                        {loadingReports ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-[#bc13fe] animate-spin" />
                            </div>
                        ) : reports.length === 0 ? (
                            <p className="text-center text-xs text-gray-600 py-8 font-mono">Nenhum relatório anterior.</p>
                        ) : (
                            reports.map(r => (
                                <div key={r.name}>
                                    <button
                                        onClick={() => openReport(r.name)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition ${selectedReport === r.name ? 'bg-[#bc13fe]/5' : ''}`}
                                    >
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span className="text-xs font-mono text-gray-300 flex-1 truncate">{r.name}</span>
                                        <span className="text-[10px] text-gray-600 flex-shrink-0">{fmtBytes(r.size)}</span>
                                        <span className="text-[10px] text-gray-600 flex-shrink-0 hidden sm:block">{fmtDate(r.mtime)}</span>
                                        {selectedReport === r.name
                                            ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                            : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                                    </button>
                                    {selectedReport === r.name && (
                                        <div className="border-t border-gray-900 bg-black/40">
                                            {loadingSelected ? (
                                                <div className="flex items-center justify-center py-6">
                                                    <Loader2 className="w-5 h-5 text-[#bc13fe] animate-spin" />
                                                </div>
                                            ) : (
                                                <pre className="p-5 text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-[400px] overflow-y-auto leading-relaxed">
                                                    {selectedContent}
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}
