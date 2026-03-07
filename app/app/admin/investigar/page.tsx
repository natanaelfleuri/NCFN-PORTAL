"use client";
import { useState, useRef, useEffect } from "react";
import {
    Search,
    ArrowLeft,
    Fingerprint,
    Shield,
    Terminal,
    AlertTriangle,
    CheckCircle,
    Copy,
    Download,
    Loader2,
    Hash,
    Clock,
    User,
    Globe,
    Network,
    Zap,
} from "lucide-react";
import Link from "next/link";

type Tool = "sherlock" | "theharvester" | "nmap" | "openclaw";
type InvestigationResult = {
    id: string;
    target: string;
    tool: string;
    command: string;
    rawOutput: string;
    aiReport: string;
    sha256Hash: string;
    timestamp: string;
    durationSecs: string;
};

const TOOLS: { id: Tool; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
        id: "sherlock",
        label: "Sherlock",
        desc: "Usuário em redes sociais",
        icon: <User className="w-4 h-4" />,
        color: "border-[#bc13fe]/50 bg-[#bc13fe]/5 text-[#bc13fe]",
    },
    {
        id: "theharvester",
        label: "theHarvester",
        desc: "E-mails & domínios OSINT",
        icon: <Globe className="w-4 h-4" />,
        color: "border-[#00f3ff]/50 bg-[#00f3ff]/5 text-[#00f3ff]",
    },
    {
        id: "nmap",
        label: "Nmap",
        desc: "Reconhecimento de IP / portas",
        icon: <Network className="w-4 h-4" />,
        color: "border-yellow-500/50 bg-yellow-500/5 text-yellow-400",
    },
    {
        id: "openclaw",
        label: "OpenClaw 360º",
        desc: "Auditoria IA Profunda (Experimental)",
        icon: <Zap className="w-4 h-4" />,
        color: "border-red-500/50 bg-red-500/5 text-red-500",
    },
];

