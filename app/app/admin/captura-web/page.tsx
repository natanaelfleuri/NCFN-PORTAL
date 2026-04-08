"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Camera, FileText, Globe, Loader2, CheckCircle, AlertTriangle,
  Download, Eye, ExternalLink, Wifi, Shield, Clock, Server,
  Hash, Link2, Archive, MapPin, Zap, RefreshCw, X, Code,
  Search, ChevronDown, ChevronRight, Lock, Unlock, Activity,
  Database, Monitor, Radio, AlertCircle, Info, Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Capture = {
  id: string;
  url: string;
  profile: "rapida" | "completa";
  status: "processing" | "done" | "error";
  operatorEmail?: string;
  serverIp?: string;
  serverLocation?: string;
  sslIssuer?: string;
  sslExpiry?: string;
  sslFingerprint?: string;
  whoisData?: string;
  httpHeaders?: string;
  hashScreenshot?: string;
  hashPdf?: string;
  hashHtml?: string;
  screenshotFile?: string;
  pdfFile?: string;
  htmlFile?: string;
  certidaoPdf?: string;
  webCheckData?: string;
  createdAt: string;
  errorMessage?: string;
  waybackUrl?: string;
  blockchainVerify?: string;
  blockchainTx?: string;
  pingMs?: number;
  siteStatus?: number;
  rfcTimestamp?: string;
};

