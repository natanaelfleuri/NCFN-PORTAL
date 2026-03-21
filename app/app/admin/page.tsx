"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Folder, ShieldAlert, HardDrive, Database, Eye, Activity, Bot, Search, FileSearch, Trash2, Users, FileText, Globe, Cpu, TrendingUp, Clock, BookOpen, Archive, KeyRound, Home, FileCode2, NotebookPen, Binoculars, AlertTriangle, HelpCircle, X, ShieldCheck, UserCog, BarChart3, MessageSquare, Handshake, Play, CheckCircle, Loader2, Lock, FileBarChart, HardDriveDownload, Shield, Plug } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBytes } from '../utils';

const MapDashboard = dynamic(() => import('../components/MapDashboard'), { ssr: false });
const AdminCharts  = dynamic(() => import('../components/AdminCharts'), { ssr: false });

type FileItem = {
    folder: string;
    filename: string;
    isPublic: boolean;
    size: number;
    mtime: string;
};

type SysStats = {
    filesWithPericias: number;
    encryptedCount: number;
    diskFree: number;
    monitoredEvents: number;
    todayLogs: number;
    activeSessions: number;
};

type ScanProgress = { i: number; total: number; file: string; protocol: string };

// ── COFRE – superbotão (span 4 colunas) ──────────────────────────────────────
const VAULT_MODULE = { href: '/vault', icon: Archive, label: 'COFRE DE ARQUIVOS PROTEGIDOS', color: '#bc13fe', bg: 'rgba(188,19,254,0.08)', border: 'rgba(188,19,254,0.25)' };

// ── Cor por grupo de filtro ────────────────────────────────────────────────────
const FILTER_COLORS: Record<string, string> = {
    'TODOS':        '#bc13fe',
    'DOCUMENTOS':   '#3b82f6',
    'SISTEMA':      '#00f3ff',
    'INVESTIGAÇÃO': '#f59e0b',
    'FERRAMENTAS':  '#22c55e',
    'UTILIDADES':   '#f97316',
};

// ── Filtros de categoria (índices 0-based dos MODULES) ────────────────────────
const FILTER_SETS: Record<string, number[] | null> = {
    'TODOS':        null,
    'DOCUMENTOS':   [2, 4, 5, 8, 10, 15],
    'SISTEMA':      [3, 12, 13, 14, 20, 21, 22, 23],
    'INVESTIGAÇÃO': [9, 16, 17, 18, 19],
    'FERRAMENTAS':  [6, 7, 24, 25, 27],
    'UTILIDADES':   [0, 1, 11, 26],
};

// Helpers de cor por grupo
const D = { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)'  }; // DOCUMENTOS
const S = { color: '#00f3ff', bg: 'rgba(0,243,255,0.08)',   border: 'rgba(0,243,255,0.25)'   }; // SISTEMA
const I = { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)'  }; // INVESTIGAÇÃO
const F = { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)'   }; // FERRAMENTAS
const U = { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)'  }; // UTILIDADES

