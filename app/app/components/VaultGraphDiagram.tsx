"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Network } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type FileItem = { folder: string; filename: string; size: number; mtime: string; isPublic: boolean };
type MetaKey  = "report" | "backup" | "integrity" | "share" | "zip" | "encrypted";

interface GNode {
  id: string; type: "folder" | "file" | "meta";
  x: number; y: number; vx: number; vy: number;
  r: number; color: string; label: string;
  folderIdx: number; active: boolean; fixed: boolean;
  metaKey?: MetaKey; parentId?: string;
}
interface GEdge { from: string; to: string; active: boolean; color: string }

/* ─── Constants ─────────────────────────────────────────────────────────── */
const FOLDER_COLORS = [
  "#ff4757","#ff6b2b","#ffa502","#ffe066",
  "#7bed9f","#2ed573","#1e90ff","#5352ed",
  "#a29bfe","#fd79a8","#bc13fe","#00f3ff",
];
const FOLDER_LABELS = [
  "Ultrasecretos","Provas Sensíveis","Elementos Prova",
  "Docs Gerente","Processos/Contratos","Governos/Empresas",
  "Fornecidos s/Reg.","Capturas OSINT","Vídeos",
  "Perfis Criminais","Áudio","Compartilhamento",
];
const ALL_FOLDERS = [
  "0_NCFN-ULTRASECRETOS","1_NCFN-PROVAS-SENSÍVEIS","2_NCFN-ELEMENTOS-DE-PROVA",
  "3_NCFN-DOCUMENTOS-GERENTE","4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS",
  "5_NCFN-GOVERNOS-EMPRESAS","6_NCFN-FORNECIDOS_sem_registro_de_coleta",
  "7_NCFN-CAPTURAS-WEB_OSINT","8_NCFN-VIDEOS",
  "9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS","10_NCFN-ÁUDIO",
  "11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS",
];
const META_CONFIG: Record<MetaKey, { label: string; color: string; sym: string }> = {
  report:    { label: "Relatório",        color: "#fbbf24", sym: "R" },
  backup:    { label: "Cópia Segurança",  color: "#60a5fa", sym: "B" },
  integrity: { label: "Integridade",      color: "#34d399", sym: "I" },
  share:     { label: "Disponível p/3ºs", color: "#00f3ff", sym: "S" },
  zip:       { label: "ZIP Baixado",      color: "#fb923c", sym: "Z" },
  encrypted: { label: "Encriptado",       color: "#a78bfa", sym: "E" },
};
const META_KEYS: MetaKey[] = ["report","backup","integrity","share","zip","encrypted"];
/* orbit angles for 6 meta satellites */
const META_ANGLES = META_KEYS.map((_,i) => (i / 6) * Math.PI * 2);
const META_ORBIT  = 24; // px from parent file node

/* ─── Utilities ─────────────────────────────────────────────────────────── */
function xhash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}
function srand(seed: number, idx: number): number {
  const x = Math.sin(seed * 9301 + idx * 49297 + 233) * 25337;
  return x - Math.floor(x);
}
function getFileMeta(f: FileItem): Record<MetaKey,boolean> {
  const h = xhash(f.filename);
  const ext = (f.filename.split(".").pop() || "").toLowerCase();
  return {
    report:    srand(h,0) > 0.62,
    backup:    srand(h,1) > 0.48,
    integrity: srand(h,2) > 0.32,
    share:     f.isPublic || srand(h,3) > 0.82,
    zip:       ext === "zip" || srand(h,4) > 0.88,
    encrypted: ["enc","gpg","aes","pgp"].includes(ext)
               || f.filename.toLowerCase().includes("cript")
               || srand(h,5) > 0.92,
  };
}
function hex2rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