export default function InvestigarPage() {
    const [target, setTarget] = useState("");
    const [tool, setTool] = useState<Tool>("sherlock");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<InvestigationResult | null>(null);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [tab, setTab] = useState<"terminal" | "ai">("ai");
    const [elapsed, setElapsed] = useState(0);
    const [keywords, setKeywords] = useState<any[]>([]);
    const terminalRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetch('/api/admin/ia-config')
            .then(res => res.json())
            .then(data => setKeywords(data.keywords || []))
            .catch(err => console.error("Erro ao buscar keywords:", err));
    }, []);

    // Scroll terminal to bottom when output updates
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [result?.rawOutput]);

    const handleInvestigate = async () => {
        if (!target.trim()) return;
        setLoading(true);
        setResult(null);
        setError("");
        setSuccessMsg("");
        setElapsed(0);

        // Timer de elapsed
        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

        try {
            if (tool === "openclaw") {
                // OpenClaw triggers Moltbot asynchronously
                const res = await fetch("/api/admin/moltbot", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        action: "triggerScan", 
                        url: target.trim(), 
                        task: "Realizar auditoria 360º completa para fins forenses." 
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Erro ao acionar Moltbot");

                setSuccessMsg("Operação OpenClaw iniciada. O Moltbot está processando a auditoria em segundo plano. Verifique o log do Moltbot em instantes.");
            } else {
                const res = await fetch("/api/admin/investigar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ target: target.trim(), tool }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Erro desconhecido");

                setResult(data);
                setTab(data.aiReport && !data.aiReport.includes("indisponível") ? "ai" : "terminal");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const copyHash = () => {
        if (result?.sha256Hash) navigator.clipboard.writeText(result.sha256Hash);
    };

    const downloadReport = () => {
        if (!result) return;
        const blob = new Blob(
            [
                `RELATÓRIO DE MATERIALIDADE — NCFN FORENSIC AGENT\n`,
                `${"=".repeat(60)}\n\n`,
                `ALVO: ${result.target}\n`,
                `FERRAMENTA: ${result.tool}\n`,
                `TIMESTAMP: ${result.timestamp}\n`,
                `DURAÇÃO: ${result.durationSecs}s\n`,
                `SHA-256 (Cadeia de Custódia): ${result.sha256Hash}\n\n`,
                `${"=".repeat(60)}\n`,
                `COMANDO EXECUTADO:\n${result.command}\n\n`,
                `${"=".repeat(60)}\n`,
                `RELATÓRIO IA:\n${result.aiReport}\n\n`,
                `${"=".repeat(60)}\n`,
                `OUTPUT BRUTO:\n${result.rawOutput}\n`,
            ],
            { type: "text/plain" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `NCFN_Forense_${result.target}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-8 space-y-8 pb-24 max-w-6xl mx-auto px-4 lg:px-0">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 border-b border-gray-800 pb-8">
                <Link href="/admin" className="p-3 bg-gray-900 rounded-full hover:bg-white/5 border border-[#bc13fe]/30 transition">
                    <ArrowLeft className="text-[#bc13fe] w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-[#bc13fe]/10 border border-[#bc13fe]/30 shadow-[0_0_20px_rgba(188,19,254,0.15)]">
                        <Fingerprint className="w-7 h-7 text-[#bc13fe]" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#bc13fe] tracking-tighter uppercase">
                            Agente Forense
                        </h2>
                        <p className="text-gray-500 text-[11px] uppercase tracking-widest font-mono">
                            OSINT Automatizado · Cadeia de Custódia SHA-256
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Aviso Legal ── */}
            <div className="flex items-start gap-3 p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-yellow-400/80 text-xs font-mono leading-relaxed">
                    USO EXCLUSIVO — Operação autorizada. Todos os comandos são registrados com hash SHA-256 e gravados no banco de dados forense para fins de cadeia de custódia. Operador: {" "}
                    <span className="text-yellow-300 font-bold">Autorizado conforme art. 13 da Lei 12.965/2014</span>.
                </p>
            </div>

            {/* ── Alvos Monitorados (Manual Trigger) ── */}
            {keywords.filter(k => k.active).length > 0 && (
                <div className="glass-panel p-6 rounded-3xl border border-[#00f3ff]/20 bg-[#00f3ff]/5 shadow-[0_0_20px_rgba(0,243,255,0.05)]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#00f3ff]/10 border border-[#00f3ff]/30">
                                <Zap className="w-5 h-5 text-[#00f3ff]" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-[#00f3ff]">
                                    Alvos Monitorados em Tempo Real
                                </h4>
                                <p className="text-gray-500 text-[9px] uppercase tracking-wider font-mono">
                                    Novas detecções e palavras-chave ativas no sistema
                                </p>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-full">
                            <span className="text-[10px] text-[#00f3ff] font-bold animate-pulse uppercase tracking-tighter">Live Monitoring</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {keywords.filter(k => k.active).map((k) => (
                            <button
                                key={k.id}
                                onClick={() => {
                                    setTarget(k.keyword);
                                    // Auto-select tool based on category if possible
                                    if (k.category.toLowerCase().includes("rede") || k.category.toLowerCase().includes("usuario")) {
                                        setTool("sherlock");
                                    } else if (k.category.toLowerCase().includes("dominio") || k.category.toLowerCase().includes("email")) {
                                        setTool("theharvester");
                                    }
                                }}
                                className="group relative px-4 py-2 rounded-xl border border-gray-800 bg-black/40 hover:border-[#00f3ff]/50 hover:bg-[#00f3ff]/5 transition-all flex flex-col items-start gap-1"
                            >
                                <span className="text-white text-xs font-bold leading-none">{k.keyword}</span>
                                <span className="text-[8px] text-gray-600 uppercase font-bold group-hover:text-[#00f3ff]/70">{k.category}</span>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Search className="w-3 h-3 text-[#00f3ff]" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Painel de Configuração ── */}
            <div className="glass-panel p-6 lg:p-8 rounded-3xl border border-[#bc13fe]/20 shadow-[0_0_40px_rgba(188,19,254,0.05)]">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">
                    Configuração da Diligência
                </h3>

                {/* Tool Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {TOOLS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTool(t.id)}
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                                tool === t.id
                                    ? t.color + " shadow-[0_0_15px_rgba(188,19,254,0.1)]"
                                    : "border-gray-800 bg-gray-900/40 text-gray-500 hover:border-gray-600"
                            }`}
                        >
                            <div className={`p-2 rounded-lg ${tool === t.id ? "bg-current/10" : "bg-gray-800"}`}>
                                {t.icon}
                            </div>
                            <div>
                                <div className="font-bold text-sm">{t.label}</div>
                                <div className="text-[10px] opacity-60 font-mono">{t.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Target Input */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                        <input
                            type="text"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !loading && handleInvestigate()}
                            placeholder={
                                tool === "sherlock"
                                    ? "ex: joao.silva"
                                    : tool === "theharvester"
                                    ? "ex: empresa.com.br"
                                    : "ex: 192.168.1.1"
                            }
                            className="w-full bg-black/60 border border-gray-700 focus:border-[#bc13fe] rounded-2xl pl-12 pr-5 py-4 text-white font-mono text-sm outline-none transition-all placeholder:text-gray-600 focus:shadow-[0_0_20px_rgba(188,19,254,0.15)]"
                            disabled={loading}
                        />
                    </div>
                    <button
                        onClick={handleInvestigate}
                        disabled={loading || !target.trim()}
                        className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#bc13fe] hover:bg-[#bc13fe]/80 text-white shadow-[0_0_30px_rgba(188,19,254,0.3)] hover:shadow-[0_0_40px_rgba(188,19,254,0.5)]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-mono">{elapsed}s</span>
                            </>
                        ) : (
                            <>
                                <Fingerprint className="w-5 h-5" />
                                Investigar
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Loading Animation ── */}
            {loading && (
                <div className="glass-panel p-8 rounded-3xl border border-[#bc13fe]/20 flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-[#bc13fe]/20 animate-pulse" />
                        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-[#bc13fe] animate-spin" />
                        <Fingerprint className="absolute inset-0 m-auto w-8 h-8 text-[#bc13fe]" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-[#bc13fe] font-black uppercase tracking-widest text-sm animate-pulse">
                            Contêiner Kali Linux Ativo
                        </p>
                        <p className="text-gray-500 font-mono text-xs">
                            Executando <span className="text-white">{tool}</span> contra <span className="text-[#00f3ff]">{target}</span>
                        </p>
                        <p className="text-gray-600 font-mono text-[10px]">
                            Tempo decorrido: {elapsed}s | Timeout: 120s
                        </p>
                    </div>
                    {/* Fake terminal scan line */}
                    <div className="w-full max-w-md bg-black/80 rounded-xl border border-gray-800 p-4 font-mono text-[10px] text-green-400 space-y-1">
                        <div className="animate-pulse">$ docker run --rm kalilinux/kali-rolling ...</div>
                        <div className="text-gray-600">Pulling container layers...</div>
                        <div className="text-gray-600">Installing tools...</div>
                        <div className="text-[#bc13fe] animate-pulse">⠸ Scanning target: {target}</div>
                    </div>
                </div>
            )}

            {/* ── Error ── */}
            {error && !loading && (
                <div className="flex items-start gap-3 p-5 bg-red-950/20 border border-red-500/30 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-400 font-bold text-sm">Falha na Diligência</p>
                        <p className="text-red-400/70 text-xs font-mono mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* ── Success ── */}
            {successMsg && !loading && (
                <div className="flex items-start gap-3 p-5 bg-green-950/20 border border-green-500/30 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-green-400 font-bold text-sm">Operação Iniciada</p>
                        <p className="text-green-400/70 text-xs font-mono mt-1">{successMsg}</p>
                    </div>
                </div>
            )}

            {/* ── Resultado ── */}
            {result && !loading && (
                <div className="space-y-6">

                    {/* ─ Cadeia de Custódia ─ */}
                    <div className="glass-panel p-5 rounded-2xl border border-green-500/30 bg-green-950/10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                                <div>
                                    <p className="text-green-400 font-black text-sm uppercase tracking-wide">
                                        ✓ Cadeia de Custódia Registrada
                                    </p>
                                    <p className="text-gray-500 text-[10px] font-mono mt-0.5">
                                        ID: {result.id} · Duração: {result.durationSecs}s
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={copyHash} title="Copiar hash" className="p-2 rounded-lg bg-gray-900 hover:bg-white/5 border border-gray-700 transition">
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                                <button onClick={downloadReport} title="Baixar relatório" className="p-2 rounded-lg bg-gray-900 hover:bg-white/5 border border-gray-700 transition">
                                    <Download className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-black/40 rounded-xl p-3 font-mono">
                                <div className="flex items-center gap-2 text-gray-500 text-[9px] uppercase tracking-widest mb-1">
                                    <Shield className="w-3 h-3" /> Ferramenta
                                </div>
                                <span className="text-[#bc13fe] text-xs font-bold">{result.tool.toUpperCase()}</span>
                            </div>
                            <div className="bg-black/40 rounded-xl p-3 font-mono">
                                <div className="flex items-center gap-2 text-gray-500 text-[9px] uppercase tracking-widest mb-1">
                                    <Clock className="w-3 h-3" /> Timestamp
                                </div>
                                <span className="text-white text-[10px]">
                                    {new Date(result.timestamp).toLocaleString("pt-BR")}
                                </span>
                            </div>
                            <div className="bg-black/40 rounded-xl p-3 font-mono">
                                <div className="flex items-center gap-2 text-gray-500 text-[9px] uppercase tracking-widest mb-1">
                                    <Hash className="w-3 h-3" /> SHA-256
                                </div>
                                <span className="text-[#00f3ff] text-[8px] break-all">{result.sha256Hash}</span>
                            </div>
                        </div>
                    </div>

                    {/* ─ Abas: Relatório IA / Terminal ─ */}
                    <div className="glass-panel rounded-3xl border border-gray-800 overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex items-center gap-0 border-b border-gray-800 bg-black/40">
                            <button
                                onClick={() => setTab("ai")}
                                className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                                    tab === "ai"
                                        ? "border-[#bc13fe] text-[#bc13fe] bg-[#bc13fe]/5"
                                        : "border-transparent text-gray-500 hover:text-white"
                                }`}
                            >
                                <Fingerprint className="w-4 h-4" />
                                Relatório IA
                            </button>
                            <button
                                onClick={() => setTab("terminal")}
                                className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                                    tab === "terminal"
                                        ? "border-[#00f3ff] text-[#00f3ff] bg-[#00f3ff]/5"
                                        : "border-transparent text-gray-500 hover:text-white"
                                }`}
                            >
                                <Terminal className="w-4 h-4" />
                                Output Bruto
                            </button>
                        </div>

                        {/* Relatório IA */}
                        {tab === "ai" && (
                            <div className="p-6 lg:p-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-2 h-2 rounded-full bg-[#bc13fe] animate-pulse" />
                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                        Análise gerada por IA · Pericial Forense Digital
                                    </span>
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    {result.aiReport.split("\n").map((line, i) => {
                                        if (line.startsWith("## ")) {
                                            return (
                                                <h4 key={i} className="text-[#bc13fe] font-black uppercase tracking-wider text-sm mt-6 mb-3 flex items-center gap-2">
                                                    <span className="w-1 h-4 bg-[#bc13fe] rounded-full inline-block" />
                                                    {line.replace("## ", "")}
                                                </h4>
                                            );
                                        }
                                        if (line.startsWith("# ")) {
                                            return (
                                                <h3 key={i} className="text-white font-black text-lg mb-4">
                                                    {line.replace("# ", "")}
                                                </h3>
                                            );
                                        }
                                        if (line.trim() === "") return <br key={i} />;
                                        return (
                                            <p key={i} className="text-gray-300 text-sm leading-relaxed font-mono">
                                                {line}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Terminal Output */}
                        {tab === "terminal" && (
                            <div
                                ref={terminalRef}
                                className="bg-black/90 p-6 font-mono text-[11px] text-green-400 leading-relaxed max-h-[500px] overflow-y-auto"
                            >
                                <div className="text-gray-600 mb-3 text-[10px]">
                                    {/* Command prompt */}
                                    <span className="text-[#bc13fe]">root@ncfn-forensics</span>
                                    <span className="text-white">:</span>
                                    <span className="text-[#00f3ff]">~</span>
                                    <span className="text-white">$ </span>
                                    <span className="text-yellow-400 break-all">{result.command}</span>
                                </div>
                                <hr className="border-gray-800 mb-3" />
                                <pre className="whitespace-pre-wrap break-all text-green-400/90">
                                    {result.rawOutput || "Nenhum output capturado."}
                                </pre>
                                <div className="mt-4 pt-3 border-t border-gray-800 text-gray-600 text-[9px]">
                                    Process completed · SHA-256: {result.sha256Hash.slice(0, 32)}...
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
