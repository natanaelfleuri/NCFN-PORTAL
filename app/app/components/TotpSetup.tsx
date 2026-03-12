"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff, QrCode, KeyRound, CheckCircle, XCircle } from "lucide-react";

interface Props {
    totpEnabled: boolean;
}

export default function TotpSetup({ totpEnabled: initialEnabled }: Props) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"idle" | "setup" | "verify" | "disable">("idle");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [code, setCode] = useState("");
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState<"ok" | "err">("ok");

    function setStatus(message: string, type: "ok" | "err" = "ok") {
        setMsg(message);
        setMsgType(type);
    }

    async function startSetup() {
        setLoading(true);
        setMsg("");
        const res = await fetch("/api/auth/totp");
        const data = await res.json();
        if (data.enabled) {
            setEnabled(true);
            setStep("idle");
        } else {
            setQrDataUrl(data.qrDataUrl);
            setSecret(data.secret);
            setStep("setup");
        }
        setLoading(false);
    }

    async function verifyAndEnable() {
        if (!code || code.length !== 6) {
            setStatus("Digite o código de 6 dígitos do seu app.", "err");
            return;
        }
        setLoading(true);
        const res = await fetch("/api/auth/totp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "verify", code }),
        });
        const data = await res.json();
        if (data.ok) {
            setEnabled(true);
            setStep("idle");
            setCode("");
            setStatus("2FA ativado com sucesso! Faça logout e login novamente para aplicar.");
        } else {
            setStatus(data.error || "Código inválido.", "err");
        }
        setLoading(false);
    }

    async function disableTotp() {
        if (!code || code.length !== 6) {
            setStatus("Digite o código de 6 dígitos para confirmar.", "err");
            return;
        }
        setLoading(true);
        const res = await fetch("/api/auth/totp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "disable", code }),
        });
        const data = await res.json();
        if (data.ok) {
            setEnabled(false);
            setStep("idle");
            setCode("");
            setStatus("TOTP 2FA desativado.");
        } else {
            setStatus(data.error || "Código inválido.", "err");
        }
        setLoading(false);
    }

    return (
        <div className="bg-black border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Autenticação de 2 Fatores (TOTP)</p>
                    <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                        {enabled ? (
                            <><CheckCircle className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400">ATIVO</span></>
                        ) : (
                            <><XCircle className="w-4 h-4 text-gray-600" /> <span className="text-gray-500">INATIVO</span></>
                        )}
                    </p>
                </div>
                {step === "idle" && (
                    enabled ? (
                        <button
                            onClick={() => { setStep("disable"); setCode(""); setMsg(""); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/40 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/10 transition-all"
                        >
                            <ShieldOff className="w-3.5 h-3.5" /> Desativar
                        </button>
                    ) : (
                        <button
                            onClick={startSetup}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#bc13fe]/50 text-[#bc13fe] text-xs font-bold rounded-lg hover:bg-[#bc13fe]/10 transition-all disabled:opacity-50"
                        >
                            <ShieldCheck className="w-3.5 h-3.5" /> Configurar
                        </button>
                    )
                )}
            </div>

            {/* Mensagem de status */}
            {msg && (
                <div className={`px-3 py-2 rounded-lg text-xs font-mono ${msgType === "err" ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"}`}>
                    {msg}
                </div>
            )}

            {/* Step: Setup — mostrar QR */}
            {step === "setup" && (
                <div className="space-y-3 pt-2 border-t border-gray-800">
                    <p className="text-xs text-gray-400">
                        Escaneie o QR code com <strong>Google Authenticator</strong>, <strong>Authy</strong> ou similar.
                    </p>
                    {qrDataUrl && (
                        <div className="flex justify-center">
                            <img src={qrDataUrl} alt="QR TOTP" className="w-36 h-36 rounded-lg border border-gray-700" />
                        </div>
                    )}
                    <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Ou insira o código manualmente:</p>
                        <code className="text-xs text-[#00f3ff] font-mono bg-gray-900 px-2 py-1 rounded break-all">{secret}</code>
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Código de Verificação</label>
                        <div className="flex gap-2">
                            <input
                                value={code}
                                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="flex-1 bg-black border border-gray-700 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#bc13fe] font-mono text-center tracking-widest"
                            />
                            <button
                                onClick={verifyAndEnable}
                                disabled={loading || code.length !== 6}
                                className="px-4 py-1.5 bg-[#bc13fe] text-white text-xs font-black rounded-lg hover:bg-[#bc13fe]/80 disabled:opacity-50 transition-all"
                            >
                                {loading ? "..." : "Ativar"}
                            </button>
                        </div>
                    </div>
                    <button onClick={() => { setStep("idle"); setCode(""); }} className="text-xs text-gray-600 hover:text-gray-400 underline">
                        Cancelar
                    </button>
                </div>
            )}

            {/* Step: Disable */}
            {step === "disable" && (
                <div className="space-y-3 pt-2 border-t border-gray-800">
                    <p className="text-xs text-red-400">Digite o código TOTP atual para desativar o 2FA:</p>
                    <div className="flex gap-2">
                        <input
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="flex-1 bg-black border border-gray-700 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-red-500 font-mono text-center tracking-widest"
                        />
                        <button
                            onClick={disableTotp}
                            disabled={loading || code.length !== 6}
                            className="px-4 py-1.5 bg-red-500 text-white text-xs font-black rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all"
                        >
                            {loading ? "..." : "Desativar"}
                        </button>
                    </div>
                    <button onClick={() => { setStep("idle"); setCode(""); }} className="text-xs text-gray-600 hover:text-gray-400 underline">
                        Cancelar
                    </button>
                </div>
            )}
        </div>
    );
}
