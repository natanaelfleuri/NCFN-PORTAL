"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Cloud, Mail, RefreshCw, CheckCircle, XCircle,
  Upload, Download, FolderOpen, FileText, Trash2, Eye,
  AlertTriangle, ExternalLink, Loader2, Send, Settings,
  Database, Shield, Zap, HardDrive, Clock, Plus, X,
} from "lucide-react";

interface NcFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: "file" | "dir";
}

interface PingStatus {
  nextcloud: { ok: boolean; user?: string; version?: string };
  mail: { ok: boolean; backend: string; detail?: string };
}

function fmtBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024;
  const s = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}
function fmtDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("pt-BR"); } catch { return s; }
}

const NCFN_DIRS = [
  "NCFN-NextCloud",
  "NCFN-NextCloud/Relatórios",
  "NCFN-NextCloud/Laudos",
  "NCFN-NextCloud/Notas",
  "NCFN-NextCloud/Evidências",
  "NCFN-NextCloud/Backups",
];

export default function UtilidadesPage() {
  const [tab, setTab] = useState<"painel" | "arquivos" | "sync" | "config">("painel");
  const [ping, setPing] = useState<PingStatus | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState("NCFN-NextCloud");
  const [files, setFiles] = useState<NcFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<"push" | "pull" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [mkdir, setMkdir] = useState("");

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const addLog = (msg: string) => setSyncLog(prev => [...prev, `[${new Date().toLocaleTimeString("pt-BR")}] ${msg}`]);

  /* ── Ping ── */
  const doPing = useCallback(async () => {
    setPingLoading(true);
    try {
      const res = await fetch("/api/nextcloud?action=ping");
      if (res.ok) setPing(await res.json());
      else showToast("err", "Erro ao verificar status");
    } finally { setPingLoading(false); }
  }, []);

  useEffect(() => { doPing(); }, [doPing]);

  /* ── List files ── */
  const listFiles = useCallback(async (path = currentPath) => {
    setFilesLoading(true);
    try {
      const res = await fetch(`/api/nextcloud?action=list&path=${encodeURIComponent(path)}`);
      if (res.ok) { const d = await res.json(); setFiles(d.items ?? []); }
      else showToast("err", "Erro ao listar arquivos");
    } finally { setFilesLoading(false); }
  }, [currentPath]);

  useEffect(() => {
    if (tab === "arquivos") listFiles(currentPath);
  }, [tab, currentPath, listFiles]);

  /* ── Sync ── */
  const doSync = async (action: "sync-notes-push" | "sync-notes-pull") => {
    const dir = action === "sync-notes-push" ? "push" : "pull";
    setSyncing(dir as any);
    addLog(`Iniciando ${dir === "push" ? "Push (local → Nextcloud)" : "Pull (Nextcloud → local)"}...`);
    try {
      const res = await fetch("/api/nextcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (d.ok) {
        addLog(`✓ ${dir === "push" ? `${d.pushed}/${d.total} notas enviadas` : `${d.pulled}/${d.total} notas recebidas`}`);
        showToast("ok", `Sync ${dir} concluído`);
      } else {
        addLog(`✗ Erro: ${d.error ?? "falha desconhecida"}`);
        showToast("err", "Erro no sync");
      }
    } catch (e: any) {
      addLog(`✗ ${e?.message ?? "Erro de rede"}`);
      showToast("err", "Erro de rede");
    } finally { setSyncing(null); }
  };

  /* ── Create dirs ── */
  const createDirs = async () => {
    setSyncing("push");
    addLog("Criando estrutura de diretórios no Nextcloud...");
    for (const dir of NCFN_DIRS) {
      const res = await fetch("/api/nextcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mkdir", path: dir }),
      });
      const d = await res.json();
      addLog(`${d.ok ? "✓" : "✗"} ${dir}`);
    }
    addLog("Estrutura criada.");
    setSyncing(null);
    showToast("ok", "Diretórios criados no Nextcloud");
  };

  /* ── Upload file ── */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const remotePath = `${currentPath}/${file.name}`;
      const res = await fetch("/api/nextcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload", path: remotePath, base64, mime: file.type }),
      });
      const d = await res.json();
      if (d.ok) { showToast("ok", `Enviado: ${file.name}`); listFiles(currentPath); }
      else showToast("err", "Erro no upload");
    } finally { setUploading(false); e.target.value = ""; }
  };

  /* ── Delete file ── */
  const handleDelete = async (path: string, name: string) => {
    if (!confirm(`Deletar "${name}" do Nextcloud?`)) return;
    const res = await fetch("/api/nextcloud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path }),
    });
    const d = await res.json();
    if (d.ok) { showToast("ok", `Deletado: ${name}`); listFiles(currentPath); }
    else showToast("err", "Erro ao deletar");
  };

  /* ── Test email ── */
  const handleTestEmail = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    try {
      const res = await fetch("/api/nextcloud/test-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const d = await res.json();
      if (d.ok) showToast("ok", `Email enviado para ${testEmail} via ${d.backend}`);
      else showToast("err", `Falha: ${d.error}`);
    } finally { setSendingTest(false); }
  };

  const NC_URL = process.env.NEXT_PUBLIC_NEXTCLOUD_URL ?? "https://cloud.ncfn.net";
  const statusColor = (ok: boolean) => ok ? "#4ade80" : "#ef4444";
  const StatusIcon = ({ ok }: { ok: boolean }) => ok
    ? <CheckCircle className="w-4 h-4" style={{ color: "#4ade80" }} />
    : <XCircle className="w-4 h-4" style={{ color: "#ef4444" }} />;

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-xl border ${toast.type === "ok" ? "bg-[#0d1f1a] border-green-500/40 text-green-400" : "bg-[#1f0d0d] border-red-500/40 text-red-400"}`}>
          {toast.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-white/8 px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-white">Módulo Utilidades</h1>
          <p className="text-[10px] text-gray-500">Nextcloud · SecureMail · Sync de Notas</p>
        </div>
        <a href="https://cloud.ncfn.net" target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-white/12 bg-white/4 hover:bg-white/8 text-gray-300 transition-all">
          <Cloud className="w-3.5 h-3.5 text-[#4ade80]" />
          cloud.ncfn.net
          <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8 px-4 bg-black/40">
        {(["painel","arquivos","sync","config"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 ${tab === t ? "border-[#bc13fe] text-[#bc13fe]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            {t === "painel" ? "Painel" : t === "arquivos" ? "Arquivos NC" : t === "sync" ? "Sync Notas" : "Configurações"}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* ─── PAINEL ─── */}
        {tab === "painel" && (
          <div className="space-y-4">
            {/* Status cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Nextcloud status */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" style={{ color: "#4ade80" }} />
                    <span className="font-bold text-sm">Nextcloud</span>
                  </div>
                  <button onClick={doPing} disabled={pingLoading}
                    className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-gray-500 hover:text-white">
                    <RefreshCw className={`w-3.5 h-3.5 ${pingLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                {ping ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon ok={ping.nextcloud.ok} />
                      <span className="text-sm" style={{ color: statusColor(ping.nextcloud.ok) }}>
                        {ping.nextcloud.ok ? "Online" : "Offline"}
                      </span>
                    </div>
                    {ping.nextcloud.user && (
                      <p className="text-xs text-gray-500">Usuário: <span className="text-gray-300">{ping.nextcloud.user}</span></p>
                    )}
                    <a href="https://cloud.ncfn.net" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#4ade80] hover:underline">
                      Abrir cloud.ncfn.net <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                  </div>
                )}
              </div>

              {/* SecureMail status */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5" style={{ color: "#a78bfa" }} />
                  <span className="font-bold text-sm">SecureMail</span>
                </div>
                {ping ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon ok={ping.mail.ok} />
                      <span className="text-sm" style={{ color: statusColor(ping.mail.ok) }}>
                        {ping.mail.ok ? "Online" : "Offline"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Backend: <span className="text-gray-300 font-mono">{ping.mail.backend}</span>
                    </p>
                    {ping.mail.detail && (
                      <p className="text-xs text-gray-600">{ping.mail.detail}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <h3 className="text-sm font-bold mb-4 text-gray-300">Ações Rápidas</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={createDirs}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#4ade80]/25 bg-[#4ade80]/8 text-[#4ade80] hover:bg-[#4ade80]/14 transition-all">
                  <FolderOpen className="w-4 h-4" /> Criar estrutura NC
                </button>
                <button onClick={() => doSync("sync-notes-push")} disabled={!!syncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#a78bfa]/25 bg-[#a78bfa]/8 text-[#a78bfa] hover:bg-[#a78bfa]/14 transition-all disabled:opacity-40">
                  <Upload className="w-4 h-4" /> Push Notas → NC
                </button>
                <button onClick={() => doSync("sync-notes-pull")} disabled={!!syncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#00f3ff]/25 bg-[#00f3ff]/8 text-[#00f3ff] hover:bg-[#00f3ff]/14 transition-all disabled:opacity-40">
                  <Download className="w-4 h-4" /> Pull NC → Notas
                </button>
                <button onClick={() => setTab("arquivos")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-white/12 bg-white/4 text-gray-300 hover:bg-white/8 transition-all">
                  <Eye className="w-4 h-4" /> Ver Arquivos
                </button>
              </div>
            </div>

            {/* Info boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: HardDrive, color: "#4ade80", title: "Estrutura NC", lines: NCFN_DIRS.map(d => d.replace("NCFN-NextCloud/","").replace("NCFN-NextCloud","[raiz]")) },
                { icon: Shield,    color: "#bc13fe", title: "PGP / Criptografia", lines: ["ProtonMail Bridge assina", "automaticamente todos", "os emails enviados via SMTP", "com a chave PGP da conta"] },
                { icon: Zap,       color: "#f59e0b", title: "Triggers automáticos", lines: ["Geração de relatório →", "upload NC + email seguro", "Geração de laudo →", "upload NC + email seguro"] },
              ].map(({ icon: Icon, color, title, lines }) => (
                <div key={title} className="rounded-xl border border-white/8 bg-white/3 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-xs font-bold text-gray-300">{title}</span>
                  </div>
                  {lines.map((l, i) => <p key={i} className="text-[11px] text-gray-600 leading-relaxed">{l}</p>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ARQUIVOS NC ─── */}
        {tab === "arquivos" && (
          <div className="space-y-4">
            {/* Path nav */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => { setCurrentPath("NCFN-NextCloud"); }}
                className="text-xs text-[#4ade80] hover:underline font-mono">NCFN-NextCloud</button>
              {currentPath !== "NCFN-NextCloud" && currentPath.split("/").slice(1).map((seg, i, arr) => {
                const path = "NCFN-NextCloud/" + arr.slice(0, i + 1).join("/");
                return (
                  <span key={path} className="flex items-center gap-1">
                    <span className="text-gray-600">/</span>
                    <button onClick={() => setCurrentPath(path)} className="text-xs text-[#4ade80] hover:underline font-mono">{seg}</button>
                  </span>
                );
              })}
              <div className="ml-auto flex items-center gap-2">
                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/12 bg-white/4 text-gray-300 hover:bg-white/8 transition-all cursor-pointer ${uploading ? "opacity-40 pointer-events-none" : ""}`}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload
                  <input type="file" className="hidden" onChange={handleUpload} />
                </label>
                <button onClick={() => listFiles(currentPath)} disabled={filesLoading}
                  className="p-1.5 rounded-lg hover:bg-white/8 text-gray-500 hover:text-white transition-all">
                  <RefreshCw className={`w-3.5 h-3.5 ${filesLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* File list */}
            <div className="rounded-xl border border-white/8 overflow-hidden">
              {filesLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-gray-600 text-sm">
                  <Cloud className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Diretório vazio ou Nextcloud não configurado
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Nome</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Tamanho</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">Modificado</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            className="flex items-center gap-2 text-left hover:text-white transition-colors"
                            onClick={() => file.type === "dir" ? setCurrentPath(`${currentPath}/${file.name}`) : undefined}
                          >
                            {file.type === "dir"
                              ? <FolderOpen className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
                              : <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                            <span className="text-gray-300 text-xs font-mono truncate max-w-[200px]">{file.name}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 hidden sm:table-cell font-mono">
                          {file.type === "file" ? fmtBytes(file.size) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell font-mono">
                          {fmtDate(file.modified)}
                        </td>
                        <td className="px-4 py-3">
                          {file.type === "file" && (
                            <div className="flex items-center gap-1">
                              <a href={`/api/nextcloud?action=download&path=${encodeURIComponent(`${currentPath}/${file.name}`)}`}
                                className="p-1 rounded hover:bg-white/8 text-gray-600 hover:text-gray-300 transition-colors"
                                title="Download">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button onClick={() => handleDelete(`${currentPath}/${file.name}`, file.name)}
                                className="p-1 rounded hover:bg-red-500/15 text-gray-600 hover:text-red-400 transition-colors"
                                title="Deletar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── SYNC NOTAS ─── */}
        {tab === "sync" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="rounded-xl border border-[#a78bfa]/25 bg-[#a78bfa]/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-5 h-5 text-[#a78bfa]" />
                  <h3 className="font-bold text-sm text-[#a78bfa]">Push — Local → Nextcloud</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Envia todas as notas do <code className="bg-white/8 px-1 rounded">links-uteis.json</code> para o diretório <code className="bg-white/8 px-1 rounded">NCFN-NextCloud/Notas/</code> como arquivos <code>.md</code> com frontmatter YAML.
                </p>
                <button onClick={() => doSync("sync-notes-push")} disabled={!!syncing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm border border-[#a78bfa]/35 bg-[#a78bfa]/12 text-[#a78bfa] hover:bg-[#a78bfa]/20 transition-all disabled:opacity-40">
                  {syncing === "push" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {syncing === "push" ? "Enviando..." : "Push Notas"}
                </button>
              </div>

              <div className="rounded-xl border border-[#00f3ff]/25 bg-[#00f3ff]/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-5 h-5 text-[#00f3ff]" />
                  <h3 className="font-bold text-sm text-[#00f3ff]">Pull — Nextcloud → Local</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Lê os arquivos <code>.md</code> de <code className="bg-white/8 px-1 rounded">NCFN-NextCloud/Notas/</code> e sincroniza com o <code className="bg-white/8 px-1 rounded">links-uteis.json</code> local. Estratégia: last-write-wins por timestamp.
                </p>
                <button onClick={() => doSync("sync-notes-pull")} disabled={!!syncing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm border border-[#00f3ff]/35 bg-[#00f3ff]/12 text-[#00f3ff] hover:bg-[#00f3ff]/20 transition-all disabled:opacity-40">
                  {syncing === "pull" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {syncing === "pull" ? "Recebendo..." : "Pull Notas"}
                </button>
              </div>
            </div>

            {/* Sync log */}
            <div className="rounded-xl border border-white/8 bg-black/40">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Log de Sync</span>
                <button onClick={() => setSyncLog([])} className="text-xs text-gray-600 hover:text-gray-300 transition-colors">
                  Limpar
                </button>
              </div>
              <div className="p-4 h-48 overflow-y-auto font-mono text-xs text-gray-500 space-y-1">
                {syncLog.length === 0
                  ? <span className="text-gray-700">Nenhuma operação realizada nesta sessão.</span>
                  : syncLog.map((l, i) => <div key={i} className={l.includes("✓") ? "text-[#4ade80]" : l.includes("✗") ? "text-red-400" : "text-gray-500"}>{l}</div>)}
              </div>
            </div>
          </div>
        )}

        {/* ─── CONFIG ─── */}
        {tab === "config" && (
          <div className="space-y-4">
            {/* ENV status */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <h3 className="text-sm font-bold mb-4 text-gray-300 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Variáveis de Ambiente
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {[
                  { key: "NEXTCLOUD_URL",          label: "Nextcloud URL",          required: true  },
                  { key: "NEXTCLOUD_USER",          label: "Nextcloud User",         required: true  },
                  { key: "NEXTCLOUD_APP_PASSWORD",  label: "Nextcloud App Password", required: true  },
                  { key: "BRIDGE_SMTP_HOST",        label: "Bridge SMTP Host",       required: false },
                  { key: "BRIDGE_SMTP_USER",        label: "Bridge SMTP User",       required: false },
                  { key: "BRIDGE_SMTP_PASS",        label: "Bridge SMTP Pass",       required: false },
                  { key: "SMTP_HOST",               label: "SMTP Host (fallback)",   required: false },
                  { key: "SMTP_USER",               label: "SMTP User (fallback)",   required: false },
                  { key: "RESEND_API_KEY",          label: "Resend API Key",         required: false },
                  { key: "BRIDGE_FROM",             label: "From Email",             required: false },
                  { key: "REPORT_RECIPIENT",        label: "Destinatário Relatórios",required: false },
                ].map(({ key, label, required }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{
                      background: required ? "rgba(188,19,254,0.1)" : "rgba(255,255,255,0.05)",
                      color: required ? "#bc13fe" : "#555",
                      border: `1px solid ${required ? "rgba(188,19,254,0.3)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                      {key}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-600">
                Adicionar ao <code className="text-gray-400">.env</code> na raiz do projeto. Ver <code className="text-gray-400">CLAUDE BRAIN/INFRAESTRUTURA.md</code> para detalhes.
              </p>
            </div>

            {/* Test email */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <h3 className="text-sm font-bold mb-4 text-gray-300 flex items-center gap-2">
                <Send className="w-4 h-4" /> Testar Envio de Email
              </h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="destinatario@example.com"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[#a78bfa]/50"
                />
                <button onClick={handleTestEmail} disabled={sendingTest || !testEmail}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#a78bfa]/25 bg-[#a78bfa]/8 text-[#a78bfa] hover:bg-[#a78bfa]/14 transition-all disabled:opacity-40">
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Teste
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Envia um email de teste usando o backend configurado ({ping?.mail.backend ?? "verificando..."}).
              </p>
            </div>

            {/* Bridge setup instructions */}
            <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                <h3 className="text-sm font-bold text-[#f59e0b]">ProtonMail Bridge — Setup</h3>
              </div>
              <div className="space-y-1.5 text-xs text-gray-400 font-mono">
                <p className="text-gray-500 font-sans mb-2">Se optar pelo ProtonMail Bridge, executar uma vez:</p>
                {[
                  "docker compose up -d protonmail-bridge",
                  "docker exec -it ncfn_protonmail_bridge protonmail-bridge --cli",
                  "> login",
                  "[digitar email e senha ProtonMail]",
                  "> info   # copiar SMTP user e pass",
                  "> quit",
                ].map((cmd, i) => (
                  <div key={i} className={`px-3 py-1 rounded ${cmd.startsWith(">") || cmd.startsWith("[") ? "text-[#4ade80] bg-[#4ade80]/5" : "bg-black/30 text-gray-400"}`}>
                    {cmd}
                  </div>
                ))}
                <p className="text-gray-600 font-sans mt-2">Alternativas: SMTP Gmail/Outlook ou Resend (resend.com) — sem instalação local.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
