"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Plus, Trash2, Eye, EyeOff, Search,
  Target, AlertTriangle, Download, X, Edit3, Crosshair,
  Navigation2, Layers, Lock, Clock, RefreshCw, StickyNote, Flag,
  Ruler, PenLine, ChevronRight, Globe, ZoomIn, Maximize2,
  Radio, Mountain, CheckSquare, FileText, Zap, Shield,
  Users, Cpu, BarChart2, Compass, Route, Info,
} from "lucide-react";
import type { Alvo, Rota, DrawnShape, MapMode, MapaLeafletProps } from "./MapaLeaflet";

/* ── Dynamic import (ssr:false porque Leaflet usa window) ─────────── */
const MapaLeaflet = dynamic<MapaLeafletProps>(
  () => import("./MapaLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[#00f3ff]/60 font-mono text-sm">
        <div className="w-8 h-8 border-2 border-[#00f3ff]/30 border-t-[#00f3ff] rounded-full animate-spin" />
        Inicializando mapa tático...
      </div>
    ),
  }
);

/* ── Constants ────────────────────────────────────────────────────── */
type Priority = "CRÍTICA" | "ALTA" | "MÉDIA" | "BAIXA";
type Status   = "ATIVO" | "MONITORANDO" | "NEUTRALIZADO" | "ARQUIVADO";