const MODULES = [
    // idx 0 — UTILIDADES
    { href: '/home',                  icon: Home,        label: 'HUB PÚBLICO',                                                                         ...U },
    // idx 1 — UTILIDADES
    { href: '/admin/links-uteis',     icon: NotebookPen, label: 'LINKS ÚTEIS',                                                                         ...U },
    // idx 2 — DOCUMENTOS
    { href: '/admin/pericia-arquivo', icon: FileSearch,  label: 'GERAR NOVO RELATÓRIO / PERÍCIA DIGITAL',                                              ...D },
    // idx 3 — SISTEMA
    { href: '/admin/auditoria-sansao',icon: FileSearch,  label: 'AUDITORIA FORENSE',                                                                   ...S },
    // idx 4 — DOCUMENTOS
    { href: '/admin/cofre',           icon: BookOpen,    label: "LOG'S E INFORMAÇÕES IMUTÁVEIS DOS ATIVOS",                                            ...D },
    // idx 5 — DOCUMENTOS
    { href: '/admin/laudo-forense',   icon: TrendingUp,  label: 'CENTRAL DE RELATÓRIOS / PERÍCIAS DIGITAIS',                                          ...D },
    // idx 6 — FERRAMENTAS
    { href: '/admin/descriptar',      icon: KeyRound,    label: 'DESCRIPTAR ATIVO / REVERTER CRIPTOGRAFIA AES',                                       ...F },
    // idx 7 — FERRAMENTAS
    { href: '/auditor',               icon: ShieldCheck, label: 'VERIFICAR INTEGRIDADE / CALCULAR HASH DO ATIVO',                                     ...F },
    // idx 8 — DOCUMENTOS
    { href: '/vitrine',               icon: Archive,     label: 'CENTRAL DE ATIVOS DISPONIBILIZADOS PARA TERCEIROS',                                  ...D },
    // idx 9 — INVESTIGAÇÃO
    { href: '/admin/forensics',       icon: Eye,         label: 'DETECÇÕES DE CONTRAINTELIGÊNCIA E MONITORAMENTO DE HACKERS E ROBÔS',                 ...I },
    // idx 10 — DOCUMENTOS
    { href: '/admin/lixeira',         icon: Trash2,      label: 'LIXEIRA VIRTUAL',                                                                    ...D },
    // idx 11 — UTILIDADES
    { href: '/doc',                   icon: FileCode2,   label: "DOC'S E MANUAIS DO SISTEMA NCFN",                                                    ...U },
    // idx 12 — SISTEMA
    { href: '/admin/convidados',      icon: Users,       label: 'GERENCIAMENTO DE CONVIDADOS',                                                        ...S },
    // idx 13 — SISTEMA
    { href: '/admin/teste',           icon: Cpu,         label: 'CENTRAL DE MONITORAMENTO E DIAGNÓSTICO DO SISTEMA NCFN',                             ...S },
    // idx 14 — SISTEMA
    { href: '/admin/ia-config',       icon: Bot,         label: 'CENTRAL DE CONFIGURAÇÕES E MONITORAMENTO DA [I.A.] LOCAL - PERITO SANSÃO',           ...S },
    // idx 15 — DOCUMENTOS
    { href: '/admin/logs',            icon: Database,    label: 'CENTRAL DE REGISTRO E MONITORAMENTO DE LOGS DE SESSÕES',                             ...D },
    // idx 16 — INVESTIGAÇÃO
    { href: '/admin/captura-web',     icon: Globe,       label: 'SISTEMA DE COLETA DE ATIVOS EM TEMPO REAL NA INTERNET',                              ...I },
    // idx 17 — INVESTIGAÇÃO
    { href: '/admin/investigar',      icon: Search,      label: 'SISTEMA DE CUSTÓDIA DE DADOS E INVESTIGAÇÕES EM FONTES ABERTAS COLETADOS FORA DO NCFN', ...I },
    // idx 18 — INVESTIGAÇÃO
    { href: '/admin/varreduras',      icon: Binoculars,  label: 'SISTEMA ATIVO DE INVESTIGAÇÕES EM FONTES ABERTAS E NA DEEP/DARK WEB',                ...I },
    // idx 19 — INVESTIGAÇÃO
    { href: '/admin/relatorios',      icon: FileText,    label: 'MAPA DE PLANEJAMENTO E LOCALIZAÇÃO DE ALVOS',                                        ...I },
    // idx 20 — SISTEMA
    { href: '/admin/canary',          icon: AlertTriangle,label: 'DISPOSITIVO PARA CRIAÇÃO DE ARQUIVOS DE CONTRAINTELIGÊNCIA DO NCFN',                ...S },
    // idx 21 — SISTEMA
    { href: '/admin/security',        icon: ShieldAlert, label: 'DISPOSITIVO EXTREMO DE SEGURANÇA DOS ATIVOS CUSTODIADOS',                            ...S },
    // idx 22 — SISTEMA
    { href: '/admin/perfil',          icon: UserCog,     label: 'GERENCIAR PERFIL',                                                                   ...S },
    // idx 23 — SISTEMA
    { href: '/admin/relatorio-geral', icon: BarChart3,   label: 'RELATÓRIOS E AUDITORIAS GLOBAIS DO SISTEMA',                                         ...S },
    // idx 24 — FERRAMENTAS
    { href: '/admin/perfil',          icon: UserCog,     label: 'ATIVAR/DESATIVAR DISPOSITIVO MÓVEL',                                                 ...F },
    // idx 25 — FERRAMENTAS
    { href: '/admin/chat',            icon: MessageSquare,label: 'CENTRAL DE COMUNICAÇÃO INTERNA PROTEGIDA',                                          ...F },
    // idx 26 — UTILIDADES
    { href: '/colaborar',             icon: Handshake,   label: 'TORNE-SE MEMBRO DO NCFN E/OU COLABORE COM O SISTEMA',                               ...U },
    // idx 27 — FERRAMENTAS
    { href: '/admin/api-central',     icon: Plug,        label: "CENTRAL DE GERENCIAMENTO DE API'S DE TERCEIROS",                                     ...F },
];

