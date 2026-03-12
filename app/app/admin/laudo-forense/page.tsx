"use client";

import { useState, useEffect } from "react";
import { FileText, Sparkles, Download, Plus, Trash2, Eye, EyeOff, CheckCircle, Clock, ChevronDown, ChevronUp, X } from "lucide-react";

interface Evidencia {
    name: string;
    path: string;
    type: string;
    hash: string;
    folder: string;
}

interface Laudo {
    id: string;
    titulo: string;
    numeroCaso: string | null;
    operatorEmail: string;
    status: string;
    pdfFile: string | null;
    metodologia: string | null;
    achados: string | null;
    conclusao: string | null;
    quesitos: string | null;
    evidencias: string;
    createdAt: string;
}

export default function LaudoForensePage() {
    const [laudos, setLaudos] = useState<Laudo[]>([]);
    const [vaultFiles, setVaultFiles] = useState<Record<string, { name: string; files: Evidencia[] }>>({});
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedLaudo, setSelectedLaudo] = useState<Laudo | null>(null);

    // Form state
    const [titulo, setTitulo] = useState("");
    const [numeroCaso, setNumeroCaso] = useState("");
    const [quesitos, setQuesitos] = useState("");
    const [selectedEvidencias, setSelectedEvidencias] = useState<Evidencia[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    const [saving, setSaving] = useState(false);
    const [generatingAI, setGeneratingAI] = useState<string | null>(null);
    const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        fetchLaudos();
        fetchVault();
    }, []);

    async function fetchLaudos() {
        setLoading(true);
        const res = await fetch("/api/admin/laudo-forense");
        const data = await res.json();
        setLaudos(data.laudos || []);
        setLoading(false);
    }

    async function fetchVault() {
        const res = await fetch("/api/vault/browse");
        const data = await res.json();
        setVaultFiles(data);
    }

    function toggleEvidence(file: Evidencia, folder: string) {
        const ev = { ...file, folder };
        const exists = selectedEvidencias.find(e => e.path === file.path);
        if (exists) {
            setSelectedEvidencias(selectedEvidencias.filter(e => e.path !== file.path));
        } else {
            setSelectedEvidencias([...selectedEvidencias, ev]);
        }
    }

    async function createLaudo() {
        if (!titulo.trim()) { setMsg("Título obrigatório."); return; }
        setSaving(true);
        setMsg("");
        const res = await fetch("/api/admin/laudo-forense", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "create",
                titulo,
                numeroCaso,
                quesitos,
                evidencias: selectedEvidencias,
            }),
        });
        const data = await res.json();
        if (data.ok) {
            setMsg("Laudo criado com sucesso!");
            setShowForm(false);
            setTitulo(""); setNumeroCaso(""); setQuesitos(""); setSelectedEvidencias([]);
            fetchLaudos();
        } else {
            setMsg(data.error || "Erro ao criar laudo.");
        }
        setSaving(false);
    }

    async function generateAI(id: string) {
        setGeneratingAI(id);
        setMsg("");
        const res = await fetch("/api/admin/laudo-forense", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "generate_ai", id }),
        });
        const data = await res.json();
        if (data.ok) {
            setMsg("IA gerou o laudo com sucesso!");
            setLaudos(prev => prev.map(l => l.id === id ? data.laudo : l));
            if (selectedLaudo?.id === id) setSelectedLaudo(data.laudo);
        } else {
            setMsg(data.error || "Erro ao gerar com IA.");
        }
        setGeneratingAI(null);
    }

    async function generatePDF(id: string) {
        setGeneratingPDF(id);
        setMsg("");
        const res = await fetch("/api/admin/laudo-forense", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "generate_pdf", id }),
        });
        const data = await res.json();
        if (data.ok) {
            setMsg(`PDF gerado: ${data.pdfFile}`);
            setLaudos(prev => prev.map(l => l.id === id ? data.laudo : l));
        } else {
            setMsg(data.error || "Erro ao gerar PDF.");
        }
        setGeneratingPDF(null);
    }

    async function deleteLaudo(id: string) {
        if (!confirm("Deletar este laudo?")) return;
        await fetch("/api/admin/laudo-forense", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id }),
        });
        setLaudos(prev => prev.filter(l => l.id !== id));
        if (selectedLaudo?.id === id) setSelectedLaudo(null);
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#bc13fe]/20 rounded-xl flex items-center justify-center border border-[#bc13fe]/40">
                        <FileText className="w-5 h-5 text-[#bc13fe]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Laudo Pericial Digital</h1>
                        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">IA Generativa · Redação técnico-jurídica automatizada · PDF certificado</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#bc13fe]/20 border border-[#bc13fe]/50 text-[#bc13fe] rounded-lg hover:bg-[#bc13fe]/30 transition-all text-sm font-bold"
                >
                    <Plus className="w-4 h-4" /> Novo Laudo
                </button>
            </div>

            {msg && (
                <div className={`px-4 py-3 rounded-lg border text-sm font-mono ${msg.includes("Erro") || msg.includes("obrigatório") ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"}`}>
                    {msg}
                </div>
            )}

            {/* Formulário de novo laudo */}
            {showForm && (
                <div className="bg-gray-900/60 border border-[#bc13fe]/30 rounded-xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-[#bc13fe] uppercase tracking-widest">Novo Laudo Forense</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Título *</label>
                            <input
                                value={titulo}
                                onChange={e => setTitulo(e.target.value)}
                                placeholder="Ex: Análise de dispositivo — Caso 2026/001"
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#bc13fe] font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Número do Caso</label>
                            <input
                                value={numeroCaso}
                                onChange={e => setNumeroCaso(e.target.value)}
                                placeholder="Ex: 2026.001.NCFN"
                                className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#bc13fe] font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Quesitos (Perguntas a responder)</label>
                        <textarea
                            value={quesitos}
                            onChange={e => setQuesitos(e.target.value)}
                            rows={3}
                            placeholder="Ex: 1. O dispositivo foi acessado remotamente? 2. Há evidências de exclusão de arquivos?"
                            className="w-full bg-black border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#bc13fe] font-mono resize-none"
                        />
                    </div>

                    {/* Seletor de evidências */}
                    <div>
                        <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                            Evidências do Vault ({selectedEvidencias.length} selecionadas)
                        </label>
                        <div className="border border-gray-800 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                            {Object.entries(vaultFiles).map(([folderName, folderData]) => (
                                <div key={folderName}>
                                    <button
                                        onClick={() => setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))}
                                        className="w-full flex items-center justify-between px-4 py-2 bg-gray-900 hover:bg-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800"
                                    >
                                        <span>{folderName} ({folderData.files.length} arquivos)</span>
                                        {expandedFolders[folderName] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                    {expandedFolders[folderName] && folderData.files.map(file => (
                                        <label key={file.path} className="flex items-center gap-3 px-4 py-1.5 hover:bg-gray-900/50 cursor-pointer border-b border-gray-800/50">
                                            <input
                                                type="checkbox"
                                                checked={!!selectedEvidencias.find(e => e.path === file.path)}
                                                onChange={() => toggleEvidence(file, folderName)}
                                                className="accent-[#bc13fe]"
                                            />
                                            <span className="text-xs text-gray-300 font-mono">{file.name}</span>
                                            <span className="text-[10px] text-gray-600 ml-auto">{file.type}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={createLaudo}
                            disabled={saving}
                            className="px-6 py-2 bg-[#bc13fe] text-white text-sm font-black rounded-lg hover:bg-[#bc13fe]/80 transition-all disabled:opacity-50"
                        >
                            {saving ? "Salvando..." : "Criar Rascunho"}
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

            {/* Layout principal: lista + preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lista de laudos */}
                <div className="space-y-3">
                    <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                        {laudos.length} Laudo{laudos.length !== 1 ? "s" : ""}
                    </h2>
                    {loading ? (
                        <div className="text-center py-12 text-gray-600 font-mono text-sm">Carregando...</div>
                    ) : laudos.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl text-gray-600 text-sm">
                            Nenhum laudo criado ainda.
                        </div>
                    ) : (
                        laudos.map(laudo => (
                            <div
                                key={laudo.id}
                                className={`bg-gray-900/40 border rounded-xl p-4 cursor-pointer transition-all ${selectedLaudo?.id === laudo.id ? "border-[#bc13fe]/60 bg-[#bc13fe]/5" : "border-gray-800 hover:border-gray-700"}`}
                                onClick={() => setSelectedLaudo(laudo)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${laudo.status === "final" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                                                {laudo.status === "final" ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <Clock className="w-3 h-3 inline mr-1" />}
                                                {laudo.status}
                                            </span>
                                            {laudo.numeroCaso && <span className="text-[10px] text-gray-600 font-mono">{laudo.numeroCaso}</span>}
                                        </div>
                                        <h3 className="text-sm font-bold text-white mt-1 truncate">{laudo.titulo}</h3>
                                        <p className="text-[10px] text-gray-600 font-mono mt-1">
                                            {new Date(laudo.createdAt).toLocaleString("pt-BR")} · {laudo.operatorEmail}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); generateAI(laudo.id); }}
                                            disabled={generatingAI === laudo.id}
                                            title="Gerar com IA"
                                            className="p-1.5 rounded-lg bg-[#bc13fe]/10 border border-[#bc13fe]/30 text-[#bc13fe] hover:bg-[#bc13fe]/20 transition-all disabled:opacity-40"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); generatePDF(laudo.id); }}
                                            disabled={generatingPDF === laudo.id || !laudo.metodologia}
                                            title="Gerar PDF"
                                            className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); deleteLaudo(laudo.id); }}
                                            title="Deletar"
                                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Loading indicators */}
                                {generatingAI === laudo.id && (
                                    <div className="mt-2 text-[10px] text-[#bc13fe] font-mono animate-pulse">
                                        ⚡ Gerando laudo com IA... (pode levar 1-3 min)
                                    </div>
                                )}
                                {generatingPDF === laudo.id && (
                                    <div className="mt-2 text-[10px] text-emerald-400 font-mono animate-pulse">
                                        📄 Gerando PDF...
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Painel de preview */}
                <div className="lg:sticky lg:top-4">
                    {selectedLaudo ? (
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-black text-white uppercase">{selectedLaudo.titulo}</h2>
                                <button onClick={() => setSelectedLaudo(null)} className="text-gray-600 hover:text-gray-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {selectedLaudo.pdfFile && (
                                <a
                                    href={`/api/vault/file?path=${encodeURIComponent(selectedLaudo.pdfFile)}`}
                                    target="_blank"
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" /> Baixar PDF Final
                                </a>
                            )}

                            {[
                                { label: "Metodologia", value: selectedLaudo.metodologia },
                                { label: "Achados Forenses", value: selectedLaudo.achados },
                                { label: "Conclusão", value: selectedLaudo.conclusao },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <h3 className="text-[10px] font-black text-[#bc13fe] uppercase tracking-widest mb-1">{label}</h3>
                                    {value ? (
                                        <p className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{value}</p>
                                    ) : (
                                        <p className="text-xs text-gray-600 italic">Não gerado — clique em ⚡ para gerar com IA</p>
                                    )}
                                </div>
                            ))}

                            <div>
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Evidências</h3>
                                {(() => {
                                    try {
                                        const evs = JSON.parse(selectedLaudo.evidencias);
                                        return evs.length > 0 ? (
                                            <ul className="space-y-1">
                                                {evs.map((ev: any, i: number) => (
                                                    <li key={i} className="text-[10px] text-gray-500 font-mono">
                                                        • {ev.name || ev.filename} <span className="text-gray-700">({ev.folder})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-xs text-gray-600 italic">Nenhuma evidência selecionada.</p>;
                                    } catch { return null; }
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-gray-800 rounded-xl text-gray-700">
                            <Eye className="w-8 h-8 mb-2" />
                            <p className="text-sm">Selecione um laudo para ver detalhes</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
