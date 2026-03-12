"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Copy, Download, Loader2, Maximize2, Minimize2, X } from 'lucide-react';

type Props = {
    folder: string;
    filename: string;
    onClose: () => void;
};

type Phase = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export default function AiAnalysisModal({ folder, filename, onClose }: Props) {
    const [phase, setPhase]       = useState<Phase>('loading');
    const [protocol, setProtocol] = useState('');
    const [status, setStatus]     = useState('Iniciando análise...');
    const [text, setText]         = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [maximized, setMaximized] = useState(false);
    const [copied, setCopied]     = useState(false);

    const bodyRef  = useRef<HTMLDivElement>(null);
    const fullRef  = useRef('');
    const abortRef = useRef<AbortController | null>(null);

    // auto-scroll
    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [text]);

    // start stream on mount
    useEffect(() => {
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        (async () => {
            try {
                const res = await fetch('/api/ai-analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folder, filename }),
                    signal: ctrl.signal,
                });

                if (!res.ok) {
                    setErrorMsg(`HTTP ${res.status}`);
                    setPhase('error');
                    return;
                }

                if (!res.body) {
                    setErrorMsg('Sem corpo na resposta.');
                    setPhase('error');
                    return;
                }

                const reader = res.body.getReader();
                const dec    = new TextDecoder();
                let buf      = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buf += dec.decode(value, { stream: true });
                    const lines = buf.split('\n');
                    buf = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const payload = JSON.parse(line.slice(6));

                            if (payload.type === 'protocol') {
                                setProtocol(payload.protocol);
                            } else if (payload.type === 'status') {
                                setStatus(payload.msg);
                                setPhase('loading');
                            } else if (payload.type === 'chunk') {
                                setPhase('streaming');
                                fullRef.current += payload.text;
                                setText(prev => prev + payload.text);
                            } else if (payload.type === 'done') {
                                setPhase('done');
                                if (payload.fullText) {
                                    fullRef.current = payload.fullText;
                                    setText(payload.fullText);
                                }
                            } else if (payload.type === 'error') {
                                setErrorMsg(payload.msg);
                                setPhase('error');
                            }
                        } catch {}
                    }
                }

                if (phase !== 'done') setPhase('done');

            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    setErrorMsg(e?.message ?? String(e));
                    setPhase('error');
                }
            }
        })();

        return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folder, filename]);

    const handleDownload = useCallback(() => {
        const content = [
            `# Relatório Forense — Perito Sansão`,
            `**Arquivo:** ${filename}`,
            `**Pasta:** ${folder}`,
            `**Protocolo:** ${protocol || 'N/A'}`,
            `**Data:** ${new Date().toLocaleString('pt-BR')}`,
            '',
            '---',
            '',
            fullRef.current || text,
        ].join('\n');

        const blob = new Blob([content], { type: 'text/markdown' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `pericia_${filename.replace(/\.[^.]+$/, '')}_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filename, folder, protocol, text]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(fullRef.current || text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [text]);

    const panelClass = maximized
        ? 'fixed inset-4 z-[80] flex flex-col'
        : 'fixed bottom-6 right-6 z-[80] flex flex-col w-[min(700px,calc(100vw-2rem))] h-[min(580px,calc(100vh-6rem))]';

    return (
        <>
            {/* backdrop (only when maximized) */}
            {maximized && (
                <div className="fixed inset-0 z-[79] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            )}

            <div className={`${panelClass} bg-[#0a0018] border border-[#bc13fe]/30 rounded-2xl shadow-[0_0_60px_rgba(188,19,254,0.2)] overflow-hidden`}>

                {/* ── Header ──────────────────────────────────────────── */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#bc13fe]/20 bg-black/40 flex-shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-[#bc13fe]/15 border border-[#bc13fe]/30 flex items-center justify-center flex-shrink-0">
                        {phase === 'loading' || phase === 'streaming'
                            ? <Loader2 className="w-3.5 h-3.5 text-[#bc13fe] animate-spin" />
                            : <Bot className="w-3.5 h-3.5 text-[#bc13fe]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{filename}</p>
                        {protocol && (
                            <p className="text-[9px] text-[#bc13fe] font-mono uppercase tracking-wider truncate">{protocol}</p>
                        )}
                    </div>

                    {/* status badge */}
                    {(phase === 'loading') && (
                        <span className="text-[9px] font-mono text-gray-500 hidden sm:block animate-pulse truncate max-w-[180px]">{status}</span>
                    )}
                    {phase === 'done' && (
                        <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">concluído</span>
                    )}
                    {phase === 'error' && (
                        <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase">erro</span>
                    )}

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={() => setMaximized(m => !m)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition"
                            title={maximized ? 'Reduzir' : 'Maximizar'}
                        >
                            {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-red-500/20 transition"
                            title="Fechar"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* ── Body ────────────────────────────────────────────── */}
                <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 min-h-0">
                    {phase === 'loading' && !text && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-2 border-[#bc13fe]/20 animate-ping absolute inset-0" />
                                <div className="w-12 h-12 rounded-full border-2 border-[#bc13fe]/40 animate-spin flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-[#bc13fe]" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 font-mono animate-pulse">{status}</p>
                        </div>
                    )}

                    {phase === 'error' && (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                            <p className="text-red-400 text-sm font-bold">Falha na análise</p>
                            <p className="text-gray-600 text-xs font-mono max-w-sm">{errorMsg}</p>
                            <p className="text-gray-700 text-[10px] mt-2">Verifique se o Ollama está online em Config IA.</p>
                        </div>
                    )}

                    {text && (
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                            {text}
                            {(phase === 'streaming') && (
                                <span className="inline-block w-1.5 h-3 bg-[#bc13fe] animate-pulse ml-0.5 rounded-sm" />
                            )}
                        </pre>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────────────── */}
                {(phase === 'done' || (phase === 'streaming' && text)) && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/5 bg-black/40 flex-shrink-0">
                        <span className="text-[9px] text-gray-600 font-mono flex-1 hidden sm:block">
                            {text.length.toLocaleString('pt-BR')} caracteres
                        </span>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
                        >
                            <Copy className="w-3 h-3" />
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#bc13fe]/15 border border-[#bc13fe]/30 text-[#bc13fe] hover:bg-[#bc13fe]/25 transition"
                        >
                            <Download className="w-3 h-3" />
                            Download .md
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