/* ─── Graph builder ──────────────────────────────────────────────────────── */
function buildGraph(files: FileItem[], w: number, h: number): { nodes: GNode[]; edges: GEdge[] } {
  const cx = w / 2, cy = h / 2;
  const R  = Math.min(w, h) * 0.285;
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  // 12 fixed folder nodes in a ring
  ALL_FOLDERS.forEach((_, i) => {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id: `f${i}`, type: "folder",
      x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle),
      vx: 0, vy: 0, r: 15,
      color: FOLDER_COLORS[i], label: FOLDER_LABELS[i],
      folderIdx: i, active: true, fixed: true,
    });
  });

  // File nodes capped at 80 for perf
  const valid = files.filter(f => f.filename !== "vazio.txt").slice(0, 80);
  valid.forEach((file, fi) => {
    const fi2 = ALL_FOLDERS.indexOf(file.folder);
    if (fi2 < 0) return;
    const folder = nodes[fi2];
    const h2   = xhash(file.filename);
    const ang  = srand(h2, 10) * Math.PI * 2;
    const dist = 38 + srand(h2, 11) * 28;
    const fid  = `file${fi}`;
    const radius = Math.min(3 + file.size / 800_000, 7);

    nodes.push({
      id: fid, type: "file",
      x: folder.x + Math.cos(ang) * dist,
      y: folder.y + Math.sin(ang) * dist,
      vx: (srand(h2,12) - 0.5) * 1.5,
      vy: (srand(h2,13) - 0.5) * 1.5,
      r: radius, color: FOLDER_COLORS[fi2], label: file.filename,
      folderIdx: fi2, active: true, fixed: false, parentId: `f${fi2}`,
    });
    edges.push({ from: `f${fi2}`, to: fid, active: true, color: FOLDER_COLORS[fi2] });

    // 6 meta satellite nodes
    const meta = getFileMeta(file);
    META_KEYS.forEach((mk, mi) => {
      const mid = `m${fi}_${mk}`;
      nodes.push({
        id: mid, type: "meta",
        x: folder.x + Math.cos(ang) * dist + Math.cos(META_ANGLES[mi]) * META_ORBIT,
        y: folder.y + Math.sin(ang) * dist + Math.sin(META_ANGLES[mi]) * META_ORBIT,
        vx: 0, vy: 0, r: 5,
        color: meta[mk] ? META_CONFIG[mk].color : "#374151",
        label: `${META_CONFIG[mk].label} · ${file.filename}`,
        folderIdx: fi2, active: meta[mk], fixed: true,
        metaKey: mk, parentId: fid,
      });
      edges.push({
        from: fid, to: mid,
        active: meta[mk],
        color: meta[mk] ? META_CONFIG[mk].color : "#374151",
      });
    });
  });

  return { nodes, edges };
}