const PRIORITY_CONFIG: Record<Priority, { color: string; bg: string; border: string }> = {
  "CRÍTICA": { color: "#ff0040", bg: "rgba(255,0,64,0.08)",   border: "rgba(255,0,64,0.4)"   },
  "ALTA":    { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.4)"  },
  "MÉDIA":   { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.4)" },
  "BAIXA":   { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.4)"  },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  "ATIVO":        { label: "ATIVO",        color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  "MONITORANDO":  { label: "MONITORANDO",  color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  "NEUTRALIZADO": { label: "NEUTRALIZADO", color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  "ARQUIVADO":    { label: "ARQUIVADO",    color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const ROTA_COLORS = ["#f59e0b","#00f3ff","#bc13fe","#22c55e","#ef4444","#3b82f6","#e879f9","#34d399"];
const DRAW_COLORS = ["#bc13fe","#00f3ff","#ef4444","#f97316","#22c55e","#3b82f6","#f59e0b","#e879f9"];

function gerarCodigo() { return "ALV-" + Math.random().toString(36).substring(2, 7).toUpperCase(); }
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180, dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function fmtDist(m: number) {
  return m >= 1000 ? `${(m/1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtArea(m2: number) {
  return m2 >= 1e6 ? `${(m2/1e6).toFixed(3)} km²` : `${Math.round(m2)} m²`;
}

/* ── Operação / missão ────────────────────────────────────────────── */
type OperacaoInfo = {
  nome: string; codigo: string; objetivo: string;
  inicio: string; fim: string; equipe: string; opsec: string;
  briefing: string;
};

/* ── Main page ───────────────────────────────────────────────────── */
export default function RelatoriosPage() {
  /* ── Core state ── */
  const [alvos, setAlvos] = useState<Alvo[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [drawingPoints, setDrawingPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [measureDist, setMeasureDist] = useState<number | null>(null);
  const [geolocLatLng, setGeolocLatLng] = useState<{ lat: number; lng: number } | null>(null);

  /* ── Map mode ── */
  const [mode, setMode] = useState<MapMode>("normal");
  const [rotaAtivaId, setRotaAtivaId] = useState<string | null>(null);
  const [drawTool, setDrawTool] = useState<"polygon"|"circle"|"rectangle"|"polyline">("polygon");
  const [drawColor, setDrawColor] = useState("#bc13fe");
  const [drawOpacity, setDrawOpacity] = useState(0.25);

  /* ── Map settings ── */
  const [imageryType, setImageryType] = useState<"dark"|"satellite"|"hybrid"|"osm">("dark");
  const [proximityAtivo, setProximityAtivo] = useState(false);
  const [proximityRadius, setProximityRadius] = useState(500);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  /* ── UI state ── */
  const [selecionado, setSelecionado] = useState<Alvo | null>(null);
  const [editando, setEditando] = useState(false);
  const [formAlvo, setFormAlvo] = useState<Partial<Alvo>>({});
  const [busca, setBusca] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState<Priority | "TODOS">("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<Status | "TODOS">("TODOS");
  const [painelAberto, setPainelAberto] = useState(true);
  const [tab, setTab] = useState<"alvos"|"rotas"|"desenhos"|"operacao"|"checklist">("alvos");
  const [geocodeBusca, setGeocodeBusca] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<{ display: string; lat: number; lon: number }[]>([]);
  const [geolocLoading, setGeolocLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  /* ── Missão ── */
  const [operacao, setOperacao] = useState<OperacaoInfo>({
    nome: "", codigo: "", objetivo: "", inicio: "", fim: "",
    equipe: "", opsec: "SECRETO", briefing: "",
  });

  /* ── Checklist ── */
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: "1", text: "Verificar conectividade das equipes", done: false },
    { id: "2", text: "Confirmar coordenadas dos alvos", done: false },
    { id: "3", text: "Revisar rotas de entrada/saída", done: false },
    { id: "4", text: "Briefing com equipe de campo", done: false },
    { id: "5", text: "Definir canal de comunicação segura", done: false },
    { id: "6", text: "Acionar protocolo OPSEC", done: false },
  ]);
  const [newCheckItem, setNewCheckItem] = useState("");

  /* ── Persistence ── */
  useEffect(() => {
    try {
      const a = localStorage.getItem("ncfn_alvos_mapa"); if (a) setAlvos(JSON.parse(a));
      const r = localStorage.getItem("ncfn_rotas_mapa"); if (r) setRotas(JSON.parse(r));
      const s = localStorage.getItem("ncfn_shapes_mapa"); if (s) setShapes(JSON.parse(s));
      const op = localStorage.getItem("ncfn_operacao"); if (op) setOperacao(JSON.parse(op));
      const cl = localStorage.getItem("ncfn_checklist"); if (cl) setChecklist(JSON.parse(cl));
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("ncfn_alvos_mapa", JSON.stringify(alvos)); }, [alvos]);
  useEffect(() => { localStorage.setItem("ncfn_rotas_mapa", JSON.stringify(rotas)); }, [rotas]);
  useEffect(() => { localStorage.setItem("ncfn_shapes_mapa", JSON.stringify(shapes)); }, [shapes]);
  useEffect(() => { localStorage.setItem("ncfn_operacao", JSON.stringify(operacao)); }, [operacao]);
  useEffect(() => { localStorage.setItem("ncfn_checklist", JSON.stringify(checklist)); }, [checklist]);

  /* ── Fullscreen body class ── */
  useEffect(() => {
    if (mapFullscreen) document.body.classList.add("ncfn-map-fullscreen");
    else document.body.classList.remove("ncfn-map-fullscreen");
    return () => document.body.classList.remove("ncfn-map-fullscreen");
  }, [mapFullscreen]);

  /* ── Context menu outside click ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node))
        setContextMenu(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Map click handler ── */
  const handleMapClick = useCallback((lat: number, lng: number, x: number, y: number) => {
    setContextMenu(null);

    if (mode === "adicionar") {
      setFormAlvo({ lat, lng, prioridade: "ALTA", status: "ATIVO", notas: "", visivel: true });
      setEditando(true);
      setMode("normal");
      return;
    }

    if (mode === "medindo") {
      setMeasurePoints(prev => {
        if (prev.length === 0) return [{ lat, lng }];
        if (prev.length === 1) {
          const dist = haversine(prev[0].lat, prev[0].lng, lat, lng);
          setMeasureDist(dist);
          return [prev[0], { lat, lng }];
        }
        // Reset on 3rd click
        setMeasureDist(null);
        return [{ lat, lng }];
      });
      return;
    }

    if (mode === "rota") {
      const activeId = rotaAtivaId;
      if (!activeId) return;
      setRotas(prev => prev.map(r =>
        r.id === activeId ? { ...r, pontos: [...r.pontos, { lat, lng }] } : r
      ));
      return;
    }

    if (mode === "desenho") {
      setDrawingPoints(prev => {
        const newPts = [...prev, { lat, lng }];
        // Circle: two points = complete
        if (drawTool === "circle" && newPts.length === 2) {
          const radius = haversine(newPts[0].lat, newPts[0].lng, newPts[1].lat, newPts[1].lng);
          setShapes(s => [...s, {
            id: Date.now().toString(),
            type: "circle",
            color: drawColor,
            opacity: drawOpacity,
            points: [newPts[0]],
            radius,
          }]);
          setMode("normal");
          return [];
        }
        // Rectangle: two points = complete
        if (drawTool === "rectangle" && newPts.length === 2) {
          const [p1, p2] = newPts;
          const rectPts = [
            { lat: p1.lat, lng: p1.lng },
            { lat: p1.lat, lng: p2.lng },
            { lat: p2.lat, lng: p2.lng },
            { lat: p2.lat, lng: p1.lng },
          ];
          setShapes(s => [...s, {
            id: Date.now().toString(),
            type: "rectangle",
            color: drawColor,
            opacity: drawOpacity,
            points: rectPts,
          }]);
          setMode("normal");
          return [];
        }
        return newPts;
      });
      return;
    }
  }, [mode, rotaAtivaId, drawTool, drawColor, drawOpacity]);

  /* ── Right click → context menu ── */
  const handleRightClick = useCallback((lat: number, lng: number, x: number, y: number) => {
    setContextMenu({ x, y, lat, lng });
  }, []);

  /* ── Finish drawing (double-click or button) ── */
  const finishDrawing = () => {
    if (drawingPoints.length >= 3 && (drawTool === "polygon")) {
      setShapes(s => [...s, {
        id: Date.now().toString(),
        type: "polygon",
        color: drawColor,
        opacity: drawOpacity,
        points: drawingPoints,
      }]);
    }
    if (drawingPoints.length >= 2 && drawTool === "polyline") {
      setShapes(s => [...s, {
        id: Date.now().toString(),
        type: "polyline",
        color: drawColor,
        opacity: drawOpacity,
        points: drawingPoints,
      }]);
    }
    setDrawingPoints([]);
    setMode("normal");
  };

  /* ── Alvo CRUD ── */
  const salvarAlvo = () => {
    if (!formAlvo.nome?.trim()) return;
    if (formAlvo.id) {
      setAlvos(prev => prev.map(a => a.id === formAlvo.id ? { ...a, ...formAlvo } as Alvo : a));
      setSelecionado(prev => prev?.id === formAlvo.id ? { ...prev, ...formAlvo } as Alvo : prev);
    } else {
      const novo: Alvo = {
        id: Date.now().toString(),
        nome: formAlvo.nome!,
        lat: formAlvo.lat!,
        lng: formAlvo.lng!,
        prioridade: formAlvo.prioridade as Priority ?? "ALTA",
        status: formAlvo.status as Status ?? "ATIVO",
        notas: formAlvo.notas ?? "",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        codigo: gerarCodigo(),
        visivel: formAlvo.visivel ?? true,
      };
      setAlvos(prev => [novo, ...prev]);
      setSelecionado(novo);
    }
    setEditando(false);
    setFormAlvo({});
  };

  const deletarAlvo = (id: string) => {
    setAlvos(prev => prev.filter(a => a.id !== id));
    if (selecionado?.id === id) setSelecionado(null);
  };

  const toggleVisivel = (id: string) => {
    setAlvos(prev => prev.map(a => a.id === id ? { ...a, visivel: !a.visivel } : a));
  };

  /* ── Rota CRUD ── */
  const novaRota = () => {
    const id = Date.now().toString();
    const colorIdx = rotas.length % ROTA_COLORS.length;
    const r: Rota = { id, nome: `Rota ${rotas.length + 1}`, color: ROTA_COLORS[colorIdx], pontos: [] };
    setRotas(prev => [r, ...prev]);
    setRotaAtivaId(id);
    setMode("rota");
    setTab("rotas");
  };

  const removerUltimoPontoRota = () => {
    if (!rotaAtivaId) return;
    setRotas(prev => prev.map(r => r.id === rotaAtivaId
      ? { ...r, pontos: r.pontos.slice(0, -1) } : r));
  };

  const deletarRota = (id: string) => {
    setRotas(prev => prev.filter(r => r.id !== id));
    if (rotaAtivaId === id) { setRotaAtivaId(null); setMode("normal"); }
  };

  /* ── Geocode ── */
  const buscarGeocode = async () => {
    if (!geocodeBusca.trim()) return;
    setGeocodeLoading(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geocodeBusca)}&format=json&limit=5`);
      const data = await r.json();
      setGeocodeResults(data.map((d: any) => ({ display: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) })));
    } catch {}
    setGeocodeLoading(false);
  };

  /* ── Geolocation ── */
  const handleGeoloc = () => {
    if (!navigator.geolocation) return;
    setGeolocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setGeolocLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeolocLoading(false); },
      () => setGeolocLoading(false)
    );
  };

  /* ── Export JSON ── */
  const exportar = () => {
    const data = { alvos, rotas, shapes, operacao, exportadoEm: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `operacao-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Filtered alvos ── */
  const alvosFiltered = alvos.filter(a => {
    if (filtroPrioridade !== "TODOS" && a.prioridade !== filtroPrioridade) return false;
    if (filtroStatus !== "TODOS" && a.status !== filtroStatus) return false;
    if (busca && !a.nome.toLowerCase().includes(busca.toLowerCase()) && !a.codigo.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const statsAlvos = {
    critica: alvos.filter(a => a.prioridade === "CRÍTICA").length,
    alta: alvos.filter(a => a.prioridade === "ALTA").length,
    ativo: alvos.filter(a => a.status === "ATIVO").length,
    neutralizado: alvos.filter(a => a.status === "NEUTRALIZADO").length,
    total: alvos.length,
  };

  const checklistDone = checklist.filter(c => c.done).length;

  /* ── UI helpers ── */
  const btnMode = (m: MapMode) => mode === m
    ? "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border bg-[#00f3ff]/15 border-[#00f3ff]/50 text-[#00f3ff] cursor-pointer"
    : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer";

  return (
    <div className={`flex ${mapFullscreen ? "fixed inset-0 z-[9990]" : "h-[calc(100vh-80px)]"} gap-0 overflow-hidden bg-[#030310] rounded-xl border border-white/8`}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      {painelAberto && !mapFullscreen && (
        <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-white/8 bg-[#08080f] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
            <Link href="/admin" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft size={14} />
            </Link>
            <div className="flex items-center gap-1.5">
              <Target size={13} className="text-[#bc13fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-white/80">Mapa Tático</span>
            </div>
            <button onClick={exportar} title="Exportar JSON" className="p-1 rounded text-gray-600 hover:text-gray-300">
              <Download size={13} />
            </button>
          </div>

          {/* ── Stats bar ── */}
          <div className="grid grid-cols-4 border-b border-white/5">
            {[
              { label: "Total", value: statsAlvos.total, color: "#bc13fe" },
              { label: "Críticos", value: statsAlvos.critica, color: "#ff0040" },
              { label: "Ativos", value: statsAlvos.ativo, color: "#ef4444" },
              { label: "Neutr.", value: statsAlvos.neutralizado, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-2 border-r border-white/5 last:border-r-0">
                <span className="text-sm font-black" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-white/8 flex-shrink-0 overflow-x-auto no-scrollbar">
            {(["alvos","rotas","desenhos","operacao","checklist"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-2 text-[9px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  tab === t
                    ? "border-[#bc13fe] text-[#bc13fe]"
                    : "border-transparent text-gray-600 hover:text-gray-400"
                }`}>
                {t === "operacao" ? "Missão" : t === "checklist" ? `✓ ${checklistDone}/${checklist.length}` : t}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div className="flex-1 overflow-y-auto">

            {/* ALVOS */}
            {tab === "alvos" && (
              <div className="flex flex-col h-full">
                {/* Search + filters */}
                <div className="p-2 space-y-1.5 border-b border-white/5 flex-shrink-0">
                  <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/8">
                    <Search size={11} className="text-gray-600" />
                    <input value={busca} onChange={e => setBusca(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none"
                      placeholder="Buscar alvo..." />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {(["TODOS","CRÍTICA","ALTA","MÉDIA","BAIXA"] as const).map(p => (
                      <button key={p} onClick={() => setFiltroPrioridade(p)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${
                          filtroPrioridade === p
                            ? "text-white border-white/30 bg-white/10"
                            : "text-gray-600 border-white/5 hover:border-white/15"
                        }`}
                        style={filtroPrioridade === p && p !== "TODOS" ? { color: PRIORITY_CONFIG[p as Priority]?.color, borderColor: PRIORITY_CONFIG[p as Priority]?.color + "66" } : {}}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alvos list */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                  {alvosFiltered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                      <Target size={32} className="text-gray-700" />
                      <p className="text-xs text-gray-600">Nenhum alvo cadastrado</p>
                      <button onClick={() => { setMode("adicionar"); }} className="text-[11px] text-[#bc13fe] hover:underline">
                        + Adicionar alvo no mapa
                      </button>
                    </div>
                  ) : alvosFiltered.map(alvo => {
                    const pc = PRIORITY_CONFIG[alvo.prioridade];
                    const sc = STATUS_CONFIG[alvo.status];
                    const isSelected = selecionado?.id === alvo.id;
                    return (
                      <button key={alvo.id} onClick={() => { setSelecionado(alvo); setPainelAberto(true); }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-[#bc13fe]/10 border-[#bc13fe]/30"
                            : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
                        }`}>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: pc.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-white truncate">{alvo.nome}</span>
                              <span className="text-[8px] font-mono text-gray-600 flex-shrink-0">{alvo.codigo}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ color: sc.color, background: sc.bg }}>
                                {sc.label}
                              </span>
                              <span className="text-[9px] text-gray-600">{alvo.lat.toFixed(3)},{alvo.lng.toFixed(3)}</span>
                            </div>
                          </div>
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button onClick={e => { e.stopPropagation(); toggleVisivel(alvo.id); }}
                              className="p-1 rounded text-gray-600 hover:text-gray-300">
                              {alvo.visivel ? <Eye size={11} /> : <EyeOff size={11} />}
                            </button>
                            <button onClick={e => { e.stopPropagation(); setFormAlvo({ ...alvo }); setEditando(true); }}
                              className="p-1 rounded text-gray-600 hover:text-blue-400">
                              <Edit3 size={11} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); deletarAlvo(alvo.id); }}
                              className="p-1 rounded text-gray-600 hover:text-red-400">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Add alvo button */}
                <div className="p-2 border-t border-white/5 flex-shrink-0">
                  <button onClick={() => setMode(mode === "adicionar" ? "normal" : "adicionar")}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      mode === "adicionar"
                        ? "bg-[#bc13fe]/15 border-[#bc13fe]/50 text-[#bc13fe]"
                        : "bg-white/3 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                    }`}>
                    {mode === "adicionar" ? <><Crosshair size={14} className="animate-pulse" /> Clique no mapa para adicionar</> : <><Plus size={14} /> Adicionar Alvo</>}
                  </button>
                </div>
              </div>
            )}

            {/* ROTAS */}
            {tab === "rotas" && (
              <div className="p-2 space-y-2">
                <button onClick={novaRota}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#00f3ff]/20 text-[#00f3ff] text-xs font-bold hover:bg-[#00f3ff]/10 transition-all">
                  <Plus size={13} /> Nova Rota
                </button>

                {rotas.map(rota => (
                  <div key={rota.id} className={`rounded-xl border p-2.5 space-y-2 ${rotaAtivaId === rota.id && mode === "rota" ? "border-opacity-60 bg-opacity-10" : "border-white/8 bg-white/[0.02]"}`}
                    style={rotaAtivaId === rota.id && mode === "rota" ? { borderColor: rota.color + "99", background: rota.color + "08" } : {}}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: rota.color }} />
                      <input value={rota.nome}
                        onChange={e => setRotas(prev => prev.map(r => r.id === rota.id ? { ...r, nome: e.target.value } : r))}
                        className="flex-1 bg-transparent text-xs font-bold text-white outline-none" />
                      <span className="text-[9px] text-gray-600 font-mono">{rota.pontos.length} pts</span>
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => {
                        setRotaAtivaId(rota.id);
                        setMode(mode === "rota" && rotaAtivaId === rota.id ? "normal" : "rota");
                      }}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                          rotaAtivaId === rota.id && mode === "rota"
                            ? "text-white border-white/30 bg-white/10"
                            : "text-gray-500 border-white/8 hover:text-white hover:bg-white/5"
                        }`}>
                        {rotaAtivaId === rota.id && mode === "rota" ? <><Radio size={10} className="animate-pulse" /> Gravando</> : <><Route size={10} /> Gravar</>}
                      </button>
                      {rotaAtivaId === rota.id && mode === "rota" && (
                        <button onClick={removerUltimoPontoRota}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5">
                          <ArrowLeft size={10} /> Desfazer
                        </button>
                      )}
                      <button onClick={() => deletarRota(rota.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/5">
                        <Trash2 size={10} />
                      </button>
                    </div>

                    {rota.pontos.length > 0 && (
                      <div className="text-[9px] text-gray-600 font-mono">
                        {rota.pontos.length >= 2 && (
                          <span>Dist. total: {fmtDist(rota.pontos.reduce((acc, pt, i) => {
                            if (i === 0) return 0;
                            return acc + haversine(rota.pontos[i-1].lat, rota.pontos[i-1].lng, pt.lat, pt.lng);
                          }, 0))}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {rotas.length === 0 && (
                  <p className="text-center text-xs text-gray-600 py-8">Nenhuma rota. Crie uma e clique no mapa para adicionar pontos.</p>
                )}
              </div>
            )}

            {/* DESENHOS */}
            {tab === "desenhos" && (
              <div className="p-2 space-y-3">
                {/* Draw tool selector */}
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-600">Ferramenta</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(["polygon","circle","rectangle","polyline"] as const).map(t => (
                      <button key={t} onClick={() => { setDrawTool(t); }}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                          drawTool === t ? "border-[#bc13fe]/50 text-[#bc13fe] bg-[#bc13fe]/10" : "border-white/8 text-gray-500 hover:text-white hover:bg-white/5"
                        }`}>
                        <PenLine size={11} />
                        {t === "polygon" ? "Polígono" : t === "circle" ? "Círculo" : t === "rectangle" ? "Retângulo" : "Linha"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-600">Cor</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DRAW_COLORS.map(c => (
                      <button key={c} onClick={() => setDrawColor(c)}
                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: c, borderColor: drawColor === c ? "white" : "transparent" }} />
                    ))}
                  </div>
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-600">Opacidade: {Math.round(drawOpacity * 100)}%</p>
                  <input type="range" min={0} max={80} value={Math.round(drawOpacity * 100)}
                    onChange={e => setDrawOpacity(parseInt(e.target.value) / 100)}
                    className="w-full accent-[#bc13fe]" />
                </div>

                {/* Draw button */}
                <button onClick={() => setMode(mode === "desenho" ? "normal" : "desenho")}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    mode === "desenho"
                      ? "bg-[#bc13fe]/15 border-[#bc13fe]/50 text-[#bc13fe]"
                      : "bg-white/3 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                  }`}>
                  {mode === "desenho"
                    ? <><PenLine size={14} className="animate-pulse" /> Desenhando… (2× para concluir)</>
                    : <><PenLine size={14} /> Iniciar Desenho</>}
                </button>

                {mode === "desenho" && drawingPoints.length > 0 && (
                  <div className="flex gap-1.5">
                    <button onClick={finishDrawing}
                      className="flex-1 py-2 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] text-xs font-bold hover:bg-[#22c55e]/25 transition-all">
                      ✓ Concluir ({drawingPoints.length} pts)
                    </button>
                    <button onClick={() => { setDrawingPoints([]); }}
                      className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Shapes list */}
                {shapes.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-600">{shapes.length} zonas desenhadas</p>
                    {shapes.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: s.color, opacity: 0.9 }} />
                        <span className="text-[10px] text-gray-400 flex-1 capitalize">{s.type} #{i+1}</span>
                        <button onClick={() => setShapes(prev => prev.filter(sh => sh.id !== s.id))}
                          className="text-gray-600 hover:text-red-400 p-0.5">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setShapes([])} className="text-[9px] text-red-400/50 hover:text-red-400 w-full text-center py-1">
                      Limpar todos
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MISSÃO */}
            {tab === "operacao" && (
              <div className="p-2 space-y-2.5">
                <div className="bg-[#bc13fe]/5 border border-[#bc13fe]/15 rounded-xl p-3 mb-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#bc13fe]/70">Planejamento Operacional</p>
                </div>
                {[
                  { key: "nome", label: "Nome da Operação", placeholder: "Ex: OPERAÇÃO NÉVOA" },
                  { key: "codigo", label: "Código / Callsign", placeholder: "NVOA-01" },
                  { key: "objetivo", label: "Objetivo Principal", placeholder: "Descreva o objetivo..." },
                  { key: "equipe", label: "Equipe / Efetivo", placeholder: "Ex: Alpha-3, Bravo-2" },
                  { key: "inicio", label: "Data/Hora Início", placeholder: "AAAA-MM-DD HH:MM" },
                  { key: "fim", label: "Data/Hora Término", placeholder: "AAAA-MM-DD HH:MM" },
                ].map(f => (
                  <div key={f.key} className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600">{f.label}</label>
                    <input
                      value={(operacao as any)[f.key]}
                      onChange={e => setOperacao(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-700 outline-none focus:border-[#bc13fe]/40 transition-all"
                    />
                  </div>
                ))}

                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Nível OPSEC</label>
                  <select value={operacao.opsec}
                    onChange={e => setOperacao(prev => ({ ...prev, opsec: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 outline-none focus:border-[#bc13fe]/40">
                    {["PÚBLICO","RESTRITO","CONFIDENCIAL","SECRETO","ULTRASSECRETO"].map(o => (
                      <option key={o} value={o} style={{ background: "#0d0d1a" }}>{o}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Briefing</label>
                  <textarea
                    value={operacao.briefing}
                    onChange={e => setOperacao(prev => ({ ...prev, briefing: e.target.value }))}
                    rows={5}
                    placeholder="Situação, missão, execução, apoio..."
                    className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-2.5 py-2 text-xs text-gray-300 placeholder-gray-700 outline-none resize-none focus:border-[#bc13fe]/40 transition-all"
                  />
                </div>

                {/* Mission stats */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Alvos", value: alvos.length, icon: Target },
                    { label: "Rotas", value: rotas.length, icon: Route },
                    { label: "Zonas", value: shapes.length, icon: Layers },
                    { label: "OPSEC", value: operacao.opsec.slice(0,6), icon: Shield },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <s.icon size={12} className="text-[#bc13fe]/70 flex-shrink-0" />
                      <div>
                        <div className="text-[11px] font-bold text-white">{s.value}</div>
                        <div className="text-[8px] text-gray-600">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CHECKLIST */}
            {tab === "checklist" && (
              <div className="p-2 space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-600">Checklist Operacional</p>
                  <span className="text-[10px] font-bold text-[#22c55e]">{checklistDone}/{checklist.length}</span>
                </div>

                {/* Progress */}
                <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-[#22c55e] transition-all rounded-full"
                    style={{ width: `${checklist.length ? (checklistDone / checklist.length) * 100 : 0}%` }} />
                </div>

                {checklist.map(item => (
                  <div key={item.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all ${
                    item.done ? "bg-[#22c55e]/5 border-[#22c55e]/20" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <button onClick={() => setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done: !c.done } : c))}
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                        item.done ? "bg-[#22c55e] border-[#22c55e]" : "border-gray-600"
                      }`}>
                      {item.done && <span className="text-black text-[9px] font-black">✓</span>}
                    </button>
                    <span className={`text-xs flex-1 ${item.done ? "line-through text-gray-600" : "text-gray-300"}`}>
                      {item.text}
                    </span>
                    <button onClick={() => setChecklist(prev => prev.filter(c => c.id !== item.id))}
                      className="text-gray-700 hover:text-red-400 p-0.5">
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* Add item */}
                <div className="flex gap-1.5 mt-2">
                  <input
                    value={newCheckItem}
                    onChange={e => setNewCheckItem(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newCheckItem.trim()) {
                        setChecklist(prev => [...prev, { id: Date.now().toString(), text: newCheckItem.trim(), done: false }]);
                        setNewCheckItem("");
                      }
                    }}
                    placeholder="Novo item (Enter para adicionar)..."
                    className="flex-1 bg-white/[0.03] border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-700 outline-none focus:border-[#22c55e]/40"
                  />
                  <button
                    onClick={() => { if (newCheckItem.trim()) { setChecklist(prev => [...prev, { id: Date.now().toString(), text: newCheckItem.trim(), done: false }]); setNewCheckItem(""); } }}
                    className="p-2 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/20">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ── Map area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/8 bg-[#08080f]/90 flex-shrink-0 flex-wrap">
          <button onClick={() => setPainelAberto(v => !v)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-white/5">
            <ChevronRight size={13} className={`transition-transform ${painelAberto ? "rotate-180" : ""}`} />
          </button>

          {/* Layer switcher */}
          <div className="flex items-center gap-0.5 border border-white/10 rounded-lg overflow-hidden">
            {(["dark","satellite","hybrid","osm"] as const).map(t => (
              <button key={t} onClick={() => setImageryType(t)}
                className={`px-2 py-1 text-[9px] font-bold transition-all ${
                  imageryType === t ? "bg-white/15 text-white" : "text-gray-600 hover:text-gray-400"
                }`}>
                {t === "dark" ? "Dark" : t === "satellite" ? "Sat" : t === "hybrid" ? "Hyb" : "OSM"}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Mode buttons */}
          <button onClick={() => setMode(mode === "medindo" ? "normal" : "medindo")} className={btnMode("medindo")}>
            <Ruler size={12} /> Medir {measureDist ? `(${fmtDist(measureDist)})` : ""}
          </button>

          <button onClick={handleGeoloc} disabled={geolocLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-white/10 text-gray-400 hover:text-[#00f3ff] hover:bg-[#00f3ff]/5 hover:border-[#00f3ff]/30 disabled:opacity-50 transition-all">
            <Crosshair size={12} className={geolocLoading ? "animate-spin" : ""} />
            {geolocLoading ? "..." : "Localizar"}
          </button>

          {/* Proximity toggle */}
          <button onClick={() => setProximityAtivo(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              proximityAtivo ? "bg-[#f97316]/10 border-[#f97316]/40 text-[#f97316]" : "border-white/10 text-gray-400 hover:text-[#f97316] hover:bg-[#f97316]/5"
            }`}>
            <Radio size={12} className={proximityAtivo ? "animate-pulse" : ""} />
            {proximityAtivo ? `Prox. ${proximityRadius}m` : "Perímetro"}
          </button>

          {proximityAtivo && (
            <input type="range" min={100} max={10000} step={100} value={proximityRadius}
              onChange={e => setProximityRadius(parseInt(e.target.value))}
              className="w-24 accent-[#f97316]" title={`${proximityRadius} m`} />
          )}

          {/* Geocode search */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
              <Globe size={11} className="text-gray-600" />
              <input
                value={geocodeBusca}
                onChange={e => setGeocodeBusca(e.target.value)}
                onKeyDown={e => e.key === "Enter" && buscarGeocode()}
                placeholder="Buscar endereço..."
                className="bg-transparent text-[10px] text-gray-300 placeholder-gray-700 outline-none w-32"
              />
              {geocodeLoading && <div className="w-3 h-3 border border-[#00f3ff]/50 border-t-[#00f3ff] rounded-full animate-spin" />}
            </div>
            {geocodeResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-black/95 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                {geocodeResults.map((r, i) => (
                  <button key={i} onClick={() => {
                    setFormAlvo({ lat: r.lat, lng: r.lon, prioridade: "MÉDIA", status: "ATIVO", notas: r.display.slice(0, 80), visivel: true });
                    setEditando(true);
                    setGeocodeResults([]);
                    setGeocodeBusca("");
                  }}
                    className="w-full text-left px-3 py-2 text-[10px] text-gray-400 hover:bg-white/5 hover:text-white border-b border-white/5 last:border-b-0 transition-all">
                    <MapPin size={9} className="inline mr-1 text-[#bc13fe]" />
                    <span className="line-clamp-2">{r.display.slice(0, 70)}</span>
                  </button>
                ))}
                <button onClick={() => setGeocodeResults([])} className="w-full py-1.5 text-[9px] text-gray-600 hover:text-gray-400">Fechar</button>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {mode !== "normal" && (
              <button onClick={() => { setMode("normal"); setDrawingPoints([]); setMeasurePoints([]); setMeasureDist(null); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all">
                <X size={12} /> Cancelar
              </button>
            )}
            <button onClick={() => setMapFullscreen(v => !v)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-white/5">
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* Mode banner */}
        {mode !== "normal" && (
          <div className="flex items-center justify-center gap-2 py-1.5 text-[11px] font-bold border-b border-white/5"
            style={{
              background: mode === "adicionar" ? "rgba(188,19,254,0.08)" :
                          mode === "rota"      ? "rgba(0,243,255,0.06)" :
                          mode === "desenho"   ? "rgba(188,19,254,0.06)" :
                          "rgba(249,115,22,0.06)",
              color: mode === "adicionar" ? "#bc13fe" :
                     mode === "rota"      ? "#00f3ff" :
                     mode === "desenho"   ? "#bc13fe" : "#f97316",
            }}>
            {mode === "adicionar" && <><MapPin size={12} className="animate-pulse" /> Clique no mapa para posicionar o alvo</>}
            {mode === "rota"      && <><Route size={12} className="animate-pulse" /> Clique para adicionar pontos da rota · Esc para parar</>}
            {mode === "desenho"   && drawTool !== "circle" && drawTool !== "rectangle"
              ? <><PenLine size={12} className="animate-pulse" /> Clique para adicionar pontos · Double-click ou "Concluir" para finalizar</>
              : mode === "desenho"
              ? <><PenLine size={12} className="animate-pulse" /> {drawTool === "circle" ? "1º clique = centro · 2º = borda" : "Clique 2 cantos opostos"}</>
              : null}
            {mode === "medindo"   && <><Ruler size={12} className="animate-pulse" /> {measureDist ? `Distância: ${fmtDist(measureDist)} — clique para nova medição` : "Clique 2 pontos para medir a distância"}</>}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          <MapaLeaflet
            alvos={alvos}
            rotas={rotas}
            shapes={shapes}
            drawingPoints={drawingPoints}
            drawTool={drawTool}
            drawColor={drawColor}
            drawOpacity={drawOpacity}
            measurePoints={measurePoints}
            measureDist={measureDist}
            proximityAtivo={proximityAtivo}
            proximityRadius={proximityRadius}
            geolocLatLng={geolocLatLng}
            imageryType={imageryType}
            mode={mode}
            selecionado={selecionado}
            onMapClick={handleMapClick}
            onRightClick={handleRightClick}
            onAlvoClick={id => { const a = alvos.find(x => x.id === id); if (a) { setSelecionado(a); setPainelAberto(true); setTab("alvos"); } }}
          />

          {/* Context menu */}
          {contextMenu && (
            <div ref={contextMenuRef}
              className="absolute z-[500] bg-black/95 border border-white/15 rounded-xl shadow-2xl overflow-hidden"
              style={{ left: contextMenu.x + 4, top: contextMenu.y + 4 }}>
              <div className="px-3 py-1.5 border-b border-white/8">
                <p className="text-[9px] font-mono text-gray-600">{contextMenu.lat.toFixed(5)}, {contextMenu.lng.toFixed(5)}</p>
              </div>
              {[
                { label: "Adicionar Alvo aqui", icon: MapPin, action: () => {
                  setFormAlvo({ lat: contextMenu.lat, lng: contextMenu.lng, prioridade: "ALTA", status: "ATIVO", notas: "", visivel: true });
                  setEditando(true); setContextMenu(null);
                }},
                { label: "Iniciar Rota daqui", icon: Route, action: () => {
                  const id = Date.now().toString();
                  const r: Rota = { id, nome: `Rota ${rotas.length + 1}`, color: ROTA_COLORS[rotas.length % ROTA_COLORS.length], pontos: [{ lat: contextMenu.lat, lng: contextMenu.lng }] };
                  setRotas(prev => [...prev, r]); setRotaAtivaId(id); setMode("rota"); setContextMenu(null); setTab("rotas");
                }},
                { label: "Copiar coordenadas", icon: Crosshair, action: () => {
                  navigator.clipboard?.writeText(`${contextMenu.lat.toFixed(6)}, ${contextMenu.lng.toFixed(6)}`);
                  setContextMenu(null);
                }},
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-white/8 hover:text-white transition-all text-left">
                  <item.icon size={12} className="text-[#bc13fe]" />
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Selected alvo info overlay */}
          {selecionado && !editando && (
            <div className="absolute bottom-4 right-4 z-[400] w-64 bg-black/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-3 py-2.5 border-b border-white/8 flex items-center justify-between"
                style={{ borderLeftColor: PRIORITY_CONFIG[selecionado.prioridade].color, borderLeftWidth: 3 }}>
                <div>
                  <p className="text-xs font-black text-white">{selecionado.nome}</p>
                  <p className="text-[9px] font-mono text-gray-500">{selecionado.codigo}</p>
                </div>
                <button onClick={() => setSelecionado(null)} className="text-gray-600 hover:text-white"><X size={14} /></button>
              </div>
              <div className="px-3 py-2.5 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Prioridade</span>
                  <span className="font-bold" style={{ color: PRIORITY_CONFIG[selecionado.prioridade].color }}>{selecionado.prioridade}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="font-bold" style={{ color: STATUS_CONFIG[selecionado.status].color }}>{selecionado.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Coords</span>
                  <span className="font-mono text-gray-400">{selecionado.lat.toFixed(4)},{selecionado.lng.toFixed(4)}</span>
                </div>
                {selecionado.notas && <p className="text-gray-500 text-[9px] pt-1 border-t border-white/5">{selecionado.notas.slice(0,100)}</p>}
              </div>
              <div className="px-3 pb-2.5 flex gap-1.5">
                <button onClick={() => { setFormAlvo({ ...selecionado }); setEditando(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/8 transition-all">
                  <Edit3 size={11} /> Editar
                </button>
                <button onClick={() => deletarAlvo(selecionado.id)}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/5 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit modal ─────────────────────────────────────────────── */}
      {editando && (
        <div className="fixed inset-0 z-[9900] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-[#bc13fe]/20 rounded-2xl w-full max-w-md shadow-[0_0_60px_rgba(188,19,254,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-[#bc13fe]" />
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  {formAlvo.id ? "Editar Alvo" : "Novo Alvo"}
                </span>
              </div>
              <button onClick={() => { setEditando(false); setFormAlvo({}); }} className="text-gray-600 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600 block mb-1">Nome do Alvo *</label>
                <input value={formAlvo.nome ?? ""} onChange={e => setFormAlvo(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Suspeito Alfa"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#bc13fe]/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600 block mb-1">Latitude</label>
                  <input type="number" step="0.0001" value={formAlvo.lat ?? ""}
                    onChange={e => setFormAlvo(p => ({ ...p, lat: parseFloat(e.target.value) }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#bc13fe]/50" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600 block mb-1">Longitude</label>
                  <input type="number" step="0.0001" value={formAlvo.lng ?? ""}
                    onChange={e => setFormAlvo(p => ({ ...p, lng: parseFloat(e.target.value) }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#bc13fe]/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600 block mb-1">Prioridade</label>
                  <select value={formAlvo.prioridade ?? "ALTA"} onChange={e => setFormAlvo(p => ({ ...p, prioridade: e.target.value as Priority }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#bc13fe]/50">
                    {(["CRÍTICA","ALTA","MÉDIA","BAIXA"] as Priority[]).map(p => <option key={p} value={p} style={{ background: "#0d0d1a" }}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600 block mb-1">Status</label>
                  <select value={formAlvo.status ?? "ATIVO"} onChange={e => setFormAlvo(p => ({ ...p, status: e.target.value as Status }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#bc13fe]/50">
                    {(["ATIVO","MONITORANDO","NEUTRALIZADO","ARQUIVADO"] as Status[]).map(s => <option key={s} value={s} style={{ background: "#0d0d1a" }}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-600 block mb-1">Notas / Intel</label>
                <textarea value={formAlvo.notas ?? ""} onChange={e => setFormAlvo(p => ({ ...p, notas: e.target.value }))}
                  rows={3} placeholder="Informações de inteligência, observações..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none resize-none focus:border-[#bc13fe]/50" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formAlvo.visivel ?? true} onChange={e => setFormAlvo(p => ({ ...p, visivel: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#bc13fe]" />
                <span className="text-sm text-gray-300">Visível no mapa</span>
              </label>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={salvarAlvo}
                className="flex-1 py-3 rounded-xl bg-[#bc13fe] text-white text-sm font-black hover:bg-[#bc13fe]/80 transition-all">
                {formAlvo.id ? "Atualizar" : "Adicionar Alvo"}
              </button>
              <button onClick={() => { setEditando(false); setFormAlvo({}); }}
                className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/8 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaflet popup global styles */}
      <style>{`
        .leaflet-popup-content-wrapper { background: #0d0d1a !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.8) !important; }
        .leaflet-popup-tip { background: #0d0d1a !important; }
        .leaflet-popup-content { color: #ccc !important; margin: 10px 14px !important; }
        .leaflet-control-zoom a { background: #1a1a2e !important; color: #00f3ff !important; border-color: rgba(255,255,255,0.1) !important; }
        .leaflet-control-zoom a:hover { background: #2a2a4e !important; }
        .leaflet-control-attribution { background: rgba(0,0,0,0.6) !important; color: rgba(255,255,255,0.3) !important; font-size: 8px !important; }
      `}</style>
    </div>
  );
}
