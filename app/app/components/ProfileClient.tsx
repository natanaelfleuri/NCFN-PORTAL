"use client";

import { useRef, useState, useEffect } from 'react';
import {
    Shield, Zap, HardDrive, Award, Fingerprint, Calendar, Mail,
    FileCheck, User, Eye, EyeOff, CheckCircle2, XCircle,
    Terminal, Loader2, PenTool, Trash2, Link2, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import TotpSetup from '@/app/components/TotpSetup';

interface DbUser {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
    planType: string;
    fullName: string | null;
    documentId: string | null;
    certificationAuth: string | null;
    totalBytesUsed: number;
    uploadedFilesCount: number;
    lastSeenAt: string | null;
    totpEnabled: boolean;
    deadManSwitchDays: number | null;
    deadManTriggerAction: string | null;
    aiConfig: { preferredModel: string; geminiKey?: string | null; openaiKey?: string | null } | null;
}

const AI_MODELS = [
    { value: 'perito-sansao-mistral', label: 'Perito Sansão (Ollama — mistral)' },
    { value: 'perito-sansao-llama3', label: 'Perito Sansão (Ollama — llama3)' },
    { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Anthropic)' },
    { value: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro (Google)' },
];

const TERMINAL_LINES = [
    '>_ Conexão estabelecida com Vault NCFN...',
    '>_ Sincronizando biometria...',
    '>_ AES-256-CBC: chaves carregadas...',
    '>_ Zero-Trust middleware: ATIVO',
    '>_ Heartbeat: OK — latência 4ms',
    '>_ SHA-256 integrity check: PASS',
    '>_ Sessão JWT validada...',
    '>_ Cloudflare tunnel: VERDE',
    '>_ Dead Man Switch: monitorando...',
    '>_ Vault NCFN: 13 pastas indexadas',
];

export default function ProfileClient({ dbUser }: { dbUser: DbUser }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
    const [signatureSaved, setSignatureSaved] = useState(false);
    const [savingSignature, setSavingSignature] = useState(false);

    const [selectedModel, setSelectedModel] = useState(dbUser.aiConfig?.preferredModel || 'perito-sansao-mistral');
    const [apiToken, setApiToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
    const [certLinked, setCertLinked] = useState(false);

    const [terminalLines, setTerminalLines] = useState<string[]>([TERMINAL_LINES[0]]);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Calculate ICF score
    const storageUsedPercent = Math.min(100, (dbUser.totalBytesUsed / (1024 * 1024 * 1024 * 10)) * 100);
    const icfScore = Math.min(100,
        (dbUser.totpEnabled ? 25 : 0) +
        (certLinked || dbUser.documentId ? 25 : 0) +
        (signatureSaved ? 15 : 0) +
        (tokenStatus === 'valid' ? 15 : 0) +
        (storageUsedPercent < 90 ? 20 : 0)
    );

    // Terminal log simulation
    useEffect(() => {
        let idx = 1;
        const interval = setInterval(() => {
            setTerminalLines(prev => {
                const next = [...prev, TERMINAL_LINES[idx % TERMINAL_LINES.length]];
                return next.slice(-6); // keep last 6
            });
            idx++;
        }, 2800);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalLines]);

    // Token validation debounce
    useEffect(() => {
        if (!apiToken || apiToken.length < 10) { setTokenStatus('idle'); return; }
        setTokenStatus('checking');
        const t = setTimeout(async () => {
            try {
                const res = await fetch('/api/admin/validate-ai-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: selectedModel, token: apiToken }),
                });
                setTokenStatus(res.ok ? 'valid' : 'invalid');
            } catch {
                setTokenStatus('invalid');
            }
        }, 900);
        return () => clearTimeout(t);
    }, [apiToken, selectedModel]);

    // Signature canvas events
    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
        setLastPos(getPos(e, canvas));
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !lastPos) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        setLastPos(pos);
    };

    const stopDraw = () => { setIsDrawing(false); setLastPos(null); };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureSaved(false);
    };

    const saveSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const base64 = canvas.toDataURL('image/png');
        setSavingSignature(true);
        try {
            await fetch('/api/profile/save-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature: base64 }),
            });
            setSignatureSaved(true);
        } catch { /* noop */ } finally {
            setSavingSignature(false);
        }
    };

    const icfColor = icfScore >= 80 ? 'text-green-400' : icfScore >= 50 ? 'text-yellow-400' : 'text-red-400';
    const icfStroke = icfScore >= 80 ? '#22c55e' : icfScore >= 50 ? '#eab308' : '#ef4444';
    const circumference = 2 * Math.PI * 40;
    const dashOffset = circumference - (icfScore / 100) * circumference;

    const storageColor = storageUsedPercent > 90 ? 'from-red-500 to-orange-500' : 'from-[#00f3ff] via-[#bc13fe] to-[#00f3ff]';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-800 pb-8">
                <div className="flex items-center gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#00f3ff] to-[#bc13fe] p-[2px] rounded-2xl">
                            <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center overflow-hidden">
                                {dbUser.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={dbUser.image} alt="Avatar" className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <User className="w-12 h-12 text-[#00f3ff]" />
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-black border border-gray-800 p-1.5 rounded-lg">
                            <Zap className="w-4 h-4 text-yellow-400" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                                {dbUser.name || 'OPERADOR_NCFN'}
                            </h1>
                            <span className="px-2 py-0.5 bg-[#bc13fe]/20 text-[#bc13fe] text-[10px] font-black rounded uppercase border border-[#bc13fe]/30">
                                {dbUser.role}
                            </span>
                        </div>
                        <p className="text-gray-500 font-mono text-xs mt-1 uppercase tracking-widest flex items-center gap-2">
                            <Mail className="w-3 h-3 text-[#00f3ff]" /> {dbUser.email}
                        </p>
                        <p className="text-gray-600 font-mono text-[10px] mt-1 uppercase tracking-tighter">
                            UUID: {dbUser.id}
                        </p>
                    </div>
                </div>

                {/* ICF Score Widget */}
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center gap-1">
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
                            <circle
                                cx="50" cy="50" r="40" fill="none"
                                stroke={icfStroke}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                transform="rotate(-90 50 50)"
                                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                            />
                            <text x="50" y="46" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="monospace">{icfScore}</text>
                            <text x="50" y="60" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="monospace">ICF</text>
                        </svg>
                        {icfScore === 100 ? (
                            <span className="text-[10px] font-black text-green-400 bg-green-900/20 border border-green-700/30 px-2 py-0.5 rounded-full uppercase tracking-widest text-center">
                                MAXIMUM CLEARANCE
                            </span>
                        ) : (
                            <span className={`text-[10px] font-mono ${icfColor}`}>Índice de Confiabilidade</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Link href="/upgrade" className="px-4 py-2 border border-[#bc13fe] text-[#bc13fe] text-xs font-black uppercase hover:bg-[#bc13fe] hover:text-white transition-all text-center">
                            ACREDITAÇÃO PRO
                        </Link>
                        <button className="px-4 py-2 bg-white text-black text-xs font-black uppercase hover:invert transition-all">
                            EDITAR PERFIL
                        </button>
                    </div>
                </div>
            </div>

            {/* ICF Breakdown */}
            <div className="glass-panel border border-white/10 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Índice de Confiabilidade Forense (ICF) — Critérios</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: '2FA Ativo', pts: 25, met: dbUser.totpEnabled },
                        { label: 'Certificado', pts: 25, met: certLinked || !!dbUser.documentId },
                        { label: 'Assinatura Canvas', pts: 15, met: signatureSaved },
                        { label: 'IA Validada', pts: 15, met: tokenStatus === 'valid' },
                        { label: 'Storage Saudável', pts: 20, met: storageUsedPercent < 90 },
                    ].map(item => (
                        <div key={item.label} className={`rounded-xl p-3 border text-center transition-all ${item.met ? 'border-green-700/40 bg-green-900/10' : 'border-gray-800 bg-gray-900/30'}`}>
                            <p className={`text-lg font-black ${item.met ? 'text-green-400' : 'text-gray-600'}`}>+{item.pts}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
                            {item.met
                                ? <CheckCircle2 size={12} className="text-green-400 mx-auto mt-1" />
                                : <XCircle size={12} className="text-gray-700 mx-auto mt-1" />
                            }
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-[#00f3ff]/50 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <Award className="w-12 h-12 text-[#00f3ff]" />
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">PLANO ATUAL</p>
                    <p className="text-2xl font-black text-white italic uppercase tracking-tighter">{dbUser.planType}</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-[#bc13fe]/50 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <HardDrive className="w-12 h-12 text-[#bc13fe]" />
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">ATIVOS CUSTODIADOS</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">{dbUser.uploadedFilesCount} <span className="text-xs text-gray-500">OBJETOS</span></p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-yellow-500/50 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <Fingerprint className="w-12 h-12 text-yellow-500" />
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">IDENTIDADE PERICIAL</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">{dbUser.documentId ? 'VERIFICADO' : 'PENDENTE'}</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-[#00f3ff]/50 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <Calendar className="w-12 h-12 text-[#00f3ff]" />
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">ÚLTIMO ACESSO</p>
                    <p className="text-xl font-black text-white italic tracking-tighter">
                        {dbUser.lastSeenAt
                            ? new Date(dbUser.lastSeenAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                            : 'PRIMEIRO ACESSO'}
                    </p>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Security Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-[#bc13fe]" />
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Credenciais de Operação</h2>
                    </div>
                    <div className="bg-black border border-gray-800 rounded-xl divide-y divide-gray-800">
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Nome Certificado</p>
                                <p className="text-sm font-bold text-white uppercase italic">{dbUser.fullName || 'Não Informado'}</p>
                            </div>
                            <Award className="w-5 h-5 text-gray-700" />
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Identificação (DOC)</p>
                                <p className="text-sm font-mono text-white">
                                    {dbUser.documentId ? dbUser.documentId.replace(/.(?=.{3})/g, '*') : 'NÃO VINCULADO'}
                                </p>
                            </div>
                            <FileCheck className="w-5 h-5 text-gray-700" />
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Protocolo Dead Man Switch</p>
                                <p className="text-sm font-bold text-red-500 uppercase italic">
                                    {dbUser.deadManSwitchDays ? `${dbUser.deadManSwitchDays} DIAS / ${dbUser.deadManTriggerAction}` : 'DESATIVADO'}
                                </p>
                            </div>
                            <Link href="/admin/security" className="px-3 py-1 text-[10px] font-bold uppercase bg-red-900/50 border border-red-500 text-red-400 hover:bg-red-800/50 rounded-lg transition-all">
                                Config
                            </Link>
                        </div>
                    </div>
                    <TotpSetup totpEnabled={dbUser.totpEnabled} />
                </div>

                {/* AI Config */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-[#00f3ff]" />
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Parâmetros de Sistema</h2>
                    </div>
                    <div className="bg-black border border-gray-800 rounded-xl p-5 space-y-4">
                        <div>
                            <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-2">Motor de IA Padrão</p>
                            <select
                                value={selectedModel}
                                onChange={e => setSelectedModel(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#00f3ff]/50 focus:border-transparent outline-none"
                            >
                                {AI_MODELS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-2">Chave API (Token)</p>
                            <div className="relative">
                                <input
                                    type={showToken ? 'text' : 'password'}
                                    value={apiToken}
                                    onChange={e => setApiToken(e.target.value)}
                                    placeholder="sk-... ou AIza..."
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2.5 pr-20 text-sm font-mono focus:ring-2 focus:ring-[#00f3ff]/50 focus:border-transparent outline-none"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {/* LED */}
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                        tokenStatus === 'valid' ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' :
                                        tokenStatus === 'invalid' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' :
                                        tokenStatus === 'checking' ? 'bg-yellow-500 animate-pulse' :
                                        'bg-gray-700'
                                    }`} />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(v => !v)}
                                        className="text-gray-500 hover:text-white"
                                    >
                                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-1 font-mono">
                                {tokenStatus === 'valid' && '● Conexão Estável'}
                                {tokenStatus === 'invalid' && '● Falha de Autenticação'}
                                {tokenStatus === 'checking' && '● Validando...'}
                                {tokenStatus === 'idle' && '● Aguardando token...'}
                            </p>
                        </div>
                    </div>

                    {/* Certificate Linkage */}
                    <div className="bg-black border border-gray-800 rounded-xl p-5 space-y-3">
                        <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Assinatura Digital (e-CPF / P7S)</p>
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${certLinked ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-gray-700'}`} />
                            <span className={`text-sm font-bold uppercase ${certLinked ? 'text-green-400' : 'text-gray-500'}`}>
                                {certLinked ? 'CERTIFICADO VINCULADO — VÁLIDO' : 'NÃO VINCULADO'}
                            </span>
                        </div>
                        <button
                            onClick={() => setCertLinked(true)}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#00f3ff]/30 text-[#00f3ff] hover:bg-[#00f3ff]/10 rounded-xl transition-all"
                        >
                            <Link2 size={12} /> Vincular Certificado (e-CPF / P7S)
                        </button>
                    </div>
                </div>
            </div>

            {/* Signature Canvas */}
            <div className="glass-panel border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PenTool className="w-5 h-5 text-[#00f3ff]" />
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Assinatura Manuscrita (Canvas)</h2>
                    </div>
                    {signatureSaved && (
                        <span className="flex items-center gap-1.5 text-xs text-green-400 font-bold">
                            <CheckCircle2 size={12} /> Salva
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500">Assine com o mouse ou mesa digitalizadora. A assinatura é convertida em PNG e vinculada ao seu perfil pericial.</p>
                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        width={700}
                        height={160}
                        className="w-full h-40 bg-black rounded-xl border border-[#00f3ff]/20 cursor-crosshair touch-none"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                    />
                    {!isDrawing && (
                        <p className="absolute inset-0 flex items-center justify-center text-gray-700 text-sm font-mono pointer-events-none select-none">
                            × Assinar aqui ×
                        </p>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={clearCanvas}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 rounded-xl transition-all"
                    >
                        <Trash2 size={12} /> Limpar
                    </button>
                    <button
                        onClick={saveSignature}
                        disabled={savingSignature}
                        className="flex items-center gap-2 px-6 py-2 text-xs font-bold uppercase tracking-widest bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/30 rounded-xl transition-all disabled:opacity-40"
                    >
                        {savingSignature ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Salvar Assinatura
                    </button>
                </div>
            </div>

            {/* Storage */}
            <div className="bg-gradient-to-r from-gray-900/50 to-black border border-gray-800 p-8 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Volume de Custódia Forense</h3>
                        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Alocação cifrada AES-256 · Vault NCFN</p>
                    </div>
                    <div className="text-right">
                        <p className={`text-2xl font-black italic ${storageUsedPercent > 90 ? 'text-red-400' : 'text-[#00f3ff]'}`}>{storageUsedPercent.toFixed(1)}%</p>
                        <p className="text-[10px] text-gray-600 uppercase">utilizado</p>
                    </div>
                </div>
                <div className="w-full h-4 bg-gray-800 rounded-full border border-gray-700 overflow-hidden p-[2px]">
                    <div
                        className={`h-full bg-gradient-to-r ${storageColor} rounded-full shadow-[0_0_15px_#bc13fe77] transition-all duration-1000`}
                        style={{ width: `${storageUsedPercent}%`, backgroundSize: '200% 100%' }}
                    />
                </div>
                {storageUsedPercent > 90 && (
                    <p className="text-xs text-red-400 font-bold mt-2 flex items-center gap-1">
                        <AlertTriangle size={12} /> Storage acima de 90% — purge recomendado
                    </p>
                )}
                <div className="flex justify-between mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    <span>0B · VAULT NCFN</span>
                    <span>LIMITE: 10 GB · AES-256</span>
                </div>
            </div>

            {/* Terminal Log Footer */}
            <div className="bg-black border border-green-900/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                    <Terminal size={12} className="text-green-500" />
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Terminal NCFN — Logs em Tempo Real</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div ref={terminalRef} className="space-y-1 max-h-32 overflow-hidden">
                    {terminalLines.map((line, i) => (
                        <p key={i} className="text-xs font-mono text-green-400/80 transition-all">{line}</p>
                    ))}
                </div>
            </div>
        </div>
    );
}