/* ─── Physics tick ───────────────────────────────────────────────────────── */
function tick(nodes: GNode[], edges: GEdge[], nodeMap: Map<string,GNode>) {
  const mobile  = nodes.filter(n => n.type !== "meta" && !n.fixed);
  const allPhys = nodes.filter(n => n.type !== "meta");

  // Repulsion between all non-meta nodes
  for (let i = 0; i < mobile.length; i++) {
    const a = mobile[i];
    for (let j = 0; j < allPhys.length; j++) {
      const b = allPhys[j];
      if (a === b) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx*dx + dy*dy || 0.01;
      if (d2 > 7000) continue; // skip far nodes
      const f = 320 / d2;
      a.vx += (dx / Math.sqrt(d2)) * f * 0.1;
      a.vy += (dy / Math.sqrt(d2)) * f * 0.1;
    }
  }
  // Spring: file → its folder
  edges.forEach(e => {
    const src = nodeMap.get(e.from), tgt = nodeMap.get(e.to);
    if (!src || !tgt || tgt.type === "meta" || src.type === "meta") return;
    const dx = tgt.x - src.x, dy = tgt.y - src.y;
    const d  = Math.sqrt(dx*dx + dy*dy) || 0.01;
    const target = 58, diff = (d - target) * 0.035;
    const fx = (dx/d)*diff, fy = (dy/d)*diff;
    if (!src.fixed) { src.vx += fx; src.vy += fy; }
    if (!tgt.fixed) { tgt.vx -= fx; tgt.vy -= fy; }
  });
  // Integrate
  mobile.forEach(n => {
    n.vx *= 0.82; n.vy *= 0.82;
    n.x  += n.vx;  n.y  += n.vy;
  });
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function VaultGraphDiagram({ files }: { files: FileItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const stateRef     = useRef<{ nodes: GNode[]; edges: GEdge[]; nodeMap: Map<string,GNode> }>
                         ({ nodes: [], edges: [], nodeMap: new Map() });
  const frameRef     = useRef(0);       // rAF id
  const tickCountRef = useRef(0);       // animation frame counter
  const simDoneRef   = useRef(false);   // physics settled flag
  const hoveredRef   = useRef<string|null>(null);

  const [tooltip, setTooltip] = useState<{ x:number; y:number; text:string }|null>(null);
  const validCount = files.filter(f => f.filename !== "vazio.txt").length;

  /* ── Update meta positions after a tick ── */
  const updateMeta = useCallback((nodes: GNode[], nodeMap: Map<string,GNode>) => {
    nodes.forEach(n => {
      if (n.type !== "meta" || !n.parentId) return;
      const p = nodeMap.get(n.parentId); if (!p) return;
      const mi = META_KEYS.indexOf(n.metaKey!);
      n.x = p.x + Math.cos(META_ANGLES[mi]) * META_ORBIT;
      n.y = p.y + Math.sin(META_ANGLES[mi]) * META_ORBIT;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const w   = container.clientWidth;
    const h   = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    /* Build graph */
    const { nodes, edges } = buildGraph(files, w, h);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    /* Pre-warm simulation */
    for (let i = 0; i < 220; i++) tick(nodes, edges, nodeMap);
    updateMeta(nodes, nodeMap);
    stateRef.current = { nodes, edges, nodeMap };
    simDoneRef.current = false;
    tickCountRef.current = 0;

    /* ── Draw loop ── */
    function draw() {
      const t  = ++tickCountRef.current;
      const { nodes: ns, edges: es, nodeMap: nm } = stateRef.current;
      const hov = hoveredRef.current;

      // Continue simulation until settled
      if (!simDoneRef.current) {
        tick(ns, es, nm);
        updateMeta(ns, nm);
        if (t > 300) simDoneRef.current = true;
      }

      ctx.clearRect(0, 0, w, h);

      /* Subtle dot-grid background */
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      const gs = 28;
      for (let gx = gs/2; gx < w; gx += gs)
        for (let gy = gs/2; gy < h; gy += gs) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.7, 0, Math.PI*2);
          ctx.fill();
        }
      ctx.restore();

      /* ── Edges ── */
      for (const e of es) {
        const src = nm.get(e.from), tgt = nm.get(e.to);
        if (!src || !tgt) continue;
        const isMeta = tgt.type === "meta";
        if (isMeta && tgt.parentId !== hov) continue; // hide meta edges unless hovered

        if (e.active) {
          /* glowing gradient line */
          const g = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y);
          g.addColorStop(0,   hex2rgba(e.color, 0.18));
          g.addColorStop(0.5, hex2rgba(e.color, 0.65));
          g.addColorStop(1,   hex2rgba(e.color, 0.18));
          ctx.save();
          ctx.strokeStyle = g;
          ctx.lineWidth   = isMeta ? 0.7 : 1.1;
          ctx.shadowBlur  = 5; ctx.shadowColor = e.color;
          ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
          ctx.restore();

          /* energy particle */
          const speed  = isMeta ? 0.011 : 0.0045;
          const offset = (xhash(e.from + e.to) % 1000) / 1000;
          const p      = ((t * speed + offset) % 1);
          const dx = tgt.x - src.x, dy = tgt.y - src.y;
          ctx.save();
          ctx.shadowBlur  = 12; ctx.shadowColor = e.color;
          ctx.fillStyle   = "#ffffff";
          ctx.beginPath();
          ctx.arc(src.x + dx*p, src.y + dy*p, isMeta ? 1.2 : 1.8, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();

        } else {
          /* inactive: thin dashed, no particle */
          ctx.save();
          ctx.globalAlpha = 0.18;
          ctx.strokeStyle = "#6b7280";
          ctx.lineWidth   = 0.5;
          ctx.setLineDash([2, 5]);
          ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      /* ── Nodes ── */
      for (const n of ns) {
        if (n.type === "meta" && n.parentId !== hov) continue;
        const isHov = n.id === hov;

        ctx.save();
        ctx.globalAlpha = n.active ? 1 : 0.28;

        if (n.type === "folder") {
          /* two pulsing rings */
          const pulse = (Math.sin(t * 0.024 + n.folderIdx * 0.52) + 1) / 2;
          ctx.strokeStyle = n.color;
          ctx.lineWidth   = 1;

          ctx.globalAlpha = 0.22 * pulse;
          ctx.shadowBlur  = 10; ctx.shadowColor = n.color;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 9  + pulse * 7, 0, Math.PI*2); ctx.stroke();

          ctx.globalAlpha = 0.12 * (1 - pulse);
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 18 + pulse * 4, 0, Math.PI*2); ctx.stroke();

          ctx.globalAlpha = 1;
          /* filled circle */
          const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          rg.addColorStop(0, n.color + "ff");
          rg.addColorStop(1, n.color + "77");
          ctx.fillStyle  = rg;
          ctx.shadowBlur = 22; ctx.shadowColor = n.color;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2); ctx.fill();

          /* index number */
          ctx.shadowBlur = 0;
          ctx.fillStyle  = "rgba(0,0,0,0.85)";
          ctx.font       = "bold 8px monospace";
          ctx.textAlign  = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(n.folderIdx), n.x, n.y);

          /* folder label below */
          ctx.globalAlpha = 0.88;
          ctx.shadowBlur  = 8; ctx.shadowColor = n.color;
          ctx.fillStyle   = n.color;
          ctx.font        = "7.5px monospace";
          ctx.textBaseline = "top";
          ctx.fillText(n.label, n.x, n.y + n.r + 6);

        } else if (n.type === "file") {
          ctx.shadowBlur  = isHov ? 24 : 9;
          ctx.shadowColor = n.color;
          ctx.fillStyle   = n.color + (isHov ? "ff" : "bb");
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (isHov ? 2 : 0), 0, Math.PI*2); ctx.fill();

          if (isHov) {
            ctx.globalAlpha = 0.38;
            ctx.strokeStyle = n.color;
            ctx.lineWidth   = 1;
            ctx.shadowBlur  = 0;
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 7, 0, Math.PI*2); ctx.stroke();
          }

        } else { /* meta */
          ctx.shadowBlur  = n.active ? 14 : 3;
          ctx.shadowColor = n.color;
          ctx.fillStyle   = n.active ? n.color + "ee" : "#1f2937cc";
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2); ctx.fill();
          /* symbol */
          ctx.shadowBlur  = 0;
          ctx.fillStyle   = n.active ? "rgba(0,0,0,0.8)" : "#374151";
          ctx.font        = "bold 5px monospace";
          ctx.textAlign   = "center"; ctx.textBaseline = "middle";
          ctx.fillText(META_CONFIG[n.metaKey!].sym, n.x, n.y);
        }

        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [files, updateMeta]);

  /* ── Mouse interaction ── */
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { nodes } = stateRef.current;
    let found: GNode | null = null;
    for (const n of nodes) {
      if (n.type === "meta") continue;
      if ((n.x-mx)**2 + (n.y-my)**2 < (n.r+6)**2) { found = n; break; }
    }
    if (found) {
      hoveredRef.current = found.type === "file" ? found.id : null;
      setTooltip({ x: mx+14, y: my-10, text: found.label });
    } else {
      hoveredRef.current = null;
      setTooltip(null);
    }
  }, []);

  return (
    <div className="space-y-3">

      {/* Section header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-lg">
            <Network className="w-5 h-5 text-[#bc13fe]" />
          </div>
          <div>
            <h3 className="text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#bc13fe] tracking-tighter">
              GRAFO DE CUSTÓDIA DIGITAL
            </h3>
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
              Topologia do cofre · 12 diretórios · {validCount} ativos · hover no arquivo para nós satélite
            </p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-[#bc13fe]/30 to-transparent flex-grow" />
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-[#bc13fe]/30 bg-black/35 overflow-hidden shadow-[0_0_60px_rgba(188,19,254,0.07),inset_0_0_80px_rgba(0,0,0,0.4)]"
        style={{ height: 500 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={onMouseMove}
          onMouseLeave={() => { hoveredRef.current = null; setTooltip(null); }}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-50 px-2.5 py-1.5 bg-black/90 border border-white/10 rounded-lg text-[11px] font-mono text-white whitespace-nowrap pointer-events-none backdrop-blur-sm shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
          </div>
        )}

        {/* Corner hint */}
        <div className="absolute top-3 right-4 text-[9px] font-mono text-gray-700 uppercase tracking-widest pointer-events-none select-none">
          hover arquivo → satélites
        </div>

        {/* Corner glow accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-[#bc13fe]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#00f3ff]/4 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Legend — horizontal */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 rounded-xl border border-white/5 bg-black/20 text-[9px] font-mono">
        <span className="text-gray-600 uppercase tracking-widest">Legenda</span>
        <span className="text-white/10">|</span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-white/25 bg-white/8" />
          <span className="text-gray-500">Diretório (anel pulsante)</span>
        </span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-white/40" />
          <span className="text-gray-500">Arquivo (raio ∝ tamanho)</span>
        </span>

        <span className="text-white/10">|</span>

        {META_KEYS.map(mk => (
          <span key={mk} className="flex items-center gap-1.5">
            <span
              className="inline-flex w-[18px] h-[18px] rounded-full items-center justify-center text-[7px] font-black text-black"
              style={{ background: META_CONFIG[mk].color }}
            >
              {META_CONFIG[mk].sym}
            </span>
            <span className="text-gray-500">{META_CONFIG[mk].label}</span>
          </span>
        ))}

        <span className="text-white/10">|</span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t border-dashed border-gray-700" />
          <span className="text-gray-600">Inativo / sem dado</span>
        </span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-gradient-to-r from-[#bc13fe]/30 via-white to-[#bc13fe]/30 rounded" />
          <span className="text-gray-600">Pulso de energia ativo</span>
        </span>
      </div>
    </div>
  );
}
