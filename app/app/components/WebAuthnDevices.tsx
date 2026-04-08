"use client";

import { useState, useEffect, useCallback } from "react";
import { Fingerprint, Trash2, Pencil, Plus, Loader2, CheckCircle, XCircle, Monitor, Smartphone, Key } from "lucide-react";

interface Device {
    id: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string | null;
    transports: string[];
}

function deviceIcon(transports: string[]) {
    if (transports.includes("internal")) return <Fingerprint className="w-4 h-4 text-[#bc13fe]" />;
    if (transports.includes("hybrid") || transports.includes("ble")) return <Smartphone className="w-4 h-4 text-[#00f3ff]" />;
    if (transports.includes("usb")) return <Key className="w-4 h-4 text-yellow-400" />;
    return <Monitor className="w-4 h-4 text-gray-400" />;
}

export default function WebAuthnDevices() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [registering, setRegistering] = useState(false);

    const fetchDevices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/webauthn/devices");
            const data = await res.json();
            setDevices(data.devices || []);
        } catch {
            setMsg({ text: "Erro ao carregar dispositivos.", type: "err" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDevices(); }, [fetchDevices]);

    async function revokeDevice(id: string) {
        if (!confirm("Revogar este dispositivo? Esta ação não pode ser desfeita.")) return;
        const res = await fetch("/api/webauthn/devices", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credentialId: id }),
        });
        const data = await res.json();
        if (data.ok) {
            setMsg({ text: "Dispositivo revogado.", type: "ok" });
            setDevices(prev => prev.filter(d => d.id !== id));
        } else {
            setMsg({ text: data.error || "Erro ao revogar.", type: "err" });
        }
    }

    async function renameDevice(id: string) {
        if (!editName.trim()) return;
        const res = await fetch("/api/webauthn/devices", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credentialId: id, deviceName: editName }),
        });
        const data = await res.json();
        if (data.ok) {
            setDevices(prev => prev.map(d => d.id === id ? { ...d, deviceName: editName.trim() } : d));
            setEditingId(null);
            setMsg({ text: "Nome atualizado.", type: "ok" });
        } else {
            setMsg({ text: data.error || "Erro ao renomear.", type: "err" });
        }
    }

    async function registerNew() {
        setRegistering(true);
        setMsg(null);
        try {
            // 1. Obter opções de registro
            const optRes = await fetch("/api/webauthn/register");
            if (!optRes.ok) throw new Error("Falha ao obter opções de registro.");
            const options = await optRes.json();

            // 2. Iniciar registro no navegador
            const { startRegistration } = await import("@simplewebauthn/browser");
            const attResp = await startRegistration(options);

            // 3. Verificar no servidor
            const verRes = await fetch("/api/webauthn/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(attResp),
            });
            const verData = await verRes.json();

            if (verData.verified) {
                setMsg({ text: "Dispositivo registrado com sucesso!", type: "ok" });
                await fetchDevices();
            } else {
                setMsg({ text: verData.error || "Falha na verificação.", type: "err" });
            }
        } catch (e: any) {
            if (e?.name === "NotAllowedError") {
                setMsg({ text: "Registro cancelado pelo usuário.", type: "err" });
            } else {
                setMsg({ text: e?.message || "Erro ao registrar dispositivo.", type: "err" });
            }
        } finally {
            setRegistering(false);
        }
    }

    return (
        <div className="bg-black border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Dispositivos WebAuthn (Passkeys)</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {devices.length === 0 ? "Nenhum dispositivo registrado" : `${devices.length} dispositivo${devices.length > 1 ? "s" : ""} ativo${devices.length > 1 ? "s" : ""}`}
                    </p>
                </div>
                <button
                    onClick={registerNew}
                    disabled={registering}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#00f3ff]/40 text-[#00f3ff] text-xs font-bold rounded-lg hover:bg-[#00f3ff]/10 transition-all disabled:opacity-50"
                >
                    {registering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Adicionar
                </button>
            </div>

            {msg && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono ${msg.type === "err" ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"}`}>
                    {msg.type === "ok" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {msg.text}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                </div>
            ) : devices.length === 0 ? (
                <div className="text-center py-6 text-gray-700 text-xs font-mono">
                    <Fingerprint className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhum dispositivo. Clique em "Adicionar" para registrar sua biometria.
                </div>
            ) : (
                <div className="space-y-2">
                    {devices.map(device => (
                        <div key={device.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-900/50 rounded-lg border border-gray-800 group">
                            {deviceIcon(device.transports)}
                            <div className="flex-1 min-w-0">
                                {editingId === device.id ? (
                                    <div className="flex gap-2">
                                        <input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") renameDevice(device.id);
                                                if (e.key === "Escape") setEditingId(null);
                                            }}
                                            className="flex-1 bg-black border border-[#bc13fe]/50 text-white text-xs px-2 py-1 rounded-lg outline-none font-mono"
                                            autoFocus
                                        />
                                        <button onClick={() => renameDevice(device.id)} className="text-[10px] px-2 py-1 bg-[#bc13fe]/20 text-[#bc13fe] rounded-lg font-bold">OK</button>
                                        <button onClick={() => setEditingId(null)} className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded-lg">✕</button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs font-bold text-white truncate">{device.deviceName}</p>
                                        <p className="text-[10px] text-gray-600 font-mono">
                                            Registrado em {new Date(device.createdAt).toLocaleDateString("pt-BR")}
                                            {device.lastUsedAt && ` · Último uso: ${new Date(device.lastUsedAt).toLocaleDateString("pt-BR")}`}
                                        </p>
                                    </>
                                )}
                            </div>
                            {editingId !== device.id && (
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setEditingId(device.id); setEditName(device.deviceName); }}
                                        className="p-1.5 text-gray-600 hover:text-[#00f3ff] transition-colors rounded-lg hover:bg-[#00f3ff]/10"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => revokeDevice(device.id)}
                                        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
