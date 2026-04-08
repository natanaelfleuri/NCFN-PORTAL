"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    ShieldCheck, UploadCloud, Copy, Fingerprint, Info, X,
    Database, EyeOff, AlertTriangle, FileSearch, CheckCircle,
    AlertCircle, Download, Hash, Search, Binary, FileCheck2,
    Loader2, BookOpen, CheckCircle2, Shield, Lock,
} from 'lucide-react';

type AuditMode = 'CUSTODY' | 'THIRD_PARTY';
type Verdict = 'MATCH' | 'MISMATCH' | null;

/* ── Client-side SHA-256 via Web Crypto API ── */
async function computeSha256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function OnlineAuditor() {
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<AuditMode>('CUSTODY');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedHash, setGeneratedHash] = useState<string | null>(null);
    const [expectedHash, setExpectedHash] = useState("");
    const [verdict, setVerdict] = useState<Verdict>(null);
    const [logId, setLogId] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hash-based search (arquivo custodiado no NCFN)
    const [hashSearchLoading, setHashSearchLoading] = useState(false);
    const [hashSearchResult, setHashSearchResult] = useState<any>(null);

    // Busca direta por hash (sem upload) — pré-preenchido via URL ?q=
    const [directHash, setDirectHash] = useState('');
    const [directHashLoading, setDirectHashLoading] = useState(false);
    const [directHashResult, setDirectHashResult] = useState<any>(null);

    // Doc ID lookup
    const [docIdValue, setDocIdValue] = useState('');
    const [docIdLoading, setDocIdLoading] = useState(false);
    const [docIdResult, setDocIdResult] = useState<any>(null);

    // Hex header lookup
    const [hexValue, setHexValue] = useState('');
    const [hexLoading, setHexLoading] = useState(false);
    const [hexResult, setHexResult] = useState<any>(null);

    // Lê parâmetros de URL e pré-preenche campos — links vindos do PDF
    useEffect(() => {
        const q = searchParams.get('q');
        const hex = searchParams.get('hex');
        if (q) {
            setDirectHash(q);
            // Auto-buscar
            setTimeout(() => searchDirectHash(q), 300);
        }
        if (hex) {
            setHexValue(hex);
            // Auto-buscar hex
            setTimeout(() => lookupHexDirect(hex), 300);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const processFile = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setGeneratedHash(null);
        setVerdict(null);
        setLogId(null);
        setReportData(null);
        setHashSearchResult(null);
        setLoading(true);
        try {
            const hash = await computeSha256(selectedFile);
            setGeneratedHash(hash);
        } catch (e) {
            console.error('Hash error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) processFile(f);
    };

    const checkIntegrity = async () => {
        if (!generatedHash || !expectedHash.trim()) return;
        const isMatch = generatedHash.toLowerCase() === expectedHash.trim().toLowerCase();
        setVerdict(isMatch ? 'MATCH' : 'MISMATCH');

        if (mode === 'CUSTODY') {
            try {
                const res = await fetch('/api/audit/verify-custody', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ calculatedHash: generatedHash, referenceHash: expectedHash.trim() }),
                });
                const data = await res.json();
                if (data.logId) setLogId(data.logId);
            } catch (e) {
                console.error('Audit log error:', e);
            }
        }
    };

    // Busca direta por hash no sistema NCFN (sem upload de arquivo)
    const searchDirectHash = async (hashOverride?: string) => {
        const h = (hashOverride ?? directHash).trim();
        if (!h) return;
        setDirectHashLoading(true);
        setDirectHashResult(null);
        try {
            const res = await fetch('/api/audit/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'hash', value: h }),
            });
            const data = await res.json();
            setDirectHashResult(data);
        } catch {
            setDirectHashResult({ found: false, message: 'Erro na consulta ao sistema.' });
        } finally {
            setDirectHashLoading(false);
        }
    };

    const lookupHexDirect = async (hexOverride?: string) => {
        const v = (hexOverride ?? hexValue).trim();
        if (!v) return;
        setHexLoading(true);
        setHexResult(null);
        try {
            const res = await fetch('/api/audit/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'hex', value: v }),
            });
            const data = await res.json();
            setHexResult(data);
        } catch {
            setHexResult({ found: false, message: 'Erro na consulta.' });
        } finally {
            setHexLoading(false);
        }
    };

    const searchByHash = async () => {
        if (!generatedHash) return;
        setHashSearchLoading(true);
        setHashSearchResult(null);
        try {
            const res = await fetch('/api/audit/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'hash', value: generatedHash }),
            });
            const data = await res.json();
            setHashSearchResult(data);
        } catch {
            setHashSearchResult({ found: false, message: 'Erro na consulta ao sistema.' });
        } finally {
            setHashSearchLoading(false);
        }
    };

    const generateReport = async () => {
        if (!logId) return;
        try {
            const res = await fetch('/api/audit/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logId }),
            });
            const data = await res.json();
            if (data.report) setReportData(data.report);
        } catch (e) {
            console.error('Report error:', e);
        }
    };

    const lookupDocId = async () => {
        if (!docIdValue.trim()) return;
        setDocIdLoading(true);
        setDocIdResult(null);
        try {
            const res = await fetch('/api/audit/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'docid', value: docIdValue.trim() }),
            });
            const data = await res.json();
            setDocIdResult(data);
        } catch {
            setDocIdResult({ found: false, message: 'Erro na consulta.' });
        } finally {
            setDocIdLoading(false);
        }
    };

    const lookupHex = () => lookupHexDirect();

    const copyHash = () => {
        if (!generatedHash) return;
        navigator.clipboard.writeText(generatedHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setFile(null);
        setGeneratedHash(null);
        setExpectedHash("");
        setVerdict(null);
        setLogId(null);
        setReportData(null);
        setHashSearchResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const switchMode = (m: AuditMode) => {
        setMode(m);
        reset();
    };

    return (
        <div className="max-w-4xl mx-auto mt-8 space-y-8">
            {/* Title */}
            <div className="text-center space-y-4">
                <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#bc13fe]">
                    AUDITORIA DE INTEGRIDADE FORENSE
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-sm">
                    Verifique a autenticidade de arquivos custodiados no NCFN — ou carregue uma evidência digital para análise forense.
                </p>
            </div>

            {/* ── SEÇÃO PRIMÁRIA: Verificar por Hash no NCFN ── */}
            <div className="rounded-2xl border border-cyan-500/30 bg-black/60 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 flex-shrink-0">
                        <Shield className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-cyan-300 uppercase tracking-widest">Arquivos Custodiados no NCFN</h3>
                        <p className="text-[11px] text-gray-500 font-mono">Insira o código hash SHA-256 para verificar a custódia no sistema</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={directHash}
                        onChange={e => setDirectHash(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchDirectHash()}
                        placeholder="Cole aqui o código SHA-256 do arquivo..."
                        className="flex-1 bg-black/60 border border-cyan-700/40 rounded-xl px-4 py-3 text-cyan-100 font-mono text-xs placeholder-gray-700 focus:outline-none focus:border-cyan-500/60 transition"
                    />
                    <button
                        onClick={() => searchDirectHash()}
                        disabled={directHashLoading || !directHash.trim()}
                        className="px-5 py-3 bg-cyan-900/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 rounded-xl font-bold text-xs transition disabled:opacity-40 flex items-center gap-2"
                    >
                        {directHashLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {directHashLoading ? 'Buscando...' : 'Verificar'}
                    </button>
                </div>

                {/* Resultado da busca direta */}
                {directHashResult && (
                    <div className={`rounded-xl p-4 border ${directHashResult.found ? 'bg-green-950/30 border-green-500/30' : 'bg-red-950/20 border-red-500/20'}`}>
                        {directHashResult.found ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    <span className="text-green-300 font-black text-sm uppercase tracking-widest">ARQUIVO LOCALIZADO NO SISTEMA</span>
                                </div>
                                {directHashResult.file && (
                                    <div className="pl-6 space-y-1 font-mono text-xs text-gray-400">
                                        {directHashResult.file.filename && <p>Arquivo: <span className="text-white">{directHashResult.file.filename}</span></p>}
                                        {directHashResult.file.folder && <p>Pasta: <span className="text-cyan-400">{directHashResult.file.folder}</span></p>}
                                        {directHashResult.file.date && <p>Custodiado em: <span className="text-gray-300">{new Date(directHashResult.file.date).toLocaleString('pt-BR')}</span></p>}
                                        {directHashResult.file.operator && <p>Operador: <span className="text-gray-300">{directHashResult.file.operator}</span></p>}
                                    </div>
                                )}
                                {directHashResult.message && <p className="text-green-400/70 text-xs font-mono pl-6">{directHashResult.message}</p>}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    <span className="text-red-300 font-black text-sm uppercase tracking-widest">Arquivo não encontrado no sistema</span>
                                </div>
                                <p className="text-gray-500 text-xs font-mono pl-6">{directHashResult.message || 'O hash não corresponde a nenhum arquivo custodiado no NCFN.'}</p>
                                <div className="pl-6">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-600/40 text-amber-300 rounded-xl text-xs font-bold transition"
                                    >
                                        <UploadCloud className="w-4 h-4" />
                                        Carregar Evidência Digital para Análise
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mode Selector */}
            <div className="flex rounded-xl border border-slate-700 overflow-hidden">
                <button
                    onClick={() => switchMode('CUSTODY')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold uppercase tracking-wider transition-all ${
                        mode === 'CUSTODY'
                            ? 'bg-cyan-900/50 text-cyan-300 border-r border-cyan-700/50'
                            : 'bg-slate-900/30 text-slate-500 hover:text-slate-300 border-r border-slate-700'
                    }`}
                >
                    <Database className="w-4 h-4" />
                    Arquivo Custodiado no NCFN
                </button>
                <button
                    onClick={() => switchMode('THIRD_PARTY')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold uppercase tracking-wider transition-all ${
                        mode === 'THIRD_PARTY'
                            ? 'bg-slate-700/50 text-slate-300'
                            : 'bg-slate-900/30 text-slate-500 hover:text-slate-300'
                    }`}
                >
                    <EyeOff className="w-4 h-4" />
                    Arquivo de Terceiros Não Custodiado
                </button>
            </div>

            {/* Mode B warning */}
            {mode === 'THIRD_PARTY' && (
                <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-600/40 rounded-xl p-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-yellow-200/80 text-sm leading-relaxed">
                        <strong className="text-yellow-300">OBSERVAÇÃO:</strong> Arquivos de terceiros não custodiados pelo NCFN não são certificados pelo sistema, procedendo apenas com a conferência matemática do HASH disponibilizado por terceiros.
                    </p>
                </div>
            )}

            {/* Drop Zone */}
            <div
                className={`relative w-full p-12 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] overflow-hidden ${
                    isDragging
                        ? 'border-[#00f3ff] bg-[#00f3ff]/10 scale-105'
                        : file
                            ? 'border-[#bc13fe]/30 bg-gray-900/50'
                            : 'border-gray-700 hover:border-gray-500 bg-gray-950 hover:bg-gray-900'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <input type="file" ref={fileInputRef} onChange={handleFileInput} className="hidden" />

                {!file ? (
                    <>
                        <div className="w-24 h-24 mb-6 rounded-full bg-gray-800/80 flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                            <ShieldCheck className="w-12 h-12 text-[#00f3ff]" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Submeter Objeto Pericial</h3>
                        <p className="text-gray-500 mb-2 text-sm">Arraste o arquivo para calcular sua assinatura SHA-256.</p>
                        <p className="text-[10px] text-gray-700 font-mono mb-6 uppercase tracking-widest">
                            {mode === 'CUSTODY'
                                ? 'Hash calculado localmente — apenas a assinatura é transmitida ao servidor'
                                : '100% Client-Side — zero transmissão de rede'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 transition flex items-center gap-3"
                            >
                                <UploadCloud className="w-5 h-5" /> Carregar Evidência Digital
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="w-full relative z-10 flex flex-col items-center">
                        <button onClick={reset} className="absolute -top-6 -right-6 p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full transition border border-gray-700">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-4 mb-8 bg-black/40 px-6 py-4 rounded-full border border-gray-800 w-full max-w-2xl">
                            <div className="p-3 bg-[#bc13fe]/20 text-[#bc13fe] rounded-full shrink-0">
                                <Fingerprint className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col truncate w-full">
                                <span className="text-white font-bold truncate text-lg">{file.name}</span>
                                <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 border-4 border-t-[#00f3ff] border-gray-800 rounded-full animate-spin mx-auto" />
                                <p className="text-[#00f3ff] font-bold animate-pulse">Computando digest SHA-256 localmente...</p>
                            </div>
                        ) : generatedHash ? (
                            <div className="w-full max-w-2xl space-y-6">
                                <div className="bg-black/80 border border-gray-800 p-6 rounded-2xl relative group">
                                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">Digest SHA-256 · Assinatura Forense:</p>
                                    <p className="font-mono text-lg text-[#00f3ff] break-all tracking-wide">{generatedHash}</p>
                                    <button
                                        onClick={copyHash}
                                        className="absolute top-4 right-4 p-2 bg-gray-800 text-white rounded-lg transition hover:bg-[#bc13fe]"
                                    >
                                        {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* BUSCAR ARQUIVO PELO CÓDIGO HASH */}
                                {mode === 'CUSTODY' && (
                                    <div className="space-y-3">
                                        <button
                                            onClick={searchByHash}
                                            disabled={hashSearchLoading}
                                            className="w-full py-3.5 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 border border-[#00f3ff]/30 text-[#00f3ff] font-black text-sm uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.07)] disabled:opacity-50"
                                        >
                                            {hashSearchLoading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Consultando Registro de Custódia...</>
                                            ) : (
                                                <><Search className="w-4 h-4" /> Buscar Arquivo pelo Código Hash</>
                                            )}
                                        </button>

                                        {hashSearchResult && (
                                            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                                                hashSearchResult.found
                                                    ? 'bg-green-900/20 border-green-500/50'
                                                    : 'bg-red-900/20 border-red-500/40'
                                            }`}>
                                                {hashSearchResult.found ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                                )}
                                                <div className="space-y-1 flex-1">
                                                    <p className={`font-black text-sm ${hashSearchResult.found ? 'text-green-300' : 'text-red-300'}`}>
                                                        {hashSearchResult.message}
                                                    </p>
                                                    {hashSearchResult.filename && (
                                                        <p className="text-xs font-mono text-gray-300">
                                                            Arquivo: <span className="text-white font-bold">{hashSearchResult.filename}</span>
                                                            {hashSearchResult.folder && <span className="text-gray-500"> · Pasta: {hashSearchResult.folder}</span>}
                                                        </p>
                                                    )}
                                                    {hashSearchResult.registeredAt && (
                                                        <p className="text-[10px] font-mono text-gray-500">
                                                            Registrado em: {new Date(hashSearchResult.registeredAt).toLocaleString('pt-BR')}
                                                        </p>
                                                    )}
                                                    {hashSearchResult.logId && !reportData && (
                                                        <button
                                                            onClick={generateReport}
                                                            className="mt-2 w-full py-2 bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 rounded-lg text-green-300 font-bold text-xs flex items-center justify-center gap-2 transition"
                                                        >
                                                            <Download className="w-3.5 h-3.5" /> Baixar Relatório de Conformidade
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 space-y-4">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <FileSearch className="w-5 h-5 text-gray-400" />
                                        {mode === 'CUSTODY' ? 'Aferição Cruzada — Arquivo Custodiado' : 'Verificação Local — Arquivo de Terceiros'}
                                    </h4>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="text"
                                            placeholder="Cole aqui o hash SHA-256 de referência..."
                                            value={expectedHash}
                                            onChange={e => { setExpectedHash(e.target.value); setVerdict(null); setLogId(null); }}
                                            className="flex-grow bg-black border border-gray-700 rounded-xl px-4 py-3 font-mono text-sm focus:border-[#bc13fe] focus:outline-none transition text-white"
                                            spellCheck={false}
                                        />
                                        <button
                                            onClick={checkIntegrity}
                                            disabled={!expectedHash.trim()}
                                            className="shrink-0 px-6 py-3 bg-[#bc13fe] hover:bg-[#a00bdb] disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition shadow-[0_0_15px_rgba(188,19,254,0.4)] disabled:shadow-none"
                                        >
                                            Validar Veredito
                                        </button>
                                    </div>

                                    {verdict === 'MATCH' && (
                                        <div className="mt-4 bg-green-900/20 border border-green-500/50 p-4 rounded-xl flex items-start gap-4 animate-in fade-in zoom-in duration-300">
                                            <div className="p-2 bg-green-500 rounded-lg text-white shrink-0">✅</div>
                                            <div>
                                                <h5 className="text-green-400 font-bold text-lg">ÍNTEGRO · EVIDÊNCIA AUTÊNTICA</h5>
                                                <p className="text-green-200/70 text-sm mt-1">
                                                    Digest SHA-256 <strong>bit-a-bit idêntico</strong> ao hash de referência. Valor probatório intacto.
                                                    {mode === 'CUSTODY' && logId && (
                                                        <span className="block mt-1 text-xs text-green-300/50">
                                                            Verificação registrada no log de auditoria. Status: <strong>ENCONTRADA</strong>.
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {verdict === 'MISMATCH' && (
                                        <div className="mt-4 bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-4 animate-in fade-in zoom-in duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                            <div className="p-2 bg-red-500 rounded-lg text-white shrink-0 animate-bounce">❌</div>
                                            <div>
                                                <h5 className="text-red-400 font-bold text-lg">ALERTA CRÍTICO: INTEGRIDADE COMPROMETIDA</h5>
                                                <p className="text-red-200/70 text-sm mt-1">
                                                    Digest SHA-256 <strong>diverge</strong> do hash de referência. Arquivo possivelmente adulterado. Valor probatório: <span className="font-bold">NULO</span>.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Report button — only Mode A after verification */}
                                    {mode === 'CUSTODY' && verdict && logId && !reportData && (
                                        <button
                                            onClick={generateReport}
                                            className="w-full mt-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition"
                                        >
                                            <Download className="w-4 h-4" /> GERAR RELATÓRIO DE CONFORMIDADE
                                        </button>
                                    )}

                                    {reportData && (
                                        <div className="bg-black/60 border border-slate-700 rounded-xl p-4 space-y-2 font-mono text-xs">
                                            <p className="text-slate-400 uppercase tracking-widest mb-3">Relatório #{reportData.reportId}</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <span className="text-slate-500">Emitido em:</span>
                                                <span className="text-white">{new Date(reportData.generatedAt).toLocaleString('pt-BR')}</span>
                                                <span className="text-slate-500">Resultado:</span>
                                                <span className={reportData.auditLog.isMatch ? 'text-green-400' : 'text-red-400'}>
                                                    {reportData.auditLog.isMatch ? '✓ CONFORME' : '✗ NÃO CONFORME'}
                                                </span>
                                                <span className="text-slate-500">IP Registrado:</span>
                                                <span className="text-white">{reportData.auditLog.ipAddress}</span>
                                            </div>
                                            <p className="text-slate-500 mt-2 italic text-[10px]">{reportData.verdict}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* ── LOOKUP TOOLS ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Doc ID Lookup */}
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-lg">
                            <BookOpen className="w-4 h-4 text-[#bc13fe]" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm">Consultar por ID do Documento</h4>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Formato: NCFN-XXXXXXXX</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Insira o ID do protocolo impresso no cabeçalho do laudo pericial para verificar se o arquivo ainda está custodiado no sistema.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="NCFN-..."
                            value={docIdValue}
                            onChange={e => { setDocIdValue(e.target.value.toUpperCase()); setDocIdResult(null); }}
                            className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-2.5 font-mono text-sm focus:border-[#bc13fe] focus:outline-none text-white uppercase"
                            spellCheck={false}
                        />
                        <button
                            onClick={lookupDocId}
                            disabled={docIdLoading || !docIdValue.trim()}
                            className="px-4 py-2.5 bg-[#bc13fe]/15 hover:bg-[#bc13fe]/25 border border-[#bc13fe]/30 text-[#bc13fe] font-bold rounded-xl transition disabled:opacity-40 flex items-center gap-1.5"
                        >
                            {docIdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                    </div>
                    {docIdResult && (
                        <div className={`p-3 rounded-xl border text-xs ${
                            docIdResult.found ? 'bg-green-900/20 border-green-500/40 text-green-300' : 'bg-red-900/20 border-red-500/30 text-red-300'
                        }`}>
                            <p className="font-bold mb-1">{docIdResult.message}</p>
                            {docIdResult.results?.map((r: any, i: number) => (
                                <p key={i} className="font-mono text-gray-400 text-[10px]">
                                    {r.filePath} · {r.action} · {new Date(r.timestamp).toLocaleString('pt-BR')}
                                </p>
                            ))}
                            {docIdResult.generatedAt && (
                                <p className="text-[10px] text-gray-500 mt-1">Gerado em: {new Date(docIdResult.generatedAt).toLocaleString('pt-BR')}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Hex Header Lookup */}
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <Binary className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm">Consultar por Cabeçalho Hexadecimal</h4>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Magic Bytes · File Signature</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Solte o arquivo abaixo para extrair o cabeçalho automaticamente, ou cole os bytes hex manualmente.
                    </p>

                    {/* Drop zone — auto-extrai hex do arquivo */}
                    <label
                        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-xl py-5 px-4 cursor-pointer transition-colors bg-amber-500/5 hover:bg-amber-500/10"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => {
                                const buf = new Uint8Array(ev.target?.result as ArrayBuffer);
                                const hex = Array.from(buf.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('');
                                setHexValue(hex);
                                setHexResult(null);
                            };
                            reader.readAsArrayBuffer(file.slice(0, 32));
                        }}
                    >
                        <input type="file" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => {
                                const buf = new Uint8Array(ev.target?.result as ArrayBuffer);
                                const hex = Array.from(buf.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('');
                                setHexValue(hex);
                                setHexResult(null);
                            };
                            reader.readAsArrayBuffer(file.slice(0, 32));
                        }} />
                        <UploadCloud className="w-5 h-5 text-amber-400/60" />
                        <span className="text-[11px] text-amber-400/70 font-mono text-center">Solte o arquivo aqui ou clique para selecionar<br/><span className="text-gray-600">Os primeiros 32 bytes serão extraídos localmente</span></span>
                    </label>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="ex: 89504e47... (preenchido automaticamente ao soltar arquivo)"
                            value={hexValue}
                            onChange={e => { setHexValue(e.target.value); setHexResult(null); }}
                            className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-2.5 font-mono text-xs focus:border-amber-500 focus:outline-none text-white"
                            spellCheck={false}
                        />
                        <button
                            onClick={lookupHex}
                            disabled={hexLoading || !hexValue.trim()}
                            className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-xl transition disabled:opacity-40 flex items-center gap-1.5"
                        >
                            {hexLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                    </div>
                    {hexResult && (
                        <div className={`p-3 rounded-xl border text-xs ${
                            hexResult.found ? 'bg-amber-900/20 border-amber-500/40 text-amber-300' : 'bg-red-900/20 border-red-500/30 text-red-300'
                        }`}>
                            <p className="font-bold mb-1">{hexResult.message}</p>
                            {hexResult.results?.map((r: any, i: number) => (
                                <p key={i} className="font-mono text-gray-400 text-[10px]">
                                    {r.folder} / <span className="text-white font-bold">{r.filename}</span>
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Security note — dynamic */}
            <div className="flex items-start gap-4 bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                <Info className="w-6 h-6 text-[#bc13fe] shrink-0 mt-1" />
                <div>
                    <h4 className="text-white font-bold mb-2">
                        {mode === 'CUSTODY'
                            ? 'Modo A — Arquivo Custodiado (Com Registro de Auditoria)'
                            : 'Modo B — Arquivo de Terceiros (Air-Gapped, Sem Rastro)'}
                    </h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        {mode === 'CUSTODY'
                            ? 'O arquivo não sobe para o servidor — apenas sua assinatura algorítmica (hash SHA-256, calculada localmente no navegador) é transmitida para fins de registro no log imutável de auditoria. O log gerado alimenta o Painel de Interceptações com IP e timestamp para fins de cadeia de custódia.'
                            : 'O processamento ocorre 100% no seu navegador (Client-Side via Web Crypto API). Nenhuma informação, byte ou metadado trafega pela rede, garantindo sigilo absoluto. Nenhum log, registro ou relatório é gerado. Uso indicado para materiais sigilosos de investigação ativa.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
