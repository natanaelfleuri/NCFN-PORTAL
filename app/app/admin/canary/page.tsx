"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2, Mail, Eye, ToggleLeft, ToggleRight, Shield } from "lucide-react";

const VAULT_FOLDERS = [
    "01_OPERACIONAL", "02_INTELIGENCIA", "03_ALVOS", "04_FINANCEIRO",
    "05_LOGS_ACESSO", "06_CRIPTOGRAFIA", "07_VAZAMENTOS", "08_PERICIAS", "09_BURN_IMMUTABILITY",
];

interface CanaryFile {
    id: string;
    filename: string;
    folder: string;
    description: string | null;
    alertEmail: string;
    accessCount: number;
    lastAccessedAt: string | null;
    active: boolean;
    createdAt: string;
}

export default function CanaryPage() {
    const [canaries, setCanaries] = useState<CanaryFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState<"ok" | "err">("ok");

    const [filename, setFilename] = useState("");
    const [folder, setFolder] = useState(VAULT_FOLDERS[0]);
    const [description, setDescription] = useState("");
    const [alertEmail, setAlertEmail] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchCanaries(); }, []);

    async function fetchCanaries() {
        setLoading(true);
        const res = await fetch("/api/admin/canary");
        const data = await res.json();
        setCanaries(data.canaries || []);
        setLoading(false);
    }

    function setStatus(message: string, type: "ok" | "err" = "ok") {
        setMsg(message); setMsgType(type);
        setTimeout(() => setMsg(""), 5000);
    }

    async function createCanary() {
        if (!filename.trim() || !alertEmail.trim()) {
            setStatus("Nome do arquivo e email de alerta são obrigatórios.", "err"); return;
        }
        setSaving(true);
        const res = await fetch("/api/admin/canary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create", filename, folder, description, alertEmail }),
        });
        const data = await res.json();
        if (data.ok) {
            setStatus("Canary file criado com sucesso!");
            setShowForm(false);
            setFilename(""); setDescription(""); setAlertEmail("");
            fetchCanaries();
        } else {
            setStatus(data.error || "Erro ao criar.", "err");
        }
        setSaving(false);
    }

    async function deleteCanary(id: string) {
        if (!confirm("Deletar este canary file? O arquivo físico também será removido.")) return;
        const res = await fetch("/api/admin/canary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id }),
        });
        if ((await res.json()).ok) {
            setCanaries(prev => prev.filter(c => c.id !== id));
            setStatus("Canary file removido.");
        }
    }

    async function testAlert(id: string) {
        const res = await fetch("/api/admin/canary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "test", id }),
        });
        const data = await res.json();
        setStatus(data.ok ? data.message : data.error, data.ok ? "ok" : "err");
    }

    async function toggleCanary(id: string) {
        const res = await fetch("/api/admin/canary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggle", id }),
        });
        const data = await res.json();
        if (data.ok) setCanaries(prev => prev.map(c => c.id === id ? data.canary : c));
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/40">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Canary Token Files</h1>
                        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Armadilhas digitais · Detecção de intrusão · Alerta SMTP em tempo real</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-bold"
                >
                    <Plus className="w-4 h-4" /> Novo Canary
                </button>
            </div>

            {/* Info box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-400 font-mono leading-relaxed">
                <Shield className="w-4 h-4 inline mr-2" />
                <strong>Canary Token — Técnica de Detecção de Intrusão:</strong> Um canary file é um arquivo-isca estrategicamente posicionado no vault. O conteúdo é inócuo, mas o nome simula dados sensíveis (ex: FINANCEIRO_2026.xlsx, SENHA_MASTER.txt). Qualquer acesso — autorizado ou não — aciona imediatamente um alerta por e-mail com IP, timestamp, device fingerprint e localização do acesso. Técnica amplamente utilizada por times de Red Team, SOC e investigação forense para detectar ameaças internas, vazamentos e movimentação lateral não autorizada na infraestrutura.
            </div>

            {msg && (
                <div className={`px-4 py-3 rounded-lg border text-sm font-mono ${msgType === "err" ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"}`}>
                    {msg}
                </div>
            )}

            {/* Formulário */}
            {showForm && (
                <div className="bg-gray-900/60 border border-red-500/30 rounded-xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">Novo Canary File</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Nome do Arquivo *</label>
                            <input
                                value={filename}
                                onChange={e => setFilename(e.target.value)}
                                placeholder="ex: CONFIDENCIAL_2026.txt"
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Pasta do Vault *</label>
                            <select
                                value={folder}
                                onChange={e => setFolder(e.target.value)}
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                            >
                                {VAULT_FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Email de Alerta *</label>
                            <input
                                value={alertEmail}
                                onChange={e => setAlertEmail(e.target.value)}
                                type="email"
                                placeholder="admin@ncfn.local"
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Descrição (Interna)</label>
                            <input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Isca para detectar acesso ao FINANCEIRO"
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={createCanary}
                            disabled={saving}
                            className="px-6 py-2 bg-red-500 text-white text-sm font-black rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                            {saving ? "Criando..." : "Criar Canary File"}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 border border-gray-700 text-gray-400 text-sm rounded-lg hover:border-gray-500 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de canary files */}
            {loading ? (
                <div className="text-center py-12 text-gray-600 font-mono text-sm">Carregando...</div>
            ) : canaries.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl text-gray-600">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum canary file configurado.</p>
                    <p className="text-xs mt-1">Crie o primeiro para ativar a detecção de intrusão.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {canaries.map(canary => (
                        <div key={canary.id} className={`bg-gray-900/40 border rounded-xl p-4 ${canary.active ? "border-gray-800" : "border-gray-800/30 opacity-50"}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${canary.active ? "bg-red-400 shadow-[0_0_6px_#f87171]" : "bg-gray-600"}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white font-mono">{canary.filename}</span>
                                        <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{canary.folder}</span>
                                    </div>
                                    {canary.description && (
                                        <p className="text-xs text-gray-500 mt-0.5">{canary.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-1 text-[10px] font-mono text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" /> {canary.alertEmail}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> {canary.accessCount} acessos
                                        </span>
                                        {canary.lastAccessedAt && (
                                            <span>Último: {new Date(canary.lastAccessedAt).toLocaleString("pt-BR")}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => testAlert(canary.id)}
                                        title="Testar alerta"
                                        className="px-2 py-1 text-[10px] font-bold border border-amber-500/40 text-amber-400 rounded-lg hover:bg-amber-500/10 transition-all uppercase"
                                    >
                                        Testar
                                    </button>
                                    <button
                                        onClick={() => toggleCanary(canary.id)}
                                        title={canary.active ? "Desativar" : "Ativar"}
                                        className="text-gray-500 hover:text-gray-300 transition-all"
                                    >
                                        {canary.active ? <ToggleRight className="w-5 h-5 text-red-400" /> : <ToggleLeft className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => deleteCanary(canary.id)}
                                        className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
