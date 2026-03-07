"use client";
import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

type Simulated2FAProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    actionName: string;
};

export default function Simulated2FA({ isOpen, onClose, onSuccess, actionName }: Simulated2FAProps) {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [status, setStatus] = useState<'idle' | 'sending' | 'verifying' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            handleSendCode();
        } else {
            setCode(['', '', '', '', '', '']);
            setStatus('idle');
            setErrorMsg('');
        }
    }, [isOpen]);

    const handleSendCode = async () => {
        setStatus('sending');
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('idle');
    };

    const handleInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        // Auto focus next
        if (value && index < 5) {
            const nextInput = document.getElementById(`2fa-input-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`2fa-input-${index - 1}`);
            prevInput?.focus();
        }
    };

    const verifyCode = async () => {
        const fullCode = code.join('');
        if (fullCode.length < 6) return;

        setStatus('verifying');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Let's say code "123456" or anything that doesn't start with 0 is success for the simulation
        if (fullCode === '000000') {
            setStatus('error');
            setErrorMsg('CÓDIGO INVÁLIDO OU EXPIRADO');
        } else {
            setStatus('success');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
            <div
                className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-3xl p-8 shadow-[0_0_80px_rgba(188,19,254,0.15)] relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#bc13fe]/5 blur-3xl rounded-full -mr-16 -mt-16"></div>

                <div className="flex justify-between items-start mb-8">
                    <div className="p-3 bg-[#bc13fe]/10 rounded-2xl border border-[#bc13fe]/20">
                        <Shield className="w-8 h-8 text-[#bc13fe]" />
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-2 mb-8">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Step-Up Auth Required</h3>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-mono">
                        Ação: <span className="text-white font-bold">{actionName}</span>
                    </p>
                    <p className="text-gray-400 text-sm leading-relaxed pt-2">
                        Para prosseguir com esta operação sensível, insira o código de 6 dígitos enviado ao seu dispositivo móvel NCFN.
                    </p>
                </div>

                <div className="flex justify-between gap-2 mb-8">
                    {code.map((digit, i) => (
                        <input
                            key={i}
                            id={`2fa-input-${i}`}
                            type="text"
                            inputMode="numeric"
                            value={digit}
                            onChange={e => handleInput(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            className="w-12 h-16 bg-black border border-gray-800 focus:border-[#bc13fe] rounded-xl text-center text-2xl font-black text-white focus:outline-none transition-all focus:shadow-[0_0_15px_rgba(188,19,254,0.3)]"
                            disabled={status === 'verifying' || status === 'success'}
                            autoFocus={i === 0}
                        />
                    ))}
                </div>

                {status === 'sending' && (
                    <div className="flex items-center gap-3 text-[#bc13fe] text-xs font-mono mb-8 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        ENVIANDO CÓDIGO VIA TRANSMISSÃO NEURAL...
                    </div>
                )}

                {status === 'verifying' && (
                    <div className="flex items-center gap-3 text-[#00f3ff] text-xs font-mono mb-8 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        DESCRIPTOGRAFANDO DESAFIO BIOMÉTRICO...
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex items-center gap-3 bg-red-950/20 border border-red-500/50 p-4 rounded-xl text-red-500 text-xs font-bold mb-8 animate-in shake-in duration-300">
                        <AlertCircle className="w-5 h-5" />
                        {errorMsg}
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex items-center gap-3 bg-green-950/20 border border-green-500/50 p-4 rounded-xl text-green-400 text-xs font-bold mb-8 animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-5 h-5" />
                        AUTENTICAÇÃO CONCLUÍDA. ACESSO GARANTIDO.
                    </div>
                )}

                <button
                    onClick={verifyCode}
                    disabled={code.some(d => !d) || status === 'verifying' || status === 'success'}
                    className="w-full py-4 bg-[#bc13fe] hover:bg-[#a00bdb] text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-[0_10px_30px_rgba(188,19,254,0.3)] disabled:opacity-30 disabled:shadow-none"
                >
                    Confirmar Identidade
                </button>

                <div className="mt-8 pt-6 border-t border-gray-900 flex flex-col items-center gap-2 opacity-30">
                    <Fingerprint className="w-6 h-6 text-gray-600" />
                    <span className="text-[8px] uppercase font-mono tracking-widest">Protocolo MFA-Sec-v3</span>
                </div>
            </div>
        </div>
    );
}
