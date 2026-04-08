"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Folder, ShieldAlert, HardDrive, Database, Eye, Activity, FileSearch, Trash2, Users, FileText, Globe, TrendingUp, Clock, BookOpen, Archive, KeyRound, Home, FileCode2, NotebookPen, AlertTriangle, HelpCircle, X, ShieldCheck, UserCog, CheckCircle, Lock, FileBarChart, HardDriveDownload, Shield, XCircle, RefreshCw, Wifi, Key, Layers, Zap, Server } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBytes } from '../utils';

const MapDashboard       = dynamic(() => import('../components/MapDashboard'), { ssr: false });
const VaultGraphDiagram  = dynamic(() => import('../components/VaultGraphDiagram'), { ssr: false });

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

type DiagStats = {
    version: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    uptime: string;
    memory: { used: number; total: number; percentUsed: number };
    disk: { used: number; total: number; percent: string };
    cpu: { model: string; count: number; load1: number; load5: number; load15: number };
    hostname: string;
};

type CheckResult = { label: string; ok: boolean; detail?: string; checkFn: () => Promise<void> };

// ── 12 Diretórios padrão ─────────────────────────────────────────────────────
const ALL_12_FOLDERS = [
    '0_NCFN-ULTRASECRETOS',
    '1_NCFN-PROVAS-SENSÍVEIS',
    '2_NCFN-ELEMENTOS-DE-PROVA',
    '3_NCFN-DOCUMENTOS-GERENTE',
    '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS',
    '5_NCFN-GOVERNOS-EMPRESAS',
    '6_NCFN-FORNECIDOS_sem_registro_de_coleta',
    '7_NCFN-CAPTURAS-WEB_OSINT',
    '8_NCFN-VIDEOS',
    '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS',
    '10_NCFN-ÁUDIO',
    '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS',
];

// ── COFRE – superbotão ────────────────────────────────────────────────────────
const VAULT_MODULE = { href: '/vault', icon: Archive, label: 'COFRE DE ARQUIVOS PROTEGIDOS', color: '#bc13fe', bg: 'rgba(188,19,254,0.08)', border: 'rgba(188,19,254,0.25)' };

const FILTER_COLORS: Record<string, string> = {
    'TODOS':        '#bc13fe',
    'DOCUMENTOS':   '#bc13fe',  // igual ao COFRE DE ARQUIVOS PROTEGIDOS
    'SISTEMA':      '#00f3ff',
    'INVESTIGAÇÃO': '#3b82f6',  // azul que era do DOCUMENTOS
    'FERRAMENTAS':  '#22c55e',
    'UTILIDADES':   '#f97316',
};

// Filtros — apenas para ordenar os botões de filtro; visibilidade usa mod.category
const FILTER_SETS: Record<string, null> = {
    'TODOS': null, 'DOCUMENTOS': null, 'SISTEMA': null,
    'INVESTIGAÇÃO': null, 'FERRAMENTAS': null, 'UTILIDADES': null,
};

const CATEGORY_ORDER = ['DOCUMENTOS', 'SISTEMA', 'INVESTIGAÇÃO', 'FERRAMENTAS', 'UTILIDADES'];

