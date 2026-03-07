"use client";
import React, { useEffect, useRef } from 'react';
import { X, Shield, AlertTriangle, FileText } from 'lucide-react';

type SecurePreviewProps = {
    url: string | null;
    filename: string;
    type: 'image' | 'text';
    textContent?: string;
    onClose: () => void;
};

export default function SecurePreview({ url, filename, type, textContent, onClose }: SecurePreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!url && !textContent) return;

        // Block right-click context menu on the preview area
        const el = containerRef.current;
        if (!el) return;
        const prevent = (e: MouseEvent) => e.preventDefault();
        el.addEventListener('contextmenu', prevent);

        // Block keyboard shortcuts that could save content
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c', 'a', 'u'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', handleKey);

        return () => {
            el.removeEventListener('contextmenu', prevent);
            window.removeEventListener('keydown', handleKey);
        };
    }, [url, textContent]);

    if (!url && !textContent) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                ref={containerRef}
                className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]"
                onClick={e => e.stopPropagation()}
                style={{ userSelect: 'none' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-black/80 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-[#00f3ff]" />
                        <span className="text-white text-sm font-bold truncate max-w-xs">{filename}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full uppercase tracking-widest">
                            Modo Seguro
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg transition hover:bg-white/5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Security Notice */}
                <div className="flex items-center gap-2 px-5 py-2 bg-yellow-500/5 border-b border-yellow-500/10">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <p className="text-yellow-600 text-[10px] font-mono">
                        PROTOCOLO NCFN: Captura de tela, cópia e contexto web bloqueados. Sessão monitorada.
                    </p>
                </div>

                {/* Content Area */}
                <div className="overflow-auto flex-grow">
                    {type === 'image' && url && (
                        <div className="flex items-center justify-center p-8 bg-black/50 min-h-[400px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={url}
                                alt="Preview Seguro"
                                className="max-w-full max-h-[65vh] object-contain rounded-lg pointer-events-none"
                                draggable={false}
                                onDragStart={e => e.preventDefault()}
                            />
                        </div>
                    )}
                    {type === 'text' && textContent !== undefined && (
                        <div className="p-6 overflow-y-auto max-h-[65vh]">
                            <pre className="text-[#00f3ff] font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-none">
                                {textContent}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-t border-gray-800 shrink-0">
                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        NCFN Zero-Trust Viewer | Sessão: {new Date().toISOString()}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-600">
                        <FileText className="w-3 h-3" />
                        <span>{filename}</span>
                    </div>
                </div>

                {/* Forensic Watermark Layer */}
                <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden opacity-[0.03] select-none">
                    <div className="grid grid-cols-3 gap-20 -rotate-12 scale-150">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="text-white font-mono text-[10px] uppercase tracking-widest whitespace-nowrap">
                                NCFN PROTOCOL | {new Date().toISOString().split('T')[0]} | SESSION_{Math.random().toString(36).substring(7).toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
