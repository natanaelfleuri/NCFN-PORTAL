"use client";
import { useState, useRef, useCallback } from 'react';
import {
    ShieldCheck, UploadCloud, Copy, Fingerprint, Info, X,
    Database, EyeOff, AlertTriangle, FileSearch, CheckCircle,
    AlertCircle, Download
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

    const processFile = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setGeneratedHash(null);
        setVerdict(null);
        setLogId(null);
        setReportData(null);
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
            // POST only hash (not file) to backend — creates AuditLog
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
        // Mode B: zero network calls — verdict set above
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
                    Motor criptográfico SHA-256 com dois modos — arquivos custodiados (com registro de auditoria) ou arquivos de terceiros (modo anônimo, sem rastro).
                </p>
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
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 transition flex items-center gap-3"
                        >
                            <UploadCloud className="w-5 h-5" /> Carregar Evidência Digital
                        </button>
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