type Tab = "geral" | "status" | "fonte" | "osint" | "evidencias";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vaultViewUrl(filePath: string) {
  return `/api/vault/view?path=${encodeURIComponent(filePath)}`;
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

function truncate(s: string, n = 60) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─── Source Code Highlighter ──────────────────────────────────────────────────

type LineCategory =
  | "comment" | "script" | "style" | "meta" | "link"
  | "form" | "security" | "anchor" | "default";

const LINE_COLORS: Record<LineCategory, { bg: string; text: string; label: string; dot: string }> = {
  comment:  { bg: "bg-white/5",      text: "text-white/35",  label: "Comentários HTML",     dot: "bg-white/30" },
  script:   { bg: "bg-red-900/30",   text: "text-red-300",   label: "JavaScript / <script>", dot: "bg-red-400" },
  style:    { bg: "bg-blue-900/25",  text: "text-blue-300",  label: "CSS / <style>",         dot: "bg-blue-400" },
  meta:     { bg: "bg-yellow-900/25",text: "text-yellow-300",label: "Metadados <meta>",      dot: "bg-yellow-400" },
  link:     { bg: "bg-sky-900/25",   text: "text-sky-300",   label: "Links <link>",          dot: "bg-sky-400" },
  form:     { bg: "bg-purple-900/25",text: "text-purple-300",label: "Formulários / Inputs",  dot: "bg-purple-400" },
  security: { bg: "bg-emerald-900/25",text: "text-emerald-300",label: "Segurança / CSP",     dot: "bg-emerald-400" },
  anchor:   { bg: "bg-cyan-900/20",  text: "text-cyan-300",  label: "Links <a href>",        dot: "bg-cyan-400" },
  default:  { bg: "",                text: "text-white/60",  label: "HTML geral",             dot: "bg-white/20" },
};

function categorizeLine(line: string): LineCategory {
  const t = line.trim();
  if (!t) return "default";
  if (/<!--/.test(t)) return "comment";
  if (/<script[\s>]/i.test(t) || /<\/script>/i.test(t)) return "script";
  if (/<style[\s>]/i.test(t) || /<\/style>/i.test(t)) return "style";
  if (/<meta[\s/]/i.test(t)) {
    if (/content-security-policy|x-frame-options|referrer-policy|x-content-type/i.test(t)) return "security";
    return "meta";
  }
  if (/<link[\s/]/i.test(t)) return "link";
  if (/<(?:form|input|select|textarea|button)[\s/>]/i.test(t)) return "form";
  if (/content-security-policy|x-frame-options|strict-transport-security|referrer-policy/i.test(t)) return "security";
  if (/<a\s/i.test(t) || /href=["']/i.test(t)) return "anchor";
  return "default";
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Capture["status"] }) {
  if (status === "done")
    return <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold"><CheckCircle size={11} /> Concluída</span>;
  if (status === "error")
    return <span className="flex items-center gap-1 text-xs text-red-400 font-semibold"><AlertTriangle size={11} /> Erro</span>;
  return <span className="flex items-center gap-1 text-xs text-yellow-400 font-semibold"><Loader2 size={11} className="animate-spin" /> Processando</span>;
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, mono, color }: {
  icon: any; label: string; value: string; mono?: boolean;
  color?: "emerald" | "red" | "yellow" | "cyan";
}) {
  const tc = color === "emerald" ? "text-emerald-400"
    : color === "red" ? "text-red-400"
    : color === "yellow" ? "text-yellow-400"
    : color === "cyan" ? "text-cyan-400"
    : "text-white/80";
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className="text-white/25 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
        <p className={`text-xs break-all ${tc} ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── SourceCodeViewer ─────────────────────────────────────────────────────────

function SourceCodeViewer({ cap }: { cap: Capture }) {
  const [lines, setLines] = useState<{ text: string; cat: LineCategory }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LineCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function loadSource() {
    if (loaded) return;
    if (!cap.htmlFile) { setError("HTML não disponível para esta captura."); return; }
    setLoading(true);
    try {
      const res = await fetch(vaultViewUrl(cap.htmlFile));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = text.split("\n").slice(0, 2000).map(l => ({
        text: l,
        cat: categorizeLine(l),
      }));
      setLines(parsed);
      setLoaded(true);
    } catch (e: any) {
      setError(e.message || "Falha ao carregar código fonte");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSource(); }, [cap.htmlFile]);

  const filtered = lines.filter(l => {
    if (filter !== "all" && l.cat !== filter) return false;
    if (search && !l.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categoryCounts = lines.reduce((acc, l) => {
    acc[l.cat] = (acc[l.cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-3">
      {/* Legenda */}
      <div className="border border-white/8 rounded-xl bg-black/20 p-3">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Layers size={10} /> Legenda de Cores
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(LINE_COLORS) as [LineCategory, typeof LINE_COLORS[LineCategory]][])
            .filter(([k]) => k !== "default")
            .map(([key, val]) => (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] border transition-all
                  ${filter === key
                    ? "border-white/30 bg-white/10"
                    : "border-white/8 hover:border-white/20"}`}
              >
                <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                <span className={val.text}>{val.label}</span>
                {categoryCounts[key] > 0 && (
                  <span className="text-white/25">({categoryCounts[key]})</span>
                )}
              </button>
            ))}
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] border transition-all
              ${filter === "all" ? "border-white/30 bg-white/10" : "border-white/8 hover:border-white/20"}`}
          >
            <span className="text-white/50">Tudo ({lines.length})</span>
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar no código fonte…"
          className="w-full bg-black/40 border border-white/8 rounded-xl pl-8 pr-4 py-2 text-xs
            text-white placeholder-white/20 font-mono focus:outline-none focus:border-[#00f3ff]/40"
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">
            {filtered.length} linhas
          </span>
        )}
      </div>

      {/* Código */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-white/30">
          <Loader2 size={18} className="animate-spin mr-2" /> Carregando código fonte…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-400 text-xs py-4 px-3 bg-red-900/10 rounded-xl border border-red-500/20">
          <AlertTriangle size={14} /> {error}
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden bg-black/30">
          <div className="overflow-auto max-h-[500px] text-[10px] font-mono">
            {filtered.slice(0, 1500).map((l, i) => {
              const col = LINE_COLORS[l.cat];
              return (
                <div
                  key={i}
                  className={`flex ${col.bg} border-b border-white/3`}
                >
                  <span className="select-none text-white/15 px-2 py-0.5 min-w-[3rem] text-right border-r border-white/5">
                    {i + 1}
                  </span>
                  <span className={`px-2 py-0.5 break-all ${col.text} whitespace-pre-wrap`}>
                    {l.text || " "}
                  </span>
                </div>
              );
            })}
            {filtered.length > 1500 && (
              <div className="px-4 py-2 text-white/25 text-[10px]">
                … {filtered.length - 1500} linhas adicionais (use o filtro para navegar)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OSINTPanel ───────────────────────────────────────────────────────────────

function OSINTPanel({ cap }: { cap: Capture }) {
  const [open, setOpen] = useState<string[]>(["ip", "dns"]);

  if (!cap.webCheckData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-white/25 text-sm">
        <Database size={28} className="mb-2 opacity-40" />
        Dados OSINT disponíveis apenas na captura perfil Completa.
      </div>
    );
  }

  let wc: any = {};
  try { wc = JSON.parse(cap.webCheckData); } catch {}

  function toggle(key: string) {
    setOpen(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) {
    const isOpen = open.includes(id);
    return (
      <div className="border border-white/8 rounded-xl overflow-hidden">
        <button
          onClick={() => toggle(id)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors"
        >
          <Icon size={13} className="text-[#bc13fe]/70" />
          <span className="text-xs font-semibold text-white/80 flex-1 text-left">{title}</span>
          {isOpen ? <ChevronDown size={12} className="text-white/30" /> : <ChevronRight size={12} className="text-white/30" />}
        </button>
        {isOpen && <div className="px-4 py-3 bg-black/20 text-xs font-mono space-y-1">{children}</div>}
      </div>
    );
  }

  function KV({ k, v, color }: { k: string; v: string; color?: string }) {
    return (
      <div className="flex gap-2 flex-wrap">
        <span className="text-white/35 shrink-0">{k}:</span>
        <span className={`break-all ${color || "text-white/70"}`}>{v}</span>
      </div>
    );
  }

  const ip = wc["get-ip"];
  const ssl = wc["ssl"];
  const dns = wc["dns"];
  const headers = wc["headers"];
  const ports = wc["ports"];
  const cookies = wc["cookies"];
  const redirects = wc["redirects"];

  return (
    <div className="space-y-2">
      {ip && (
        <Section id="ip" title="IP / Rede" icon={Server}>
          <KV k="IP" v={ip.ip || "N/A"} color="text-cyan-300" />
          <KV k="Família" v={ip.family === 6 ? "IPv6" : "IPv4"} />
        </Section>
      )}

      {ssl && (
        <Section id="ssl" title="Certificado SSL/TLS" icon={Lock}>
          {ssl.subject?.CN && <KV k="Domínio" v={ssl.subject.CN} color="text-emerald-300" />}
          {ssl.issuer?.O && <KV k="Emissor" v={ssl.issuer.O} />}
          {ssl.valid_to && <KV k="Validade até" v={ssl.valid_to} color={
            new Date(ssl.valid_to) > new Date() ? "text-emerald-300" : "text-red-400"
          } />}
          {ssl.fingerprint256 && <KV k="SHA-256" v={ssl.fingerprint256} />}
          {ssl.nistCurve && <KV k="Curva" v={ssl.nistCurve} />}
        </Section>
      )}

      {dns && (
        <Section id="dns" title="Registros DNS" icon={Radio}>
          {dns.A?.address && <KV k="A" v={dns.A.address} color="text-yellow-300" />}
          {Array.isArray(dns.AAAA) && dns.AAAA.length > 0 && (
            <KV k="AAAA" v={dns.AAAA.slice(0, 3).join(", ")} />
          )}
          {Array.isArray(dns.MX) && dns.MX.length > 0 && (
            <KV k="MX" v={dns.MX.slice(0, 3).map((r: any) => r.exchange || r).join(", ")} />
          )}
          {Array.isArray(dns.NS) && dns.NS.length > 0 && (
            <KV k="NS" v={dns.NS.slice(0, 4).flat().join(", ")} />
          )}
          {Array.isArray(dns.TXT) && dns.TXT.length > 0 && (
            <KV k="TXT" v={dns.TXT.slice(0, 2).map((r: any) => r.value || JSON.stringify(r)).join(" | ")} />
          )}
          {dns.SOA?.nsname && <KV k="SOA" v={`${dns.SOA.nsname} (serial: ${dns.SOA.serial})`} />}
        </Section>
      )}

      {headers && Object.keys(headers).length > 0 && (
        <Section id="headers" title="HTTP Headers" icon={Layers}>
          {Object.entries(headers).slice(0, 20).map(([k, v]) => (
            <KV key={k} k={k} v={String(v).slice(0, 100)}
              color={/security|csp|frame|transport|content-type-options/i.test(k) ? "text-emerald-300" : undefined}
            />
          ))}
        </Section>
      )}

      {ports?.openPorts?.length > 0 && (
        <Section id="ports" title={`Portas Abertas (${ports.openPorts.length})`} icon={Activity}>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ports.openPorts.map((p: number) => (
              <span key={p} className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/20 text-[10px]">
                {p}
              </span>
            ))}
          </div>
        </Section>
      )}

      {cookies && !cookies.skipped && Array.isArray(cookies) && cookies.length > 0 && (
        <Section id="cookies" title={`Cookies (${cookies.length})`} icon={Database}>
          {cookies.slice(0, 10).map((c: any, i: number) => (
            <div key={i} className="flex gap-2 flex-wrap">
              <span className="text-purple-300">{c.name || `cookie_${i}`}</span>
              {c.secure && <span className="text-emerald-300/70">[Secure]</span>}
              {c.httpOnly && <span className="text-yellow-300/70">[HttpOnly]</span>}
              {c.sameSite && <span className="text-white/40">[{c.sameSite}]</span>}
            </div>
          ))}
        </Section>
      )}

      {redirects?.redirects?.length > 0 && (
        <Section id="redirects" title={`Redirecionamentos (${redirects.redirects.length})`} icon={Globe}>
          {redirects.redirects.map((r: any, i: number) => (
            <KV key={i} k={`${i + 1}`} v={r.url || String(r)} color="text-cyan-300" />
          ))}
        </Section>
      )}

      {cap.whoisData && cap.whoisData.length > 10 && (
        <Section id="whois" title="WHOIS" icon={Info}>
          {cap.whoisData.split("\n").slice(0, 25).filter(l => l.trim()).map((l, i) => (
            <div key={i} className="text-white/50 break-all">{l.trim()}</div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ─── EvidencePanel ────────────────────────────────────────────────────────────

function EvidencePanel({ cap }: { cap: Capture }) {
  const baseFolder = `7_NCFN-CAPTURAS-WEB_OSINT/${cap.id}`;

  return (
    <div className="space-y-4">
      {/* Hashes */}
      <div className="border border-white/8 rounded-xl bg-black/20 p-4 space-y-3">
        <p className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <Hash size={10} /> Hashes SHA-256
        </p>
        {[
          { label: "Screenshot PNG", hash: cap.hashScreenshot },
          { label: "PDF Renderizado", hash: cap.hashPdf },
          { label: "HTML / DOM", hash: cap.hashHtml },
        ].filter(h => h.hash).map(({ label, hash }) => (
          <div key={label}>
            <p className="text-[10px] text-white/40 mb-0.5">{label}</p>
            <p className="text-[10px] font-mono text-[#00f3ff]/70 break-all">{hash}</p>
          </div>
        ))}
        {!cap.hashScreenshot && !cap.hashPdf && !cap.hashHtml && (
          <p className="text-xs text-white/25">Hashes não disponíveis.</p>
        )}
      </div>

      {/* RFC 3161 */}
      {cap.rfcTimestamp && (
        <div className="border border-white/8 rounded-xl bg-black/20 p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Clock size={10} /> Carimbo Temporal RFC 3161
          </p>
          <p className="text-[10px] font-mono text-white/60 break-all">{cap.rfcTimestamp}</p>
        </div>
      )}

      {/* Blockchain OTS */}
      {(cap.blockchainTx || cap.blockchainVerify) && (
        <div className="border border-orange-500/20 rounded-xl bg-orange-900/10 p-4">
          <p className="text-[10px] text-orange-400/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Link2 size={10} /> Registro Blockchain — OpenTimestamps (Bitcoin)
          </p>
          {cap.blockchainTx && (
            <div className="mb-2">
              <p className="text-[10px] text-white/30 mb-0.5">Hash registrado:</p>
              <p className="text-[10px] font-mono text-orange-300/70 break-all">{cap.blockchainTx}</p>
            </div>
          )}
          <p className="text-[10px] text-white/40 leading-relaxed">
            O hash foi enviado a 3 calendários Bitcoin da rede OpenTimestamps.
            Após ~1h (próximo bloco minerado), fica ancorado permanentemente na blockchain.
          </p>
          <div className="mt-3 space-y-1.5 text-[10px] text-white/50">
            <p className="text-white/60 font-medium">Como verificar:</p>
            <p>1. Acesse <span className="text-orange-400">opentimestamps.org</span></p>
            <p>2. Carregue o arquivo <code className="text-orange-300">hash.ots</code> disponível nos artefatos</p>
            <p>3. O site exibirá o bloco Bitcoin e data/hora do registro</p>
          </div>
          {cap.blockchainVerify && (
            <a href={cap.blockchainVerify} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-orange-400 hover:text-orange-300 transition-colors">
              <ExternalLink size={10} /> Verificar no OpenTimestamps
            </a>
          )}
        </div>
      )}

      {/* Wayback Machine */}
      {cap.waybackUrl && (
        <div className="border border-yellow-500/20 rounded-xl bg-yellow-900/10 p-4">
          <p className="text-[10px] text-yellow-400/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Archive size={10} /> Wayback Machine — Internet Archive
          </p>
          <p className="text-[10px] font-mono text-yellow-300/70 break-all mb-2">{cap.waybackUrl}</p>
          <a href={cap.waybackUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors">
            <ExternalLink size={10} /> Ver cópia arquivada
          </a>
        </div>
      )}

      {/* Downloads */}
      <div className="border border-white/8 rounded-xl bg-black/20 p-4">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Download size={10} /> Artefatos
        </p>
        <div className="flex flex-wrap gap-2">
          {cap.screenshotFile && (
            <a href={vaultViewUrl(cap.screenshotFile)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400
                text-xs bg-black/20 hover:bg-cyan-500/10 transition-all">
              <Camera size={11} /> Screenshot
            </a>
          )}
          {cap.pdfFile && (
            <a href={vaultViewUrl(cap.pdfFile)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-400
                text-xs bg-black/20 hover:bg-purple-500/10 transition-all">
              <FileText size={11} /> PDF
            </a>
          )}
          {cap.certidaoPdf && (
            <a href={vaultViewUrl(cap.certidaoPdf)} download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400
                text-xs bg-black/20 hover:bg-emerald-500/10 transition-all">
              <Shield size={11} /> Certidão Forense
            </a>
          )}
          <a href={`/api/capture/relatorio`} onClick={async (e) => {
            e.preventDefault();
            const res = await fetch("/api/capture/relatorio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ captureId: cap.id }),
            });
            if (res.ok) {
              const blob = await res.blob();
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `relatorio_sansao_${cap.id.slice(0, 8)}.pdf`;
              link.click();
            }
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#bc13fe]/30 text-[#bc13fe]
              text-xs bg-black/20 hover:bg-[#bc13fe]/10 transition-all cursor-pointer">
            <FileText size={11} /> Relatório Pericial
          </a>
          <a href={vaultViewUrl(`${baseFolder}/hash.ots`)} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-400
              text-xs bg-black/20 hover:bg-orange-500/10 transition-all">
            <Hash size={11} /> hash.ots
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── CaptureDetailCard ────────────────────────────────────────────────────────

function CaptureDetailCard({ cap }: { cap: Capture }) {
  const [tab, setTab] = useState<Tab>("geral");
  const [imgError, setImgError] = useState(false);

  const screenshotUrl = cap.screenshotFile ? vaultViewUrl(cap.screenshotFile) : null;
  const isOnline = (cap.siteStatus ?? 0) > 0 && (cap.siteStatus ?? 0) < 500;

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "geral",     label: "Visão Geral",   icon: Monitor },
    { id: "status",    label: "Status Online",  icon: Activity },
    { id: "fonte",     label: "Código Fonte",   icon: Code },
    { id: "osint",     label: "OSINT",          icon: Database },
    { id: "evidencias",label: "Evidências",     icon: Shield },
  ];

  return (
    <div className="border border-[#bc13fe]/20 rounded-xl bg-black/30 overflow-hidden">
      {/* Status header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-white/2">
        <StatusBadge status={cap.status} />
        {cap.status === "done" && (
          <span className={`flex items-center gap-1 text-[10px] font-semibold ml-2
            ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
            <Radio size={9} className={isOnline ? "text-emerald-400" : "text-red-400"} />
            {isOnline ? "ONLINE" : "OFFLINE"}
            {cap.siteStatus ? ` · HTTP ${cap.siteStatus}` : ""}
          </span>
        )}
        <span className="text-[10px] text-white/25 font-mono ml-auto">{cap.id.slice(0, 16)}…</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium whitespace-nowrap transition-all border-b-2
              ${tab === t.id
                ? "border-[#bc13fe] text-[#bc13fe] bg-[#bc13fe]/5"
                : "border-transparent text-white/35 hover:text-white/60 hover:bg-white/3"}`}
          >
            <t.icon size={11} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ─ Visão Geral ─ */}
        {tab === "geral" && (
          <div className="space-y-4">
            {screenshotUrl && !imgError && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
                  Screenshot Completa
                </p>
                <a href={screenshotUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={screenshotUrl}
                    alt="Screenshot"
                    className="w-full rounded-lg border border-white/10 hover:opacity-90 transition-opacity max-h-[500px] object-top object-cover"
                    onError={() => setImgError(true)}
                  />
                </a>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoRow icon={Globe} label="URL" value={truncate(cap.url, 60)} />
              {cap.serverIp && <InfoRow icon={Server} label="IP do Servidor" value={cap.serverIp} mono />}
              {cap.serverLocation && <InfoRow icon={MapPin} label="Localização" value={cap.serverLocation} />}
              {cap.pingMs !== undefined && cap.pingMs >= 0 && (
                <InfoRow icon={Wifi} label="Latência" value={`${cap.pingMs} ms`} mono
                  color={cap.pingMs < 200 ? "emerald" : cap.pingMs < 500 ? "yellow" : "red"} />
              )}
              {cap.siteStatus !== undefined && (
                <InfoRow icon={Zap} label="HTTP Status" value={String(cap.siteStatus)} mono
                  color={isOnline ? "emerald" : "red"} />
              )}
              {cap.sslIssuer && cap.sslIssuer !== "N/A" && (
                <InfoRow icon={Lock} label="SSL Emissor" value={truncate(cap.sslIssuer, 50)} />
              )}
              {cap.sslExpiry && cap.sslExpiry !== "N/A" && (
                <InfoRow icon={Clock} label="SSL Validade" value={cap.sslExpiry}
                  color={new Date(cap.sslExpiry) > new Date() ? "emerald" : "red"} />
              )}
              <InfoRow icon={Clock} label="Capturado em" value={fmtDate(cap.createdAt)} />
            </div>
            {cap.status === "error" && cap.errorMessage && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-300 font-mono">
                {cap.errorMessage}
              </div>
            )}
          </div>
        )}

        {/* ─ Status Online ─ */}
        {tab === "status" && (
          <div className="space-y-4">
            {/* Badge principal */}
            <div className={`rounded-xl border p-5 flex items-center gap-4
              ${isOnline
                ? "border-emerald-500/30 bg-emerald-900/10"
                : "border-red-500/30 bg-red-900/10"}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center
                ${isOnline ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                {isOnline
                  ? <CheckCircle size={28} className="text-emerald-400" />
                  : <AlertCircle size={28} className="text-red-400" />}
              </div>
              <div>
                <p className={`text-2xl font-bold ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </p>
                <p className="text-xs text-white/40">
                  HTTP {cap.siteStatus || "—"} · Verificado em {fmtDate(cap.createdAt)}
                </p>
              </div>
              {cap.pingMs !== undefined && cap.pingMs >= 0 && (
                <div className="ml-auto text-right">
                  <p className={`text-xl font-bold font-mono
                    ${cap.pingMs < 200 ? "text-emerald-400" : cap.pingMs < 500 ? "text-yellow-400" : "text-red-400"}`}>
                    {cap.pingMs}ms
                  </p>
                  <p className="text-[10px] text-white/30">latência</p>
                </div>
              )}
            </div>

            {/* Detalhes SSL */}
            <div className="border border-white/8 rounded-xl bg-black/20 p-4">
              <p className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-2">
                <Lock size={12} className="text-[#bc13fe]/70" /> Certificado SSL/TLS
              </p>
              <div className="space-y-2">
                {cap.sslIssuer && cap.sslIssuer !== "N/A"
                  ? <>
                      <InfoRow icon={Shield} label="Emissor" value={cap.sslIssuer} />
                      {cap.sslExpiry && <InfoRow icon={Clock} label="Validade até" value={cap.sslExpiry}
                        color={new Date(cap.sslExpiry) > new Date() ? "emerald" : "red"} />}
                      {cap.sslFingerprint && <InfoRow icon={Hash} label="Fingerprint" value={cap.sslFingerprint} mono />}
                    </>
                  : <p className="text-xs text-white/25">SSL não disponível (HTTP ou captura rápida)</p>
                }
              </div>
            </div>

            {/* IP e Localização */}
            <div className="border border-white/8 rounded-xl bg-black/20 p-4">
              <p className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-2">
                <Server size={12} className="text-[#bc13fe]/70" /> Servidor
              </p>
              <div className="space-y-2">
                {cap.serverIp && <InfoRow icon={Server} label="Endereço IP" value={cap.serverIp} mono color="cyan" />}
                {cap.serverLocation && <InfoRow icon={MapPin} label="Geolocalização" value={cap.serverLocation} />}
                <InfoRow icon={Globe} label="URL" value={cap.url} />
              </div>
            </div>
          </div>
        )}

        {/* ─ Código Fonte ─ */}
        {tab === "fonte" && <SourceCodeViewer cap={cap} />}

        {/* ─ OSINT ─ */}
        {tab === "osint" && <OSINTPanel cap={cap} />}

        {/* ─ Evidências ─ */}
        {tab === "evidencias" && <EvidencePanel cap={cap} />}
      </div>
    </div>
  );
}

// ─── CaptureListRow ───────────────────────────────────────────────────────────

function CaptureListRow({ cap, onSelect, selected }: {
  cap: Capture; onSelect: (c: Capture) => void; selected: boolean;
}) {
  const isOnline = (cap.siteStatus ?? 0) > 0 && (cap.siteStatus ?? 0) < 500;
  return (
    <tr
      className={`border-b border-white/5 cursor-pointer transition-colors
        ${selected ? "bg-[#bc13fe]/8" : "hover:bg-white/2"}`}
      onClick={() => onSelect(cap)}
    >
      <td className="px-3 py-2 text-xs text-white/70 font-mono max-w-[220px]">
        <span className="block truncate">{truncate(cap.url, 45)}</span>
      </td>
      <td className="px-3 py-2 text-xs text-white/40 whitespace-nowrap">{fmtDate(cap.createdAt)}</td>
      <td className="px-3 py-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
          ${cap.profile === "completa"
            ? "bg-[#bc13fe]/20 text-[#bc13fe]"
            : "bg-cyan-500/20 text-cyan-400"}`}>
          {cap.profile}
        </span>
      </td>
      <td className="px-3 py-2"><StatusBadge status={cap.status} /></td>
      <td className="px-3 py-2">
        {cap.status === "done" && (
          <span className={`text-[10px] font-semibold ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
            {isOnline ? "●" : "○"} {cap.siteStatus || "—"}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <button
          className="text-[10px] px-2 py-1 rounded border border-white/10 text-white/40
            hover:border-[#00f3ff]/40 hover:text-[#00f3ff] transition-all"
          onClick={e => { e.stopPropagation(); onSelect(cap); }}
        >
          <Eye size={10} className="inline mr-1" />Ver
        </button>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CapturaWebPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [profile, setProfile] = useState<"rapida" | "completa">("completa");
  const [capturing, setCapturing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Capture | null>(null);

  const [previewing, setPreviewing] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") router.push("/admin");
  }, [status, session, router]);

  useEffect(() => { loadCaptures(); }, []);

  useEffect(() => {
    if (capturing) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [capturing]);

  async function loadCaptures() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/capture");
      const data = await res.json();
      if (data.captures) setCaptures(data.captures);
    } catch {}
    finally { setLoadingList(false); }
  }

  async function handlePreview() {
    const trimmed = url.trim();
    if (!trimmed || !trimmed.startsWith("http")) {
      setPreviewError("URL deve começar com http:// ou https://");
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    setPreviewImg(null);
    try {
      const res = await fetch("/api/capture/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setPreviewError(data.error || "Falha no preview");
      } else {
        setPreviewImg(data.preview);
      }
    } catch (e: any) {
      setPreviewError(e.message || "Falha de rede");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCapture() {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setError("URL deve começar com http:// ou https://");
      return;
    }
    setCapturing(true);
    setError(null);
    setResult(null);
    setSelectedCapture(null);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, profile }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Erro desconhecido na captura");
      } else {
        setResult(data.capture);
        setPreviewImg(null);
        await loadCaptures();
      }
    } catch (e: any) {
      setError(e?.message || "Falha de rede ao capturar");
    } finally {
      setCapturing(false);
    }
  }

  function selectCapture(cap: Capture) {
    setSelectedCapture(prev => prev?.id === cap.id ? null : cap);
    setResult(null);
  }

  function captureProgressLabel() {
    if (profile === "rapida") {
      if (elapsed < 8) return "Iniciando browser…";
      if (elapsed < 20) return "Capturando screenshot e HTML…";
      return "Gerando certidão e salvando…";
    } else {
      if (elapsed < 8) return "Iniciando browser Playwright…";
      if (elapsed < 20) return "Capturando screenshot + PDF + HTML…";
      if (elapsed < 35) return "Consultando DNS, WHOIS e SSL…";
      if (elapsed < 50) return "Analisando com Web-Check…";
      if (elapsed < 70) return "Submetendo ao Wayback Machine…";
      if (elapsed < 85) return "Registrando hash no blockchain (OTS)…";
      return "Gerando Certidão Forense e salvando…";
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#bc13fe]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#bc13fe]/20 border border-[#bc13fe]/40 flex items-center justify-center">
            <Camera size={16} className="text-[#bc13fe]" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Captura Web Forense</h1>
        </div>
        <p className="text-xs text-white/40 ml-11">
          Evidências digitais com screenshot, código fonte, OSINT, blockchain e RFC 3161
        </p>
      </div>

      {/* Form */}
      <div className="glass-panel rounded-2xl border border-[#bc13fe]/20 bg-black/40 backdrop-blur-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
          <Globe size={14} className="text-[#00f3ff]" /> Nova Captura
        </h2>

        {/* URL + Preview */}
        <div className="mb-4">
          <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">URL alvo</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !capturing && !previewing && handleCapture()}
              placeholder="https://exemplo.com"
              disabled={capturing || previewing}
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm
                text-white placeholder-white/20 font-mono focus:outline-none focus:border-[#00f3ff]/50
                focus:ring-1 focus:ring-[#00f3ff]/20 disabled:opacity-40 transition-all"
            />
            <button
              onClick={handlePreview}
              disabled={previewing || capturing || !url.trim()}
              title="Preview rápido da página (sem salvar)"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#00f3ff]/30
                text-[#00f3ff] text-sm font-medium bg-[#00f3ff]/5 hover:bg-[#00f3ff]/10
                disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              {previewing ? "Carregando…" : "Preview"}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        {(previewImg || previewError) && (
          <div className="mb-4 border border-[#00f3ff]/20 rounded-xl overflow-hidden bg-black/20">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/2">
              <span className="text-[11px] text-[#00f3ff]/80 flex items-center gap-1.5">
                <Monitor size={11} /> Preview — {truncate(url, 50)}
              </span>
              <button onClick={() => { setPreviewImg(null); setPreviewError(null); }}
                className="text-white/25 hover:text-white/50 transition-colors">
                <X size={12} />
              </button>
            </div>
            {previewError ? (
              <div className="px-4 py-3 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle size={13} /> {previewError}
              </div>
            ) : previewImg ? (
              <div className="overflow-auto max-h-[400px]">
                <img
                  src={`data:image/jpeg;base64,${previewImg}`}
                  alt="Preview"
                  className="w-full object-top"
                />
              </div>
            ) : null}
            {previewImg && (
              <div className="px-3 py-2 border-t border-white/5 bg-white/2">
                <p className="text-[10px] text-white/30">
                  Preview rápido — não armazenado. Use "Capturar" para gerar a evidência forense completa.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Profile toggle */}
        <div className="mb-5">
          <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">Perfil de Captura</label>
          <div className="flex gap-2">
            {(["rapida", "completa"] as const).map(p => {
              const active = profile === p;
              return (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  disabled={capturing}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border
                    text-xs font-medium transition-all disabled:opacity-40
                    ${active
                      ? p === "rapida"
                        ? "border-[#00f3ff]/60 bg-[#00f3ff]/10 text-[#00f3ff]"
                        : "border-[#bc13fe]/60 bg-[#bc13fe]/10 text-[#bc13fe]"
                      : "border-white/10 text-white/40 hover:border-white/20"}`}
                >
                  {p === "rapida" ? <Zap size={16} /> : <Shield size={16} />}
                  <span className="font-semibold capitalize">{p}</span>
                  <span className="text-[10px] opacity-70">
                    {p === "rapida"
                      ? "~30s · screenshot + HTML + hashes"
                      : "~90s · tudo + OSINT + blockchain + Wayback"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 bg-red-900/20 border border-red-500/30
            rounded-xl px-4 py-3 text-xs text-red-300">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Progress */}
        {capturing && (
          <div className="mb-4 border border-yellow-500/20 rounded-xl bg-yellow-500/5 px-4 py-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 size={16} className="animate-spin text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-300">Capturando… {elapsed}s</span>
            </div>
            <p className="text-xs text-white/40 pl-7">{captureProgressLabel()}</p>
            <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-[#bc13fe] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (elapsed / (profile === "rapida" ? 35 : 100)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleCapture}
          disabled={capturing || !url.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl
            font-semibold text-sm transition-all
            bg-gradient-to-r from-[#bc13fe]/80 to-[#00f3ff]/60
            hover:from-[#bc13fe] hover:to-[#00f3ff]
            disabled:opacity-40 disabled:cursor-not-allowed
            border border-[#bc13fe]/40 hover:border-[#bc13fe]/80"
        >
          {capturing
            ? <><Loader2 size={15} className="animate-spin" /> Capturando…</>
            : <><Camera size={15} /> Capturar Evidência Forense</>}
        </button>
      </div>

      {/* Resultado inline */}
      {result && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white/60 mb-2 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" /> Resultado da Captura
          </h2>
          <CaptureDetailCard cap={result} />
        </div>
      )}

      {/* Lista de capturas */}
      <div className="glass-panel rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <Archive size={14} className="text-[#bc13fe]" /> Capturas Anteriores
            {captures.length > 0 && (
              <span className="text-xs bg-[#bc13fe]/20 text-[#bc13fe] px-2 py-0.5 rounded-full">
                {captures.length}
              </span>
            )}
          </h2>
          <button
            onClick={loadCaptures}
            disabled={loadingList}
            className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-30"
            title="Recarregar"
          >
            <RefreshCw size={14} className={loadingList ? "animate-spin" : ""} />
          </button>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-12 text-white/30">
            <Loader2 size={20} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : captures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/20">
            <Camera size={32} className="mb-2 opacity-40" />
            <p className="text-sm">Nenhuma captura ainda</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    {["URL", "Data", "Perfil", "Status", "HTTP", ""].map(h => (
                      <th key={h} className="px-3 py-2 text-[10px] uppercase tracking-widest text-white/25 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {captures.map(cap => (
                    <CaptureListRow
                      key={cap.id}
                      cap={cap}
                      onSelect={selectCapture}
                      selected={selectedCapture?.id === cap.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {selectedCapture && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mt-2 mb-1">
                  <span className="text-xs text-white/30">
                    Detalhes — {truncate(selectedCapture.url, 55)}
                  </span>
                  <button
                    onClick={() => setSelectedCapture(null)}
                    className="text-white/20 hover:text-white/50 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <CaptureDetailCard cap={selectedCapture} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