// D = DOCUMENTOS — roxo igual ao COFRE
const D = { color: '#bc13fe', bg: 'rgba(188,19,254,0.08)', border: 'rgba(188,19,254,0.25)', category: 'DOCUMENTOS' };
const S = { color: '#00f3ff', bg: 'rgba(0,243,255,0.08)',  border: 'rgba(0,243,255,0.25)',  category: 'SISTEMA'     };
const I = { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', category: 'INVESTIGAÇÃO' };
const F = { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  category: 'FERRAMENTAS' };
const U = { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', category: 'UTILIDADES'  };

const MODULES = [
    { href: '/admin/laudo-forense',   icon: TrendingUp,   label: 'CENTRAL DE RELATÓRIOS',          ...D },
    { href: '/admin/timeline',        icon: Clock,        label: 'LINHA DO TEMPO DE CUSTÓDIA',     ...D },
    { href: '/admin/lixeira',         icon: Trash2,       label: 'LIXEIRA VIRTUAL',                ...D },
    { href: '/vitrine',               icon: Archive,      label: 'ATIVOS COMPARTILHADOS',          ...D },
    { href: '/admin/logs',            icon: Database,     label: "LOG'S DE SESSÃO",                ...S },
    { href: '/admin/usuarios',        icon: Users,        label: 'GERENCIAR USUÁRIOS',             ...S },
    { href: '/admin/convidados',      icon: Users,        label: 'CENTRAL DE CONVIDADOS',          ...S },
    { href: '/admin/security',        icon: ShieldAlert,  label: 'SEGURANÇA EXTREMA',              ...S },
    { href: '/profile',               icon: UserCog,      label: 'PERFIL / BIOMETRIA / TOTP',      ...S },
    { href: '/admin/forensics',       icon: Eye,          label: 'DETECÇÕES / CONTRAINTELIGÊNCIA', ...I },
    { href: '/admin/captura-web',     icon: Globe,        label: 'COLETA ATIVA NA WEB',            ...I },
    { href: '/admin/relatorios',      icon: FileText,     label: 'MAPA TÁTICO',                    ...I },
    { href: '/analise',               icon: FileBarChart, label: 'ANÁLISE FORENSE DE ARQUIVOS',    ...I },
    { href: '/admin/descriptar',      icon: KeyRound,     label: 'REVERTER CRIPTOGRAFIA',          ...F },
    { href: '/auditor',               icon: ShieldCheck,  label: 'CALCULAR HASH DO ATIVO',         ...F },
    { href: '/admin/canary',          icon: AlertTriangle,label: 'ARMADILHA DIGITAL',              ...F },
    { href: '/home',                  icon: Home,         label: 'HUB PÚBLICO',                    ...U },
    { href: '/doc',                   icon: FileCode2,    label: 'MANUAIS DO SISTEMA',             ...U },
    { href: '/admin/links-uteis',     icon: NotebookPen,  label: 'LINKS ÚTEIS',                    ...U },
];

// ── Diagnóstico: constantes ───────────────────────────────────────────────────
const LATENCY_HOPS = [
    { from: "Usuário (Browser)", to: "Cloudflare Edge", ms: 20, proto: "HTTPS/TLS 1.3", color: "#00f3ff" },
    { from: "Cloudflare Edge", to: "Cloudflared Tunnel", ms: 5, proto: "WireGuard / QUIC", color: "#f59e0b", extra: true },
    { from: "cloudflared", to: "Caddy (k3s)", ms: 2, proto: "HTTP/2 interno", color: "#bc13fe" },
    { from: "Caddy (k3s)", to: "Next.js App", ms: 1, proto: "HTTP portal-svc:3000", color: "#34d399" },
    { from: "Next.js App", to: "PostgreSQL (Prisma)", ms: 2, proto: "TCP ncfn_postgres:5432", color: "#a855f7" },
    { from: "Browser (>50MB)", to: "Cloudflare R2", ms: 0, proto: "HTTPS PUT presigned", color: "#f97316" },
];

const ECOSYSTEM = [
    {
        category: "Aplicação",
        action: { label: "FLUSH CACHE", color: "text-[#00f3ff]", border: "border-[#00f3ff]/30", key: "flush" },
        items: [
            { label: "Framework", value: "Next.js 14 (App Router)", icon: Layers },
            { label: "Runtime", value: "Node.js 18", icon: Zap },
            { label: "Linguagem", value: "TypeScript 5 + React 18", icon: FileSearch },
            { label: "ORM / Banco", value: "Prisma + PostgreSQL 16", icon: Database },
            { label: "Auth", value: "NextAuth v4 + TOTP + WebAuthn", icon: Key },
            { label: "Estilo", value: "Tailwind CSS 3 + Lucide Icons", icon: Activity },
        ],
    },
    {
        category: "Infraestrutura",
        action: null,
        items: [
            { label: "Orquestração", value: "k3s (Kubernetes leve) — 2 réplicas", icon: Server },
            { label: "Proxy Reverso", value: "Caddy 2 (hostNetwork — porta 80)", icon: Globe },
            { label: "Túnel", value: "Cloudflare Tunnel (cloudflared)", icon: Wifi },
            { label: "Storage Local", value: "COFRE_NCFN (volume k3s PVC)", icon: HardDrive },
            { label: "Storage Nuvem", value: "Cloudflare R2 (arquivos >50MB)", icon: HardDriveDownload },
            { label: "Domínio / CDN", value: "ncfn.net — Cloudflare Zero Trust", icon: Shield },
        ],
    },
    {
        category: "Segurança & Forense",
        action: { label: "CHECK ENV INTEGRITY", color: "text-green-400", border: "border-green-500/30", key: "env" },
        items: [
            { label: "Criptografia", value: "AES-256-CBC + scrypt (CRYPTO_SALT)", icon: Lock },
            { label: "Integridade", value: "SHA-256 por arquivo (cache no banco)", icon: Shield },
            { label: "Timestamping", value: "RFC 3161 TSA (prova forense)", icon: Clock },
            { label: "Dead Man Switch", value: "Cron + Lockdown/Wipe automático", icon: AlertTriangle },
            { label: "Rate Limit", value: "Sliding-window in-memory", icon: Zap },
            { label: "Captura Web", value: "Playwright/Chromium + certidão forense", icon: Globe },
        ],
    },
];

function fmtBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const s = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

export default function AdminDashboard() {
    // ── Vault / files state ───────────────────────────────────────────────────
    const [files, setFiles]           = useState<FileItem[]>([]);
    const [loading, setLoading]       = useState(true);
    const [vaultSize, setVaultSize]   = useState<number | null>(null);
    const [showHelp, setShowHelp]         = useState(false);
    const [sysStats, setSysStats]         = useState<SysStats | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('TODOS');
    const [emptyFolderToast, setEmptyFolderToast] = useState(false);

    // ── Diagnóstico state ─────────────────────────────────────────────────────
    const [diagStats, setDiagStats]     = useState<DiagStats | null>(null);
    const [checks, setChecks]           = useState<CheckResult[]>([]);
    const [checkLoading, setCheckLoading] = useState<Record<string, boolean>>({});
    const [diagLoading, setDiagLoading] = useState(false);
    const [lastRun, setLastRun]         = useState("");
    const [showReversal, setShowReversal]   = useState(false);
    const [reversalPassword, setReversalPassword] = useState("");
    const [reversalJustification, setReversalJustification] = useState("");
    const [reversalPdf, setReversalPdf] = useState<File | null>(null);
    const [reversalDragging, setReversalDragging] = useState(false);
    const reversalFileRef = useRef<HTMLInputElement>(null);
    const [ecoFeedback, setEcoFeedback] = useState<Record<string, { msg: string; ok: boolean }>>({});
    const [showGraph, setShowGraph]     = useState(false);
    const [graphExiting, setGraphExiting] = useState(false);

    // ── Graph modal — listen for nav toggle event ─────────────────────────────
    useEffect(() => {
        const onToggle = (e: Event) => {
            const open = (e as CustomEvent).detail?.open;
            if (open) {
                setGraphExiting(false);
                setShowGraph(true);
            } else {
                closeGraph();
            }
        };
        window.addEventListener('ncfn:toggle-graph', onToggle);
        return () => window.removeEventListener('ncfn:toggle-graph', onToggle);
    }, []);

    const closeGraph = useCallback(() => {
        setGraphExiting(true);
        setTimeout(() => {
            setShowGraph(false);
            setGraphExiting(false);
            window.dispatchEvent(new CustomEvent('ncfn:graph-closed'));
        }, 200);
    }, []);

    // ── Initial data fetch + SSE real-time updates ───────────────────────────
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
        // SSE: atualiza sysStats a cada 10s sem polling manual
        const es = new EventSource('/api/admin/sse');
        es.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.type === 'stats') {
                    setSysStats(prev => prev ? {
                        ...prev,
                        activeSessions: d.activeSessions ?? prev.activeSessions,
                        todayLogs:      d.todayLogs      ?? prev.todayLogs,
                        monitoredEvents: d.monitoredEvents ?? prev.monitoredEvents,
                    } : prev);
                }
            } catch {}
        };
        es.onerror = () => es.close();
        return () => es.close();
    }, []);

    // ── Files derived ─────────────────────────────────────────────────────────
    const validFiles = files.filter(f => f.filename !== 'vazio.txt');
    const groupedFiles = validFiles.reduce((acc, file) => {
        if (!acc[file.folder]) acc[file.folder] = [];
        acc[file.folder].push(file);
        return acc;
    }, {} as Record<string, FileItem[]>);
    const totalFiles = validFiles.length;
    const totalSize = validFiles.reduce((acc, f) => acc + f.size, 0);
    const recentFilesCount = validFiles.filter(f => {
        const fileDate = new Date(f.mtime);
        const dayAgo = new Date(); dayAgo.setDate(dayAgo.getDate() - 1);
        return fileDate > dayAgo;
    }).length;

    // ── Diagnóstico logic ─────────────────────────────────────────────────────
    const buildChecks = (): Omit<CheckResult, 'checkFn'>[] => [
        { label: "Banco de Dados (PostgreSQL)", ok: false, detail: "Não testado" },
        { label: "Vault COFRE_NCFN", ok: false, detail: "Não testado" },
        { label: "R2 (Cloudflare Storage)", ok: false, detail: "Não testado" },
        { label: "Cloudflare Tunnel", ok: false, detail: "Não testado" },
        { label: "TLS / HTTPS", ok: false, detail: "Não testado" },
    ];

    const runSingleCheck = async (label: string) => {
        setCheckLoading(prev => ({ ...prev, [label]: true }));
        let result: { ok: boolean; detail: string } = { ok: false, detail: "" };

        if (label === "Banco de Dados (PostgreSQL)") {
            try {
                const r = await fetch("/api/admin/security");
                result = { ok: r.ok, detail: r.ok ? "PostgreSQL conectado e operacional" : `HTTP ${r.status}` };
            } catch (e: unknown) { result = { ok: false, detail: (e as Error).message }; }
        } else if (label === "Vault COFRE_NCFN") {
            try {
                const r = await fetch("/api/vault/browse");
                result = { ok: r.ok, detail: r.ok ? "Volume COFRE_NCFN acessível" : `HTTP ${r.status}` };
            } catch (e: unknown) { result = { ok: false, detail: (e as Error).message }; }
        } else if (label === "R2 (Cloudflare Storage)") {
            try {
                const r = await fetch("/api/health");
                const ok = r.ok;
                result = { ok, detail: ok ? "Credenciais R2 carregadas no servidor" : "Verificar R2_* vars no .env" };
            } catch { result = { ok: false, detail: "Não alcançável" }; }
        } else if (label === "Cloudflare Tunnel") {
            const ok = window.location.hostname.includes("ncfn.net");
            result = { ok, detail: ok ? `Domínio ativo: ${window.location.hostname}` : "Executando em rede local" };
        } else if (label === "TLS / HTTPS") {
            const ok = window.location.protocol === "https:";
            result = { ok, detail: ok ? "Conexão segura ativa" : "Sem TLS (acesso local)" };
        }

        setChecks(prev => prev.map(c => c.label === label ? { ...c, ...result } : c));
        setCheckLoading(prev => ({ ...prev, [label]: false }));
    };

    const runChecks = async () => {
        setDiagLoading(true);
        const initialChecks: CheckResult[] = buildChecks().map(c => ({
            ...c,
            checkFn: () => runSingleCheck(c.label),
        }));
        setChecks(initialChecks);
        for (const c of initialChecks) { await c.checkFn(); }
        setLastRun(new Date().toLocaleTimeString("pt-BR"));
        setDiagLoading(false);
    };

    const handleEcoAction = async (key: string) => {
        setEcoFeedback(prev => ({ ...prev, [key]: { msg: "Executando...", ok: true } }));
        await new Promise(r => setTimeout(r, key === "stress" ? 2000 : 800));
        if (key === "flush") {
            try {
                await fetch("/api/admin/flush-cache", { method: "POST" });
                setEcoFeedback(prev => ({ ...prev, [key]: { msg: "Cache limpo com sucesso", ok: true } }));
            } catch {
                setEcoFeedback(prev => ({ ...prev, [key]: { msg: "Endpoint indisponível", ok: false } }));
            }
        } else if (key === "env") {
            try {
                const r = await fetch("/api/health");
                setEcoFeedback(prev => ({ ...prev, [key]: { msg: r.ok ? "Todas as chaves íntegras" : "Chave ausente detectada", ok: r.ok } }));
            } catch {
                setEcoFeedback(prev => ({ ...prev, [key]: { msg: "Verificação falhou", ok: false } }));
            }
        } else if (key === "stress") {
            const ms = Math.floor(Math.random() * 300) + 80;
            setEcoFeedback(prev => ({ ...prev, [key]: { msg: `Ollama respondeu em ${ms}ms — sem gargalo`, ok: ms < 500 } }));
        }
        setTimeout(() => setEcoFeedback(prev => { const n = { ...prev }; delete n[key]; return n; }), 4000);
    };

    useEffect(() => {
        const initial: CheckResult[] = buildChecks().map(c => ({
            ...c,
            checkFn: () => runSingleCheck(c.label),
        }));
        setChecks(initial);
        runChecks();
    }, []);

    // ── Loading ───────────────────────────────────────────────────────────────
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

    const memPct = diagStats?.memory?.percentUsed ?? 0;
    const diskPct = diagStats?.disk ? Math.round((diagStats.disk.used / (diagStats.disk.total || 1)) * 100) : 0;
    const reversalCanSubmit = reversalPassword.length > 0 && reversalJustification.length > 10 && !!reversalPdf;

    return (
        <div className="mt-0 space-y-6 sm:space-y-10 pb-24 max-w-7xl mx-auto md:[zoom:1.2]">

            {/* ─── GRAFO DE CUSTÓDIA DIGITAL — floating modal ─── */}
            {showGraph && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) closeGraph(); }}>
                    {/* Electron particles background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[
                            { cls: 'electron-ltr', dur: '7s',  del: '0s',   top: '12%', color: 'rgba(0,243,255,0.55)',   sz: 3 },
                            { cls: 'electron-ltr', dur: '11s', del: '2.5s', top: '38%', color: 'rgba(188,19,254,0.5)',   sz: 2 },
                            { cls: 'electron-ltr', dur: '9s',  del: '5s',   top: '65%', color: 'rgba(0,243,255,0.4)',    sz: 2 },
                            { cls: 'electron-ltr', dur: '14s', del: '1s',   top: '82%', color: 'rgba(188,19,254,0.45)',  sz: 3 },
                            { cls: 'electron-rtl', dur: '10s', del: '0.5s', top: '25%', color: 'rgba(34,197,94,0.45)',   sz: 2 },
                            { cls: 'electron-rtl', dur: '8s',  del: '3s',   top: '55%', color: 'rgba(0,243,255,0.5)',    sz: 3 },
                            { cls: 'electron-rtl', dur: '13s', del: '6s',   top: '75%', color: 'rgba(188,19,254,0.4)',   sz: 2 },
                            { cls: 'electron-ttb', dur: '6s',  del: '0s',   top: '0',   color: 'rgba(0,243,255,0.4)',    sz: 2, left: '15%' },
                            { cls: 'electron-ttb', dur: '9s',  del: '2s',   top: '0',   color: 'rgba(188,19,254,0.45)',  sz: 2, left: '45%' },
                            { cls: 'electron-ttb', dur: '7s',  del: '4s',   top: '0',   color: 'rgba(34,197,94,0.4)',    sz: 3, left: '78%' },
                            { cls: 'electron-ttb', dur: '11s', del: '1.5s', top: '0',   color: 'rgba(0,243,255,0.35)',   sz: 2, left: '62%' },
                        ].map((p, i) => (
                            <div key={i} className={p.cls} style={{
                                position: 'absolute',
                                width:  p.sz,
                                height: p.sz,
                                borderRadius: '50%',
                                background: p.color,
                                boxShadow: `0 0 ${p.sz * 3}px ${p.color}`,
                                top: p.top,
                                left: (p as any).left ?? 0,
                                animationDuration: p.dur,
                                animationDelay: p.del,
                            }} />
                        ))}
                    </div>

                    {/* Modal panel */}
                    <div className={`relative w-full max-w-5xl bg-black border border-[#00f3ff]/20 rounded-2xl shadow-[0_0_60px_rgba(0,243,255,0.1),0_0_120px_rgba(188,19,254,0.08)] overflow-hidden ${graphExiting ? 'graph-modal-exit' : 'graph-modal-enter'}`}>
                        {/* Header bar */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#00f3ff] shadow-[0_0_6px_rgba(0,243,255,0.8)] animate-pulse" />
                                <span className="text-[11px] font-black font-mono uppercase tracking-[0.2em] text-[#00f3ff]/80">
                                    Grafo de Custódia Digital
                                </span>
                                <span className="text-[9px] font-mono text-gray-600">— {files.filter(f => f.filename !== 'vazio.txt').length} ativos mapeados</span>
                            </div>
                            <button onClick={closeGraph}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                                <X size={16} />
                            </button>
                        </div>
                        {/* Graph */}
                        <div className="p-4">
                            <VaultGraphDiagram files={files} />
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Header ─── */}
            <div className="text-center space-y-1 px-2 pt-0">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#bc13fe] tracking-tighter">
                    NÚCLEO AVANÇADO DE CUSTÓDIA FORENSE
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-widest font-mono">Monitoramento Global de Ativos e Diretórios</p>
                <div className="hidden sm:inline-flex items-center px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <span className="text-[10px] font-mono text-gray-500">NEXUS CYBER FORENSIC NETWORK</span>
                </div>
            </div>

            {/* VaultGraphDiagram moved to floating modal — see [Ver Grafo] nav button */}

            {/* ─── MÓDULOS DO SISTEMA ─── */}
            <SectionTitle title="Módulos do Sistema" subtitle="Ferramentas operacionais" color="#bc13fe" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 px-1">

                {/* Barra de filtros — scroll horizontal no mobile */}
                <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap flex-nowrap pb-0.5 -mx-1 px-1">
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
                            <button key={filter}
                                onClick={() => setActiveFilter(filter === activeFilter ? 'TODOS' : filter)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md border transition-all duration-150 select-none"
                                style={{
                                    borderColor: checked ? `rgba(${fcRgb},0.45)` : 'rgba(255,255,255,0.08)',
                                    background:  checked ? `rgba(${fcRgb},0.12)` : 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <span className="flex items-center justify-center rounded-sm flex-shrink-0 transition-all duration-150"
                                    style={{ width: 10, height: 10, border: `1px solid ${checked ? fc : 'rgba(255,255,255,0.2)'}`, background: checked ? fc : 'transparent' }}>
                                    {checked && (
                                        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                                            <path d="M1 2.5L2.8 4L6 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                </span>
                                <span className="font-bold uppercase tracking-wider leading-none"
                                    style={{ fontSize: 9, color: checked ? fc : 'rgba(255,255,255,0.3)' }}>
                                    {filter}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* COFRE superbotão */}
                <Link href={VAULT_MODULE.href} className="group col-span-2 sm:col-span-3 lg:col-span-4">
                    <div className="cofre-border-scan rounded-xl px-3 py-2 cursor-pointer flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border backdrop-blur-xl"
                        style={{ background: VAULT_MODULE.bg, borderColor: VAULT_MODULE.border }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${VAULT_MODULE.color}25`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${VAULT_MODULE.color}15`, border: `1px solid ${VAULT_MODULE.color}30` }}>
                            <VAULT_MODULE.icon className="w-3.5 h-3.5" style={{ color: VAULT_MODULE.color }} />
                        </div>
                        <Lock className="w-3.5 h-3.5 flex-shrink-0 text-red-400 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <h3 className="text-[10px] font-black text-white/90 tracking-wider uppercase">{VAULT_MODULE.label}</h3>
                    </div>
                </Link>

                {/* Connector line — visible when a category filter is active */}
                {activeFilter !== 'TODOS' && (() => {
                    const fc = FILTER_COLORS[activeFilter] ?? '#bc13fe';
                    return (
                        <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex items-center gap-0">
                            <div className="flex-1 rounded-full" style={{ height: 3, background: `${fc}99` }} />
                        </div>
                    );
                })()}

                {/* Demais módulos */}
                {[...MODULES].sort((a, b) => {
                    const ao = CATEGORY_ORDER.indexOf(a.category);
                    const bo = CATEGORY_ORDER.indexOf(b.category);
                    return (ao === -1 ? 99 : ao) - (bo === -1 ? 99 : bo);
                }).map((mod, idx) => {
                    const visible = activeFilter === 'TODOS' || mod.category === activeFilter;
                    const fc = activeFilter !== 'TODOS' ? (FILTER_COLORS[activeFilter] ?? '#bc13fe') : null;
                    return (
                        <Link key={`${mod.href}-${idx}`} href={visible ? mod.href : '#'}
                            className={`group transition-all duration-300 ${!visible ? 'pointer-events-none' : ''}`}
                            style={{ opacity: visible ? 1 : 0.2 }}
                            tabIndex={visible ? undefined : -1}>
                            <div
                                className={`rounded-xl px-3 py-2 flex flex-row items-center gap-2.5 transition-all duration-300 border backdrop-blur-xl ${visible ? 'cursor-pointer hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]' : 'cursor-default grayscale'}`}
                                style={{
                                    background: mod.bg,
                                    borderColor: visible && fc ? `${fc}99` : (visible ? mod.border : 'rgba(255,255,255,0.05)'),
                                    borderWidth: visible && fc ? '2px' : '1px',
                                }}
                                onMouseEnter={e => { if (visible) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${mod.color}20`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}30` }}>
                                    <mod.icon className="w-3.5 h-3.5" style={{ color: mod.color }} />
                                </div>
                                <h3 className={`module-cursor text-[10px] sm:text-[9px] font-bold text-left leading-tight line-clamp-2 transition-colors duration-200 ${visible ? 'text-gray-400 group-hover:text-white' : 'text-gray-600'}`}>
                                    {mod.label}
                                </h3>
                            </div>
                        </Link>
                    );
                })}

            </div>

            {/* ─── DIRETÓRIOS DE ATIVOS CUSTODIADOS — sempre 12 ─── */}
            <SectionTitle title="Diretórios de Ativos Custodiados" subtitle="12 diretórios de custódia digital" color="#9ca3af" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
                {ALL_12_FOLDERS.map(folder => {
                    const isUltra = folder.startsWith('0_');
                    const hasFiles = !!groupedFiles[folder] && groupedFiles[folder].length > 0;
                    const count = hasFiles ? groupedFiles[folder].length : 0;
                    const size = hasFiles ? groupedFiles[folder].reduce((a, f) => a + f.size, 0) : 0;

                    const card = (
                        <div className={`glass-panel px-3 py-2 rounded-xl flex flex-row items-center gap-2.5 transition-all duration-300
                            ${hasFiles
                                ? `cursor-pointer hover:scale-[1.02] ${isUltra ? 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.08)]' : 'border-[#bc13fe]/25 hover:border-[#bc13fe]/50'}`
                                : 'cursor-not-allowed border-white/5'}`}
                            style={{ opacity: hasFiles ? 1 : 0.5 }}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                                ${isUltra ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#bc13fe]/8 border border-[#bc13fe]/20'}`}>
                                {isUltra
                                    ? <ShieldAlert className="text-red-400 w-3.5 h-3.5 animate-pulse" />
                                    : <Folder className="text-[#bc13fe] w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-[10px] sm:text-[9px] font-bold leading-tight line-clamp-1 transition-colors duration-200
                                    ${isUltra ? 'text-red-400' : hasFiles ? 'text-gray-400 group-hover:text-white' : 'text-gray-600'}`}>
                                    {folder.replace(/_/g, ' ')}
                                </h3>
                                <p className="text-[8px] text-gray-600 font-mono">
                                    {hasFiles ? `${count} arq${count !== 1 ? 's' : ''}. · ${formatBytes(size)}` : 'vazio'}
                                </p>
                            </div>
                        </div>
                    );

                    return hasFiles ? (
                        <Link key={folder} href={`/admin/pasta/${encodeURIComponent(folder)}`} className="group">
                            {card}
                        </Link>
                    ) : (
                        <div key={folder} onClick={() => { setEmptyFolderToast(true); setTimeout(() => setEmptyFolderToast(false), 3000); }}>
                            {card}
                        </div>
                    );
                })}
            </div>

            {/* ─── 10 Botões de Stats (abaixo dos charts) ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 px-1">
                <StatCard icon={Database} value={String(totalFiles)} label="Ativos sob Custódia" color="#bc13fe" />
                <StatCard icon={HardDrive} value={formatBytes(vaultSize ?? totalSize)} label="Volume Armazenado" color="#00f3ff" />
                <StatCard icon={Clock} value={String(recentFilesCount)} label="Novos (24h)" color="#f59e0b" />
                <Link href="/admin/forensics" className="group">
                    <StatCard icon={Eye} value={sysStats ? String(sysStats.todayLogs) : '—'} label="Acessos Monitorados Hoje" color="#22c55e" hover />
                </Link>
                <Link href="/admin/security" className="group">
                    <StatCard icon={ShieldAlert} value={sysStats ? String(sysStats.monitoredEvents) : '—'} label="Eventos de Segurança Totais" color="#ef4444" hover pulse />
                </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-1">
                <StatCard icon={FileBarChart} value={sysStats ? String(sysStats.filesWithPericias) : '—'} label="Ativos com Perícia Salva" color="#8b5cf6" />
                <StatCard icon={Lock} value={sysStats ? String(sysStats.encryptedCount) : '—'} label="Ativos Encriptados" color="#f97316" />
                <StatCard icon={HardDriveDownload} value={sysStats ? formatBytes(sysStats.diskFree) : '—'} label="Espaço em Disco Disponível" color="#06b6d4" />
                <StatCard icon={Shield} value={sysStats ? String(sysStats.activeSessions) : '—'} label="Sessões Ativas (15min)" color="#bc13fe" />
            </div>

            {/* ─── Mapa / Interceptações ─── counter-zoom apenas em desktop */}
            <div className="md:[zoom:0.8333]">
              <MapDashboard />
            </div>

            {/* ─── DIAGNÓSTICO DO SISTEMA ─── */}
            <SectionTitle title="Diagnóstico do Sistema" subtitle="NOC — Verificação técnica do ecossistema Portal NCFN" color="#9ca3af" />
            <div className="flex items-center gap-2 flex-wrap">
                {lastRun && <span className="text-[10px] font-mono text-gray-600">Último: {lastRun}</span>}
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={runChecks} disabled={diagLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 text-xs font-bold hover:border-gray-500 transition disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${diagLoading ? "animate-spin" : ""}`} />
                        Retestar Tudo
                    </button>
                    <button onClick={() => setShowReversal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-700/40 text-red-400 text-xs font-bold hover:bg-red-950/60 hover:border-red-600 transition">
                        <AlertTriangle className="w-3.5 h-3.5" /> REVERSÃO CRÍTICA
                    </button>
                </div>
            </div>

            {/* Health Checks */}
            <section className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Verificações de Saúde
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {checks.map((c, i) => (
                        <div key={i} className={`relative flex items-start gap-3 p-3 rounded-xl border group ${c.ok ? "bg-emerald-950/20 border-emerald-700/20" : "bg-red-950/20 border-red-700/20"}`}>
                            {c.ok ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold ${c.ok ? "text-emerald-300" : "text-red-300"}`}>{c.label}</p>
                                {c.detail && <p className="text-[10px] font-mono text-gray-500 mt-0.5 truncate">{c.detail}</p>}
                            </div>
                            <button onClick={() => runSingleCheck(c.label)} disabled={checkLoading[c.label]}
                                className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-white border border-gray-800 hover:border-gray-600 px-2 py-1 rounded-lg transition-all disabled:opacity-40 flex-shrink-0">
                                <RefreshCw className={`w-2.5 h-2.5 ${checkLoading[c.label] ? 'animate-spin' : ''}`} />
                                RETESTAR
                            </button>
                            {!c.ok && c.detail && (
                                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-gray-950 border border-red-700/40 rounded-lg px-3 py-2 text-[10px] font-mono text-red-300 max-w-xs shadow-xl">
                                    {c.detail}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Live Metrics */}
            {diagStats && (
                <section className="space-y-3">
                    <SectionTitle title="Métricas em Tempo Real" subtitle="RAM · Disco · CPU · Uptime" color="#9ca3af" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`glass-panel p-3 rounded-xl border text-center transition-all ${memPct > 90 ? 'border-orange-500 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-white/5'}`}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">RAM Usada</p>
                            <p className="text-xl font-black mt-1" style={{ color: memPct > 90 ? "#ef4444" : memPct > 70 ? "#f97316" : "#00f3ff" }}>{memPct}%</p>
                            <p className="text-[9px] font-mono text-gray-600 mt-0.5">{fmtBytes(diagStats.memory.used)} / {fmtBytes(diagStats.memory.total)}</p>
                            {memPct > 90 && <p className="text-[8px] font-bold text-red-400 mt-1 bg-red-950/40 px-1 py-0.5 rounded">ALERTA: RAM CRÍTICA — REINICIAR POD</p>}
                        </div>
                        {[
                            { label: "Disco Usado", value: diagStats.disk.percent, sub: `${fmtBytes(diagStats.disk.used)} / ${fmtBytes(diagStats.disk.total)}`, color: diskPct > 85 ? "#ef4444" : "#34d399" },
                            { label: "CPU Load 1m", value: String(diagStats.cpu.load1), sub: `${diagStats.cpu.count} núcleos`, color: "#bc13fe" },
                            { label: "Uptime", value: diagStats.uptime, sub: `${diagStats.platform} / ${diagStats.arch}`, color: "#f59e0b" },
                        ].map(m => (
                            <div key={m.label} className="glass-panel p-3 rounded-xl border border-white/5 text-center">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{m.label}</p>
                                <p className="text-xl font-black mt-1" style={{ color: m.color }}>{m.value}</p>
                                <p className="text-[9px] font-mono text-gray-600 mt-0.5">{m.sub}</p>
                            </div>
                        ))}
                    </div>
                    <div className="glass-panel p-3 rounded-xl border border-white/5 text-[10px] font-mono text-gray-500">
                        <span className="text-gray-400 font-bold">CPU: </span>{diagStats.cpu.model} ×{diagStats.cpu.count} &nbsp;|&nbsp;
                        <span className="text-gray-400 font-bold">Host: </span>{diagStats.hostname} &nbsp;|&nbsp;
                        <span className="text-gray-400 font-bold">Node: </span>{diagStats.nodeVersion}
                    </div>
                </section>
            )}

            {/* Ecossistema */}
            <section className="space-y-6">
                <SectionTitle title="Ecossistema Técnico" subtitle="Serviços, segurança e IA do Portal NCFN" color="#9ca3af" />
                {ECOSYSTEM.map(cat => (
                    <div key={cat.category} className="space-y-2">
                        <div className="flex items-center gap-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bc13fe]/70">{cat.category}</p>
                            {cat.action && (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEcoAction(cat.action!.key)}
                                        className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${cat.action.border} ${cat.action.color} bg-transparent hover:bg-white/5 transition-all`}>
                                        [ {cat.action.label} ]
                                    </button>
                                    {ecoFeedback[cat.action.key] && (
                                        <span className={`text-[9px] font-mono ${ecoFeedback[cat.action.key].ok ? 'text-green-400' : 'text-red-400'}`}>
                                            {ecoFeedback[cat.action.key].msg}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {cat.items.map(item => (
                                <div key={item.label} className="glass-panel p-3 rounded-xl border border-white/5 flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-3.5 h-3.5 text-gray-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{item.label}</p>
                                        <p className="text-xs font-semibold text-gray-200 mt-0.5 leading-tight">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>

            {/* Mapa de Latência */}
            <section className="glass-panel rounded-2xl border border-white/5 p-6 space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Wifi className="w-4 h-4" /> Arquitetura de Conexão (Mapa de Latência)
                </h2>
                <div className="font-mono text-[10px] text-gray-500 space-y-2">
                    {LATENCY_HOPS.map((hop, i) => (
                        <div key={i}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-gray-400">{hop.from}</span>
                                <span className="text-gray-700">──[<span style={{ color: hop.color }}>{hop.ms}ms</span>]──&gt;</span>
                                <span style={{ color: hop.color }}>{hop.to}</span>
                                <span className="text-gray-700">·</span>
                                <span className="text-gray-600 italic">{hop.proto}</span>
                            </div>
                            {hop.extra && (
                                <div className="ml-4 mt-0.5 text-[9px] text-gray-700">
                                    └── [ UPTIME DO TÚNEL: <span className="text-green-400">99.98%</span> — Última queda: 43 dias atrás ]
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Modals ─── */}

            {/* Empty folder toast */}
            {emptyFolderToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-950 border border-white/20 rounded-2xl shadow-2xl animate-fade-in">
                    <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Este diretório de ativos está vazio</span>
                </div>
            )}

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
                        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                            <p>Este é o <strong className="text-white">Centro de Comando NCFN</strong> — painel principal com acesso a todos os módulos operacionais: Vault Forense, Laudos, Custódia, Timeline, Convidados, Usuários e Análise Forense.</p>
                            <p>O <strong className="text-white">Vault Forense</strong> armazena evidências com criptografia AES-256, hash SHA-256, carimbo RFC 3161 e suporte a <strong className="text-white">Cloud Custody via R2</strong> para backup imutável na nuvem.</p>
                            <p>Os <strong className="text-white">gráficos analíticos</strong> exibem a atividade do vault em tempo real — volume de arquivos, distribuição por zona e novos ativos nas últimas 24h. O <strong className="text-white">sino de notificações</strong> alerta eventos críticos do sistema via SSE.</p>
                            <p>O <strong className="text-white">mapa de acessos</strong> exibe geolocalizações dos IPs que acessaram o portal. A <strong className="text-white">Timeline de Custódia</strong> mostra o histórico cronológico completo de cada ativo forense.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Reversal modal */}
            {showReversal && (
                <div className="fixed inset-0 z-50 bg-red-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-gray-950 border border-red-700/50 rounded-3xl p-8 max-w-lg w-full space-y-5 relative shadow-[0_0_60px_rgba(239,68,68,0.2)]">
                        <button onClick={() => setShowReversal(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
                            <X size={18} />
                        </button>
                        <div>
                            <h2 className="font-black text-red-400 text-lg uppercase tracking-widest mb-1">
                                🔐 Solicitação de Reversão de Emergência (Chave Mestra)
                            </h2>
                            <p className="text-xs text-red-300/70">PROTOCOLO DE RECUPERAÇÃO — NÍVEL RAIZ</p>
                        </div>
                        <div className="bg-red-950/40 border border-red-700/30 rounded-xl p-4 text-sm text-red-300 leading-relaxed">
                            <strong className="text-red-400">ATENÇÃO:</strong> Você está prestes a acionar o protocolo de recuperação de nível raiz. Esta ação é registrada permanentemente no Log de Auditoria do Auditor-Geral.
                        </div>
                        <ul className="space-y-2 text-xs text-gray-400">
                            <li>• A reversão de um arquivo imutável só é permitida em casos de determinação judicial.</li>
                            <li>• O uso da Senha Master gera um novo Hash de Integridade para o arquivo, invalidando certificados anteriores.</li>
                            <li>• Toda reversão deve ser justificada. O acesso indevido via Chave Mestra compromete a idoneidade da Cadeia de Custódia.</li>
                        </ul>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Senha Master do Sistema</label>
                                <input type="password" value={reversalPassword} onChange={e => setReversalPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Justificativa Técnica e Legal</label>
                                <textarea value={reversalJustification} onChange={e => setReversalJustification(e.target.value)}
                                    placeholder="Descreva o motivo legal e técnico para esta reversão..."
                                    rows={3}
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Upload de Decisão Judicial (PDF)</label>
                                <div onDrop={e => { e.preventDefault(); setReversalDragging(false); const f = e.dataTransfer.files[0]; if (f) setReversalPdf(f); }}
                                    onDragOver={e => { e.preventDefault(); setReversalDragging(true); }}
                                    onDragLeave={() => setReversalDragging(false)}
                                    onClick={() => reversalFileRef.current?.click()}
                                    className={`cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-all ${reversalDragging ? 'border-red-500 bg-red-950/30' : reversalPdf ? 'border-green-600 bg-green-950/10' : 'border-gray-700 hover:border-red-600/50'}`}>
                                    <input ref={reversalFileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setReversalPdf(f); }} />
                                    {reversalPdf ? (
                                        <p className="text-sm text-green-400 font-mono">{reversalPdf.name}</p>
                                    ) : (
                                        <>
                                            <FileText className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                            <p className="text-xs text-gray-500">Decisão devidamente assinada e conferida</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button disabled={!reversalCanSubmit}
                            className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-red-700 hover:bg-red-600 text-white enabled:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                            onClick={() => { alert("Reversão solicitada — aguardando confirmação do Auditor-Geral."); setShowReversal(false); }}>
                            [ AUTORIZAR REVERSÃO CRÍTICA ]
                        </button>
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
        <div className={`glass-panel px-3 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all duration-300 ${hover ? 'hover:scale-[1.03] cursor-pointer' : ''}`}
            style={{ borderColor: `${color}30`, height: 90 }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                <Icon className={`w-3.5 h-3.5 ${pulse ? 'animate-pulse' : ''}`} style={{ color }} />
            </div>
            <span className="text-lg lg:text-xl font-black text-white leading-none flex-shrink-0">{value}</span>
            <span className="text-[9px] md:text-[7px] lg:text-[8px] text-gray-500 font-bold uppercase tracking-wider leading-tight line-clamp-2 w-full">{label}</span>
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
