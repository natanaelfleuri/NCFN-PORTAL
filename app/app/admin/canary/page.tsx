"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2, Mail, Eye, ToggleLeft, ToggleRight, Shield, Zap, RefreshCw, HelpCircle, X } from "lucide-react";

const VAULT_FOLDERS = [
    "0_NCFN-ULTRASECRETOS",
    "1_NCFN-PROVAS-SENSÍVEIS",
    "2_NCFN-ELEMENTOS-DE-PROVA",
    "3_NCFN-DOCUMENTOS-GERENTE",
    "4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS",
    "5_NCFN-GOVERNOS-EMPRESAS",
    "6_NCFN-FORNECIDOS_sem_registro_de_coleta",
    "7_NCFN-CAPTURAS-WEB_OSINT",
    "8_NCFN-VIDEOS",
    "9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS",
    "10_NCFN-ÁUDIO",
    "11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS",
    "12_NCFN-METADADOS-LIMPOS",
    "100_BURN_IMMUTABILITY",
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
    const [deploying, setDeploying] = useState(false);
    const [deployEmail, setDeployEmail] = useState("");
    const [showDeployPanel, setShowDeployPanel] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

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
        setTimeout(() => setMsg(""), 6000);
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

    async function deployAll() {
        if (!deployEmail.trim()) { setStatus("Informe o email de alerta.", "err"); return; }
        if (!confirm(`Implantar canary files em TODAS as ${VAULT_FOLDERS.length} pastas do vault?\nEmail de alerta: ${deployEmail}`)) return;
        setDeploying(true);
        const res = await fetch("/api/admin/canary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "deploy-all", alertEmail: deployEmail }),
        });
        const data = await res.json();
        if (data.ok) {
            setStatus(`✓ ${data.deployed} canary files implantados em todas as pastas do vault.`);
            setShowDeployPanel(false);
            fetchCanaries();
        } else {
            setStatus(data.error || "Erro ao implantar.", "err");
        }
        setDeploying(false);
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

    const activeCount = canaries.filter(c => c.active).length;
    const totalAccesses = canaries.reduce((s, c) => s + c.accessCount, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/40">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Canary Token Files</h1>
                        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Armadilhas digitais · Detecção de intrusão · Alerta SMTP em tempo real</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShowHelp(true)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all">
                        <HelpCircle size={14} /> Como funciona
                    </button>
                    <button
                        onClick={() => setShowDeployPanel(!showDeployPanel)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all text-sm font-bold"
                    >
                        <Zap className="w-4 h-4" /> Implantar em Todas as Pastas
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-bold"
                    >
                        <Plus className="w-4 h-4" /> Novo Canary
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Canaries Ativos', value: activeCount, color: 'red' },
                    { label: 'Total Configurados', value: canaries.length, color: 'gray' },
                    { label: 'Acessos Registrados', value: totalAccesses, color: 'amber' },
                ].map(({ label, value, color }) => (
                    <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-xl p-4 text-center`}>
                        <div className={`text-2xl font-black text-${color}-400`}>{value}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">{label}</div>
                    </div>
                ))}
            </div>

            {/* Info box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-400 font-mono leading-relaxed">
                <Shield className="w-4 h-4 inline mr-2" />
                <strong>Canary Token — Técnica de Detecção de Intrusão:</strong> Um canary file é um arquivo-isca estrategicamente posicionado no vault. O conteúdo exibe uma mensagem de contrainteligência ao invasor enquanto o sistema registra silenciosamente o acesso (IP, timestamp, identidade, device fingerprint). O administrador recebe alerta por e-mail imediatamente. Técnica utilizada por Red Teams, SOCs e equipes de investigação forense para detectar ameaças internas, vazamentos e movimentação lateral não autorizada.
            </div>

            {msg && (
                <div className={`px-4 py-3 rounded-lg border text-sm font-mono ${msgType === "err" ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"}`}>
                    {msg}
                </div>
            )}

            {/* Deploy All Panel */}
            {showDeployPanel && (
                <div className="bg-orange-950/30 border border-orange-500/40 rounded-xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Implantação em Massa — Todas as Pastas do Vault
                    </h2>
                    <p className="text-xs text-orange-300/70 font-mono">
                        Cria um canary file com nome sugestivo (SENHAS_MASTER, PROVAS_SECRETAS, DADOS_VAZADOS...) em cada uma das {VAULT_FOLDERS.length} pastas do Vault NCFN.
                        O conteúdo exibe a mensagem de contrainteligência. Qualquer acesso aciona alerta para o email abaixo.
                    </p>
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Email de Alerta para Todos *</label>
                            <input
                                value={deployEmail}
                                onChange={e => setDeployEmail(e.target.value)}
                                type="email"
                                placeholder="admin@ncfn.local"
                                className="w-full bg-black border border-orange-700/50 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                            />
                        </div>
                        <button
                            onClick={deployAll}
                            disabled={deploying}
                            className="px-6 py-2 bg-orange-500 text-white text-sm font-black rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {deploying ? <><RefreshCw className="w-4 h-4 animate-spin" /> Implantando...</> : <><Zap className="w-4 h-4" /> Implantar Agora</>}
                        </button>
                        <button onClick={() => setShowDeployPanel(false)} className="px-4 py-2 border border-gray-700 text-gray-400 text-sm rounded-lg hover:border-gray-500 transition-all">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* New canary form */}
            {showForm && (
                <div className="bg-gray-900/60 border border-red-500/30 rounded-xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">Novo Canary File</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Nome do Arquivo *</label>
                            <input value={filename} onChange={e => setFilename(e.target.value)}
                                placeholder="ex: SENHAS_MASTER_2026.txt"
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Pasta do Vault *</label>
                            <select value={folder} onChange={e => setFolder(e.target.value)}
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500">
                                {VAULT_FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Email de Alerta *</label>
                            <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
                                type="email" placeholder="admin@ncfn.local"
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Descrição (Interna)</label>
                            <input value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="Isca para detectar acesso ao FINANCEIRO"
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={createCanary} disabled={saving}
                            className="px-6 py-2 bg-red-500 text-white text-sm font-black rounded-lg hover:bg-red-600 transition-all disabled:opacity-50">
                            {saving ? "Criando..." : "Criar Canary File"}
                        </button>
                        <button onClick={() => setShowForm(false)}
                            className="px-4 py-2 border border-gray-700 text-gray-400 text-sm rounded-lg hover:border-gray-500 transition-all">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Canary list */}
            {loading ? (
                <div className="text-center py-12 text-gray-600 font-mono text-sm">Carregando...</div>
            ) : canaries.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl text-gray-600">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum canary file configurado.</p>
                    <p className="text-xs mt-1">Use "Implantar em Todas as Pastas" para implantação automática.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {canaries.map(canary => (
                        <div key={canary.id} className={`bg-gray-900/40 border rounded-xl p-4 ${canary.active ? "border-gray-800" : "border-gray-800/30 opacity-50"}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${canary.active ? "bg-red-400 shadow-[0_0_6px_#f87171]" : "bg-gray-600"}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-white font-mono">{canary.filename}</span>
                                        <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded font-mono">{canary.folder}</span>
                                        {canary.accessCount > 0 && (
                                            <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                                                ⚠ {canary.accessCount} ACESSOS
                                            </span>
                                        )}
                                    </div>
                                    {canary.description && (
                                        <p className="text-xs text-gray-500 mt-0.5">{canary.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-1 text-[10px] font-mono text-gray-600 flex-wrap">
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {canary.alertEmail}</span>
                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {canary.accessCount} acessos</span>
                                        {canary.lastAccessedAt && (
                                            <span className="text-red-600">Último: {new Date(canary.lastAccessedAt).toLocaleString("pt-BR")}</span>
                                        )}
                                        <span>Criado: {new Date(canary.createdAt).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => testAlert(canary.id)} title="Testar alerta"
                                        className="px-2 py-1 text-[10px] font-bold border border-amber-500/40 text-amber-400 rounded-lg hover:bg-amber-500/10 transition-all uppercase">
                                        Testar
                                    </button>
                                    <button onClick={() => toggleCanary(canary.id)} title={canary.active ? "Desativar" : "Ativar"}
                                        className="text-gray-500 hover:text-gray-300 transition-all">
                                        {canary.active ? <ToggleRight className="w-5 h-5 text-red-400" /> : <ToggleLeft className="w-5 h-5" />}
                                    </button>
                                    <button onClick={() => deleteCanary(canary.id)}
                                        className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showHelp && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-5 relative">
                        <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/30">
                                <HelpCircle className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="font-black text-white text-lg uppercase tracking-widest">COMO FUNCIONA</h2>
                        </div>
                        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                            <p><strong className="text-white">Canary Token Files</strong> são arquivos-armadilha plantados nas pastas do Vault que alertam quando acessados por partes não autorizadas.</p>
                            <p>Crie um canary file configurando o nome do arquivo, a pasta do Vault e o <strong className="text-white">e-mail de alerta</strong> que receberá a notificação imediata quando o arquivo for acessado.</p>
                            <p>Use <strong className="text-white">Implantar em Todas as Pastas</strong> para criar automaticamente um canary em cada uma das 12+ zonas de custódia do Vault de uma só vez.</p>
                            <p>Qualquer acesso ao arquivo canary gera um <strong className="text-white">alerta imediato no log de auditoria</strong> e envia e-mail SMTP em tempo real — detectando intrusões e vazamentos.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