export default function AdminDashboard() {
    const [files, setFiles]           = useState<FileItem[]>([]);
    const [loading, setLoading]       = useState(true);
    const [vaultSize, setVaultSize]   = useState<number | null>(null);
    const [showHelp, setShowHelp]         = useState(false);
    const [sysStats, setSysStats]         = useState<SysStats | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('TODOS');

    // ── global scan state ────────────────────────────────────────────────────
    const [scanRunning, setScanRunning]     = useState(false);
    const [scanProgress, setScanProgress]   = useState<ScanProgress | null>(null);
    const [scanDone, setScanDone]           = useState(false);
    const [scanReportName, setScanReportName] = useState('');
    const scanAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        fetch('/api/files')
            .then(res => res.json())
            .then(data => { setFiles(data); setLoading(false); })
            .catch(() => setLoading(false));
        fetch('/api/vault/stats')
            .then(res => res.json())
            .then(data => { if (typeof data.size === 'number') setVaultSize(data.size); })
            .catch(() => {});
        fetch('/api/admin/system-stats')
            .then(res => res.json())
            .then(data => setSysStats(data))
            .catch(() => {});
    }, []);

    const validFiles = files.filter(f => f.filename !== 'vazio.txt');
    const groupedFiles = validFiles.reduce((acc, file) => {
        if (!acc[file.folder]) acc[file.folder] = [];
        acc[file.folder].push(file);
        return acc;
    }, {} as Record<string, FileItem[]>);
    const folders = Object.keys(groupedFiles);
    const totalFiles = validFiles.length;
    const totalSize = validFiles.reduce((acc, f) => acc + f.size, 0);
    const recentFilesCount = validFiles.filter(f => {
        const fileDate = new Date(f.mtime);
        const dayAgo = new Date(); dayAgo.setDate(dayAgo.getDate() - 1);
        return fileDate > dayAgo;
    }).length;

    // ── start global scan ────────────────────────────────────────────────────
    const startGlobalScan = useCallback(async () => {
        if (scanRunning) return;
        setScanRunning(true);
        setScanDone(false);
        setScanProgress(null);
        setScanReportName('');

        const abort = new AbortController();
        scanAbortRef.current = abort;

        try {
            const res = await fetch('/api/admin/auditoria-sansao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: null }),
                signal: abort.signal,
            });
            if (!res.ok || !res.body) { setScanRunning(false); return; }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const p = JSON.parse(line.slice(6));
                        if (p.type === 'progress') {
                            setScanProgress({ i: p.index, total: p.total, file: p.file, protocol: p.protocol });
                        } else if (p.type === 'complete') {
                            if (p.reportName) setScanReportName(p.reportName);
                            setScanDone(true);
                            // refresh system stats
                            fetch('/api/admin/system-stats').then(r => r.json()).then(setSysStats).catch(() => {});
                        }
                    } catch (_) {}
                }
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') console.error(e);
        } finally {
            setScanRunning(false);
        }
    }, [scanRunning]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-[#bc13fe]/60 animate-spin" />
                </div>
                <span className="text-[#bc13fe] font-mono text-sm animate-pulse">Acessando Centro de Comando...</span>
            </div>
        </div>
    );

    const scanPct = scanProgress ? Math.round((scanProgress.i / scanProgress.total) * 100) : 0;

    return (
        <div className="mt-6 space-y-10 pb-20 max-w-7xl mx-auto">
            {/* ─── Header ─── */}
            <div className="text-center space-y-3 px-2">
                <div className="inline-flex items-center justify-center p-3 bg-red-900/20 border border-red-500/30 rounded-2xl mb-2 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                    <Activity className="text-red-400 w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#bc13fe] tracking-tighter">
                    NÚCLEO DE INTELIGÊNCIA
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-widest font-mono">Monitoramento Global de Ativos e Diretórios</p>
                <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <span className="text-[10px] font-mono text-gray-500">NEXUS CYBER FORENSIC NETWORK</span>
                    <kbd className="text-[10px] font-mono text-[#bc13fe] bg-black px-1.5 py-0.5 rounded border border-[#bc13fe]/30">⌘ K</kbd>
                </div>
                <button onClick={() => setShowHelp(true)}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all mx-auto">
                    <HelpCircle size={14} /> Como funciona
                </button>
            </div>

            {/* ─── Stats Grid — Linha 1 ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 px-1">
                <StatCard icon={Database} value={String(totalFiles)} label="Ativos sob Custódia" color="#bc13fe" />
                <StatCard icon={HardDrive} value={formatBytes(vaultSize ?? totalSize)} label="Volume Armazenado" color="#00f3ff" />
                <StatCard icon={Clock} value={String(recentFilesCount)} label="Novos (24h)" color="#f59e0b" />
                <Link href="/admin/forensics" className="group">
                    <StatCard
                        icon={Eye}
                        value={sysStats ? String(sysStats.todayLogs) : '—'}
                        label="Acessos Monitorados Hoje"
                        color="#22c55e"
                        hover
                    />
                </Link>
                <Link href="/admin/security" className="group">
                    <StatCard
                        icon={ShieldAlert}
                        value={sysStats ? String(sysStats.monitoredEvents) : '—'}
                        label="Eventos de Segurança Totais"
                        color="#ef4444"
                        hover
                        pulse
                    />
                </Link>
            </div>

            {/* ─── Stats Grid — Linha 2 ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 px-1">
                <StatCard
                    icon={FileBarChart}
                    value={sysStats ? String(sysStats.filesWithPericias) : '—'}
                    label="Ativos com Perícia Salva"
                    color="#8b5cf6"
                />
                <StatCard
                    icon={Lock}
                    value={sysStats ? String(sysStats.encryptedCount) : '—'}
                    label="Ativos Encriptados"
                    color="#f97316"
                />
                <StatCard
                    icon={HardDriveDownload}
                    value={sysStats ? formatBytes(sysStats.diskFree) : '—'}
                    label="Espaço em Disco Disponível"
                    color="#06b6d4"
                />
                <Link href="/admin/auditoria-sansao" className="group">
                    <StatCard
                        icon={Shield}
                        value={sysStats ? String(sysStats.activeSessions) : '—'}
                        label="Sessões Ativas (15min)"
                        color="#bc13fe"
                        hover
                    />
                </Link>

                {/* ── INICIAR VARREDURA GERAL ── */}
                <button
                    onClick={startGlobalScan}
                    disabled={scanRunning}
                    className="glass-panel p-4 lg:p-5 rounded-2xl flex flex-col items-center text-center gap-2 transition-all duration-300 border cursor-pointer hover:scale-[1.03] disabled:cursor-not-allowed"
                    style={{ borderColor: scanDone ? '#22c55e30' : scanRunning ? '#bc13fe30' : '#bc13fe30' }}
                >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: scanDone ? '#22c55e12' : '#bc13fe12', border: `1px solid ${scanDone ? '#22c55e25' : '#bc13fe25'}` }}>
                        {scanRunning
                            ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#bc13fe' }} />
                            : scanDone
                                ? <CheckCircle className="w-5 h-5" style={{ color: '#22c55e' }} />
                                : <Play className="w-5 h-5" style={{ color: '#bc13fe' }} />}
                    </div>

                    {scanRunning && scanProgress ? (
                        <div className="w-full space-y-1">
                            <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#bc13fe] to-[#8b5cf6] rounded-full transition-all duration-500"
                                    style={{ width: `${scanPct}%` }} />
                            </div>
                            <span className="text-[9px] font-mono text-[#bc13fe]">{scanPct}% — {scanProgress.i}/{scanProgress.total}</span>
                        </div>
                    ) : (
                        <span className="text-xl lg:text-2xl font-black text-white leading-none">
                            {scanDone ? '✓' : '▶'}
                        </span>
                    )}

                    <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider leading-tight"
                        style={{ color: scanDone ? '#22c55e' : '#bc13fe' }}>
                        {scanDone
                            ? 'Relatório Gerado!'
                            : scanRunning
                                ? 'Analisando...'
                                : 'Iniciar Varredura Geral'}
                    </span>
                </button>
            </div>

            {/* ─── Charts ─── */}
            {validFiles.length > 0 && (
                <>
                    <SectionTitle title="Painel Analítico" subtitle="Métricas de custódia em tempo real" color="#00f3ff" />
                    <AdminCharts files={files} />
                </>
            )}

            {/* ─── Modules ─── */}
            <SectionTitle title="Módulos do Sistema" subtitle="Ferramentas operacionais" color="#bc13fe" />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 px-1">

                {/* ── Barra de filtros ── */}
                <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex items-center gap-1.5 flex-wrap">
                    {Object.keys(FILTER_SETS).map(filter => {
                        const checked = activeFilter === filter;
                        const fc = FILTER_COLORS[filter] ?? '#bc13fe';
                        const fcRgb = fc === '#bc13fe' ? '188,19,254'
                                    : fc === '#3b82f6' ? '59,130,246'
                                    : fc === '#00f3ff' ? '0,243,255'
                                    : fc === '#f59e0b' ? '245,158,11'
                                    : fc === '#22c55e' ? '34,197,94'
                                    : '249,115,22';
                        return (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter === activeFilter ? 'TODOS' : filter)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md border transition-all duration-150 select-none"
                                style={{
                                    borderColor: checked ? `rgba(${fcRgb},0.45)` : 'rgba(255,255,255,0.08)',
                                    background:  checked ? `rgba(${fcRgb},0.12)` : 'rgba(255,255,255,0.03)',
                                }}
                            >
                                {/* checkbox visual */}
                                <span
                                    className="flex items-center justify-center rounded-sm flex-shrink-0 transition-all duration-150"
                                    style={{
                                        width: 10, height: 10,
                                        border: `1px solid ${checked ? fc : 'rgba(255,255,255,0.2)'}`,
                                        background: checked ? fc : 'transparent',
                                    }}
                                >
                                    {checked && (
                                        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                                            <path d="M1 2.5L2.8 4L6 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                </span>
                                <span
                                    className="font-bold uppercase tracking-wider leading-none"
                                    style={{
                                        fontSize: 9,
                                        color: checked ? fc : 'rgba(255,255,255,0.3)',
                                    }}
                                >
                                    {filter}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* COFRE — superbotão spanning 4 colunas (nunca muda) */}
                <Link href={VAULT_MODULE.href} className="group col-span-2 sm:col-span-3 lg:col-span-4">
                    <div
                        className="cofre-border-scan rounded-2xl p-4 lg:p-5 cursor-pointer flex items-center gap-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border backdrop-blur-xl"
                        style={{ background: VAULT_MODULE.bg, borderColor: VAULT_MODULE.border }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${VAULT_MODULE.color}25`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                    >
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${VAULT_MODULE.color}15`, border: `1px solid ${VAULT_MODULE.color}30` }}>
                            <VAULT_MODULE.icon className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: VAULT_MODULE.color }} />
                        </div>
                        <Lock className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0 text-red-400 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <h3 className="text-sm lg:text-base font-black text-white/90 tracking-wider uppercase">{VAULT_MODULE.label}</h3>
                    </div>
                </Link>

                {/* Demais módulos */}
                {MODULES.map((mod, idx) => {
                    const visible = activeFilter === 'TODOS' || (FILTER_SETS[activeFilter]?.includes(idx) ?? false);
                    return (
                        <Link
                            key={`${mod.href}-${idx}`}
                            href={visible ? mod.href : '#'}
                            className={`group transition-all duration-300 ${!visible ? 'pointer-events-none' : ''}`}
                            style={{ opacity: visible ? 1 : 0.2 }}
                            tabIndex={visible ? undefined : -1}
                        >
                            <div
                                className={`rounded-2xl p-3 lg:p-4 h-36 flex flex-col items-center justify-center gap-2 transition-all duration-300 border backdrop-blur-xl ${visible ? 'cursor-pointer hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]' : 'cursor-default grayscale'}`}
                                style={{ background: mod.bg, borderColor: visible ? mod.border : 'rgba(255,255,255,0.05)' }}
                                onMouseEnter={e => { if (visible) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${mod.color}20`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                            >
                                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}30` }}>
                                    <mod.icon className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: mod.color }} />
                                </div>
                                <h3 className={`module-cursor text-[9px] lg:text-[10px] font-bold text-center leading-tight line-clamp-4 px-1 transition-colors duration-200 ${visible ? 'text-gray-500 group-hover:text-white' : 'text-gray-600'}`}>
                                    {mod.label}
                                </h3>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* ─── Custody Zones ─── */}
            {(() => {
                const custodyFolders = folders
                    .filter(f => f !== 'capturas_web' && f !== 'RELATORIOS' && f !== 'RELATÓRIOS')
                    .sort((a, b) => {
                        const na = parseInt(a.match(/^(\d+)/)?.[1] ?? '9999', 10);
                        const nb = parseInt(b.match(/^(\d+)/)?.[1] ?? '9999', 10);
                        if (na !== nb) return na - nb;
                        return a.localeCompare(b);
                    });
                return (
                    <>
                        <SectionTitle title="Zonas de Custódia Digital" subtitle={`${custodyFolders.length} diretórios ativos`} color="#9ca3af" />
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
                            {custodyFolders.length === 0 ? (
                                <p className="col-span-full text-center text-gray-600 py-10 font-mono text-sm">Nenhum diretório local detectado.</p>
                            ) : (
                                custodyFolders.map(folder => {
                                    const isSystem = folder.startsWith('_');
                                    const count = groupedFiles[folder].length;
                                    const size = groupedFiles[folder].reduce((a, f) => a + f.size, 0);
                                    return (
                                        <Link key={folder} href={`/admin/pasta/${encodeURIComponent(folder)}`} className="group">
                                            <div className={`glass-panel p-3 lg:p-4 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] ${isSystem ? 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.08)]' : 'border-[#bc13fe]/25 hover:border-[#bc13fe]/50'}`}>
                                                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${isSystem ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#bc13fe]/8 border border-[#bc13fe]/20'}`}>
                                                    {isSystem
                                                        ? <ShieldAlert className="text-red-400 w-5 h-5 lg:w-6 lg:h-6 animate-pulse" />
                                                        : <Folder className="text-[#bc13fe] w-5 h-5 lg:w-6 lg:h-6" />
                                                    }
                                                </div>
                                                <div className="text-center w-full">
                                                    <h3 className={`text-xs font-bold capitalize truncate max-w-full px-1 transition-colors duration-200 ${isSystem ? 'text-red-400' : 'text-gray-500 group-hover:text-white'}`}>
                                                        {folder.replace(/_/g, ' ')}
                                                    </h3>
                                                    <p className="text-[9px] text-gray-600 font-mono mt-0.5">{formatBytes(size)}</p>
                                                </div>
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isSystem ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/20'}`}>
                                                    {count} {count === 1 ? 'arq.' : 'arqs.'}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </>
                );
            })()}

            {/* ─── Map ─── */}
            <hr className="border-[#bc13fe]/10 my-8" />
            <MapDashboard />

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
                            <p>Este é o <strong className="text-white">Centro de Comando NCFN</strong> — painel principal do administrador com acesso a todos os módulos operacionais do sistema.</p>
                            <p>O <strong className="text-white">Vault Forense</strong> armazena todas as evidências com criptografia AES-256, hash SHA-256 e carimbo temporal RFC 3161 para garantir a cadeia de custódia legal.</p>
                            <p>Os <strong className="text-white">gráficos analíticos</strong> exibem a atividade do vault em tempo real — volume de arquivos, distribuição por pasta e novos ativos nas últimas 24h.</p>
                            <p>O <strong className="text-white">mapa de acessos</strong> exibe as localizações geográficas dos IPs que acessaram o portal, auxiliando na detecção de anomalias.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, value, label, color, hover, pulse }: {
  icon: any; value: string; label: string; color: string; hover?: boolean; pulse?: boolean;
}) {
  return (
    <div
      className={`glass-panel p-4 lg:p-5 rounded-2xl flex flex-col items-center text-center gap-2 transition-all duration-300 ${hover ? 'hover:scale-[1.03] cursor-pointer' : ''}`}
      style={{ borderColor: `${color}30` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
        <Icon className={`w-5 h-5 ${pulse ? 'animate-pulse' : ''}`} style={{ color }} />
      </div>
      <span className="text-xl lg:text-2xl font-black text-white leading-none">{value}</span>
      <span className="text-[9px] lg:text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">{label}</span>
    </div>
  );
}

function SectionTitle({ title, subtitle, color }: { title: string; subtitle?: string; color: string }) {
  return (
    <div className="flex items-center gap-4 px-1">
      <div>
        <h3 className="text-base lg:text-lg font-black uppercase tracking-wider" style={{ color }}>{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-600 font-mono mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-px flex-grow" style={{ background: `linear-gradient(to right, ${color}30, transparent)` }} />
    </div>
  );
}
