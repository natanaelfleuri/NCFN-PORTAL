"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Plus, Trash2, Eye, EyeOff, Search,
  Target, AlertTriangle, Shield, Download, X, Edit3,
  ChevronRight, Crosshair, Layers, Navigation, Radio,
  Clock, StickyNote, Flag, Lock, Unlock, RefreshCw,
} from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

type Priority = "CRÍTICA" | "ALTA" | "MÉDIA" | "BAIXA";
type Status = "ATIVO" | "MONITORANDO" | "NEUTRALIZADO" | "ARQUIVADO";

type Alvo = {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  prioridade: Priority;
  status: Status;
  notas: string;
  criadoEm: string;
  atualizadoEm: string;
  codigo: string;
  visivel: boolean;
};

const PRIORITY_CONFIG: Record<Priority, { color: string; dot: string; border: string; bg: string }> = {
  "CRÍTICA": { color: "#ff0040", dot: "#ff0040", border: "rgba(255,0,64,0.4)", bg: "rgba(255,0,64,0.08)" },
  "ALTA":    { color: "#ef4444", dot: "#ef4444", border: "rgba(239,68,68,0.4)", bg: "rgba(239,68,68,0.08)" },
  "MÉDIA":   { color: "#f97316", dot: "#f97316", border: "rgba(249,115,22,0.4)", bg: "rgba(249,115,22,0.08)" },
  "BAIXA":   { color: "#22c55e", dot: "#22c55e", border: "rgba(34,197,94,0.4)",  bg: "rgba(34,197,94,0.08)"  },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  "ATIVO":       { label: "ATIVO",       color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  "MONITORANDO": { label: "MONITORANDO", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  "NEUTRALIZADO":{ label: "NEUTRALIZADO",color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  "ARQUIVADO":   { label: "ARQUIVADO",   color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

function gerarCodigo() {
  return "ALV-" + Math.random().toString(36).substring(2, 7).toUpperCase();
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function MapaAlvosPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);

  const [alvos, setAlvos] = useState<Alvo[]>([]);
  const [selecionado, setSelecionado] = useState<Alvo | null>(null);
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [mapCarregado, setMapCarregado] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState<Priority | "TODOS">("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<Status | "TODOS">("TODOS");
  const [tipoMapa, setTipoMapa] = useState<"satellite" | "hybrid" | "roadmap" | "terrain">("hybrid");
  const [editando, setEditando] = useState(false);
  const [formAlvo, setFormAlvo] = useState<Partial<Alvo>>({});
  const [coordPendente, setCoordPendente] = useState<{ lat: number; lng: number } | null>(null);
  const [painelAberto, setPainelAberto] = useState(true);

  // Persistência local
  useEffect(() => {
    const saved = localStorage.getItem("ncfn_alvos_mapa");
    if (saved) setAlvos(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("ncfn_alvos_mapa", JSON.stringify(alvos));
  }, [alvos]);

  // Carregar Google Maps
  useEffect(() => {
    if (window.google?.maps) { initMap(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&v=weekly`;
    script.async = true;
    script.defer = true;
    window.initMap = initMap;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
      delete window.initMap;
    };
  }, []);

  function initMap() {
    if (!mapRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: -15.793, lng: -47.882 },
      zoom: 5,
      mapTypeId: "hybrid",
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
      scaleControl: true,
      fullscreenControl: false,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0a" }] },
        { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1628" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
      ],
    });
    mapInstanceRef.current = map;
    infoWindowRef.current = new window.google.maps.InfoWindow();

    map.addListener("click", (e: any) => {
      if (!modoAdicionarRef.current) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCoordPendente({ lat, lng });
      setFormAlvo({
        lat, lng,
        prioridade: "ALTA",
        status: "ATIVO",
        notas: "",
        visivel: true,
      });
      setEditando(true);
      setModoAdicionar(false);
    });

    setMapCarregado(true);
  }

  // Ref para modoAdicionar (acessível dentro do listener)
  const modoAdicionarRef = useRef(false);
  useEffect(() => { modoAdicionarRef.current = modoAdicionar; }, [modoAdicionar]);

  // Cursor no mapa quando modoAdicionar
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setOptions({
      draggableCursor: modoAdicionar ? "crosshair" : "grab",
    });
  }, [modoAdicionar]);

  // Tipo de mapa
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setMapTypeId(tipoMapa);
  }, [tipoMapa]);

  // Sincronizar markers
  useEffect(() => {
    if (!mapCarregado || !mapInstanceRef.current) return;

    // Remove markers de alvos excluídos
    markersRef.current.forEach((marker, id) => {
      if (!alvos.find(a => a.id === id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    // Cria/atualiza markers
    alvos.forEach(alvo => {
      const cfg = PRIORITY_CONFIG[alvo.prioridade];
      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <ellipse cx="18" cy="42" rx="6" ry="2" fill="rgba(0,0,0,0.4)"/>
          <path d="M18 2 C10.3 2 4 8.3 4 16 C4 26 18 42 18 42 C18 42 32 26 32 16 C32 8.3 25.7 2 18 2Z"
            fill="${cfg.dot}" fill-opacity="${alvo.visivel ? "0.9" : "0.3"}" stroke="${cfg.color}" stroke-width="1.5" filter="url(#glow)"/>
          <circle cx="18" cy="16" r="5" fill="rgba(0,0,0,0.6)" stroke="${cfg.color}" stroke-width="1"/>
          <circle cx="18" cy="16" r="2" fill="${cfg.color}"/>
        </svg>`;

      const icon = {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgIcon),
        scaledSize: new window.google.maps.Size(36, 44),
        anchor: new window.google.maps.Point(18, 44),
      };

      if (markersRef.current.has(alvo.id)) {
        const m = markersRef.current.get(alvo.id);
        m.setIcon(icon);
        m.setPosition({ lat: alvo.lat, lng: alvo.lng });
        m.setVisible(alvo.visivel);
      } else {
        const marker = new window.google.maps.Marker({
          position: { lat: alvo.lat, lng: alvo.lng },
          map: mapInstanceRef.current,
          icon,
          title: alvo.nome,
          visible: alvo.visivel,
          animation: window.google.maps.Animation.DROP,
        });
        marker.addListener("click", () => {
          setSelecionado(alvo);
          setPainelAberto(true);
        });
        markersRef.current.set(alvo.id, marker);
      }
    });
  }, [alvos, mapCarregado]);

  const centralizarAlvo = useCallback((alvo: Alvo) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({ lat: alvo.lat, lng: alvo.lng });
    mapInstanceRef.current.setZoom(14);
    setSelecionado(alvo);
  }, []);

  const salvarAlvo = () => {
    if (!formAlvo.nome?.trim()) return;
    const agora = new Date().toISOString();
    if (formAlvo.id) {
      setAlvos(prev => prev.map(a => a.id === formAlvo.id
        ? { ...a, ...formAlvo, atualizadoEm: agora } as Alvo
        : a));
      setSelecionado(prev => prev?.id === formAlvo.id ? { ...prev, ...formAlvo, atualizadoEm: agora } as Alvo : prev);
    } else {
      const novo: Alvo = {
        id: crypto.randomUUID(),
        nome: formAlvo.nome!,
        lat: formAlvo.lat!,
        lng: formAlvo.lng!,
        prioridade: formAlvo.prioridade as Priority || "ALTA",
        status: formAlvo.status as Status || "ATIVO",
        notas: formAlvo.notas || "",
        criadoEm: agora,
        atualizadoEm: agora,
        codigo: gerarCodigo(),
        visivel: true,
      };
      setAlvos(prev => [novo, ...prev]);
      setTimeout(() => centralizarAlvo(novo), 300);
    }
    setEditando(false);
    setFormAlvo({});
    setCoordPendente(null);
  };

  const excluirAlvo = (id: string) => {
    setAlvos(prev => prev.filter(a => a.id !== id));
    if (selecionado?.id === id) setSelecionado(null);
  };

  const toggleVisivel = (id: string) => {
    setAlvos(prev => prev.map(a => a.id === id ? { ...a, visivel: !a.visivel } : a));
    if (selecionado?.id === id) setSelecionado(prev => prev ? { ...prev, visivel: !prev.visivel } : prev);
  };

  const exportarJSON = () => {
    const blob = new Blob([JSON.stringify({ alvos, exportadoEm: new Date().toISOString(), sistema: "NCFN" }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ncfn_mapa_alvos_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const alvosFiltered = alvos.filter(a => {
    if (filtroPrioridade !== "TODOS" && a.prioridade !== filtroPrioridade) return false;
    if (filtroStatus !== "TODOS" && a.status !== filtroStatus) return false;
    if (busca) return a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      a.notas.toLowerCase().includes(busca.toLowerCase());
    return true;
  });

  const statsCritica = alvos.filter(a => a.prioridade === "CRÍTICA").length;
  const statsAtivos = alvos.filter(a => a.status === "ATIVO").length;

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#bc13fe]/20 bg-black/95 z-10 flex-shrink-0">
        <Link href="/admin" className="text-gray-600 hover:text-[#bc13fe] transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="p-1.5 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-lg shadow-[0_0_12px_rgba(188,19,254,0.2)]">
          <Crosshair className="w-4 h-4 text-[#bc13fe]" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-black text-white tracking-tight leading-none">MAPA DE PLANEJAMENTO E LOCALIZAÇÃO DE ALVOS</h1>
          <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-0.5">NCFN · Sistema de Geointeligência Operacional</p>
        </div>

        {/* Stats rápidas */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-center px-3 py-1 border border-gray-800 rounded-lg bg-black/60">
            <div className="text-sm font-black text-white">{alvos.length}</div>
            <div className="text-[8px] text-gray-600 uppercase tracking-wider">Alvos</div>
          </div>
          <div className="text-center px-3 py-1 border border-red-900/50 rounded-lg bg-red-950/20">
            <div className="text-sm font-black text-red-400">{statsCritica}</div>
            <div className="text-[8px] text-gray-600 uppercase tracking-wider">Críticos</div>
          </div>
          <div className="text-center px-3 py-1 border border-orange-900/50 rounded-lg bg-orange-950/20">
            <div className="text-sm font-black text-orange-400">{statsAtivos}</div>
            <div className="text-[8px] text-gray-600 uppercase tracking-wider">Ativos</div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2">
          {/* Tipo de mapa */}
          <div className="flex items-center gap-1 bg-black/60 border border-gray-800 rounded-lg p-1">
            {(["satellite", "hybrid", "roadmap", "terrain"] as const).map(t => (
              <button key={t} onClick={() => setTipoMapa(t)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider transition ${tipoMapa === t ? "bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/30" : "text-gray-600 hover:text-gray-300"}`}>
                {t === "satellite" ? "SAT" : t === "hybrid" ? "HBR" : t === "roadmap" ? "RUA" : "TER"}
              </button>
            ))}
          </div>

          <button onClick={exportarJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-gray-400 border border-gray-800 rounded-lg hover:border-gray-600 hover:text-white transition">
            <Download className="w-3 h-3" /> Exportar
          </button>

          <button onClick={() => setPainelAberto(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border rounded-lg transition border-gray-800 text-gray-400 hover:text-white">
            <Layers className="w-3 h-3" /> {painelAberto ? "Ocultar" : "Painel"}
          </button>
        </div>
      </div>

      {/* Corpo principal */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Painel lateral */}
        {painelAberto && (
          <div className="w-80 flex-shrink-0 flex flex-col border-r border-[#bc13fe]/15 bg-black/95 z-10">

            {/* Busca + Adicionar */}
            <div className="p-3 space-y-2 border-b border-gray-900">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5">
                  <Search className="w-3 h-3 text-gray-600" />
                  <input value={busca} onChange={e => setBusca(e.target.value)}
                    placeholder="buscar alvo, código..."
                    className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder-gray-700" />
                </div>
                <button
                  onClick={() => { setModoAdicionar(v => !v); setSelecionado(null); setEditando(false); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition ${modoAdicionar
                    ? "bg-[#bc13fe]/20 border-[#bc13fe]/50 text-[#bc13fe] shadow-[0_0_10px_rgba(188,19,254,0.3)] animate-pulse"
                    : "border-[#bc13fe]/30 text-[#bc13fe] hover:bg-[#bc13fe]/10"}`}>
                  {modoAdicionar ? <><Crosshair className="w-3 h-3" /> CLICAR</> : <><Plus className="w-3 h-3" /> NOVO</>}
                </button>
              </div>

              {modoAdicionar && (
                <div className="flex items-center gap-2 bg-[#bc13fe]/5 border border-[#bc13fe]/20 rounded-lg px-3 py-2">
                  <Radio className="w-3 h-3 text-[#bc13fe] animate-pulse" />
                  <span className="text-[9px] text-[#bc13fe] font-mono uppercase tracking-wider">Clique no mapa para marcar o alvo</span>
                </div>
              )}

              {/* Filtros */}
              <div className="flex gap-1 flex-wrap">
                {(["TODOS", "CRÍTICA", "ALTA", "MÉDIA", "BAIXA"] as const).map(p => (
                  <button key={p} onClick={() => setFiltroPrioridade(p as any)}
                    className={`px-2 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider transition border ${filtroPrioridade === p
                      ? p === "TODOS" ? "bg-white/10 border-white/20 text-white"
                        : `border-[${PRIORITY_CONFIG[p as Priority]?.border}] text-white`
                      : "border-gray-900 text-gray-700 hover:text-gray-400"}`}
                    style={filtroPrioridade === p && p !== "TODOS" ? {
                      color: PRIORITY_CONFIG[p as Priority]?.color,
                      borderColor: PRIORITY_CONFIG[p as Priority]?.border,
                      background: PRIORITY_CONFIG[p as Priority]?.bg,
                    } : {}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de alvos */}
            <div className="flex-1 overflow-y-auto">
              {alvosFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-700">
                  <Target className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-[10px] uppercase tracking-widest">
                    {alvos.length === 0 ? "Nenhum alvo cadastrado" : "Nenhum resultado"}
                  </p>
                  {alvos.length === 0 && (
                    <p className="text-[9px] text-gray-800 mt-1">Clique em + NOVO e marque no mapa</p>
                  )}
                </div>
              ) : (
                <div className="space-y-0">
                  {alvosFiltered.map(alvo => {
                    const cfg = PRIORITY_CONFIG[alvo.prioridade];
                    const stCfg = STATUS_CONFIG[alvo.status];
                    const isSelected = selecionado?.id === alvo.id;
                    return (
                      <div key={alvo.id}
                        onClick={() => { centralizarAlvo(alvo); setSelecionado(alvo); }}
                        className={`flex items-center gap-3 px-3 py-2.5 border-b cursor-pointer transition-all
                          ${isSelected
                            ? "bg-[#bc13fe]/8 border-b-[#bc13fe]/20"
                            : "border-b-gray-900/60 hover:bg-white/2"}`}>
                        {/* Dot prioridade */}
                        <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-white truncate">{alvo.nome}</span>
                            {!alvo.visivel && <EyeOff className="w-2.5 h-2.5 text-gray-700 flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8px] font-mono text-gray-600">{alvo.codigo}</span>
                            <span className="text-gray-800">·</span>
                            <span className="text-[8px] font-bold uppercase" style={{ color: stCfg.color }}>{alvo.status}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={e => { e.stopPropagation(); toggleVisivel(alvo.id); }}
                            className="p-1 text-gray-700 hover:text-gray-300 transition">
                            {alvo.visivel ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>
                          <ChevronRight className="w-3 h-3 text-gray-800" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mapa */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Loading overlay */}
          {!mapCarregado && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
              <div className="relative mb-6">
                <Crosshair className="w-12 h-12 text-[#bc13fe] animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
              </div>
              <p className="text-[10px] text-[#bc13fe] font-mono uppercase tracking-[0.3em]">Carregando sistema de geointeligência...</p>
            </div>
          )}

          {/* Coordenadas bottom */}
          {mapCarregado && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/80 border border-gray-800 rounded-full backdrop-blur-sm z-10">
              <Navigation className="w-3 h-3 text-[#bc13fe]" />
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                {alvos.length} alvo{alvos.length !== 1 ? "s" : ""} mapeado{alvos.length !== 1 ? "s" : ""}
              </span>
              <span className="text-gray-800">·</span>
              <span className="text-[9px] font-mono text-gray-600">NCFN GEOINT v1.0</span>
            </div>
          )}
        </div>

        {/* Painel de detalhe do alvo selecionado */}
        {selecionado && !editando && (
          <div className="w-72 flex-shrink-0 flex flex-col border-l border-[#bc13fe]/15 bg-black/97 z-10 overflow-y-auto">
            {(() => {
              const cfg = PRIORITY_CONFIG[selecionado.prioridade];
              const stCfg = STATUS_CONFIG[selecionado.status];
              return (
                <>
                  {/* Header detalhe */}
                  <div className="p-4 border-b border-gray-900 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: cfg.dot, boxShadow: `0 0 8px ${cfg.dot}` }} />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Alvo Selecionado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setFormAlvo({ ...selecionado }); setEditando(true); }}
                          className="p-1.5 text-gray-600 hover:text-[#bc13fe] border border-gray-900 rounded-lg hover:border-[#bc13fe]/30 transition">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={() => { if (confirm(`Excluir "${selecionado.nome}"?`)) excluirAlvo(selecionado.id); }}
                          className="p-1.5 text-gray-600 hover:text-red-400 border border-gray-900 rounded-lg hover:border-red-900/40 transition">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => setSelecionado(null)}
                          className="p-1.5 text-gray-600 hover:text-white border border-gray-900 rounded-lg transition">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-base font-black text-white leading-tight">{selecionado.nome}</h2>
                      <p className="text-[9px] font-mono text-gray-600 mt-0.5">{selecionado.codigo}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded border"
                        style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
                        {selecionado.prioridade}
                      </span>
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded border"
                        style={{ color: stCfg.color, background: stCfg.bg, borderColor: stCfg.color + "30" }}>
                        {stCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Coordenadas */}
                  <div className="p-4 border-b border-gray-900 space-y-2">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Coordenadas GPS
                    </p>
                    <div className="bg-gray-950 border border-gray-900 rounded-lg p-3 font-mono">
                      <div className="text-[10px] text-[#bc13fe]">LAT: {selecionado.lat.toFixed(6)}°</div>
                      <div className="text-[10px] text-[#bc13fe]">LNG: {selecionado.lng.toFixed(6)}°</div>
                    </div>
                    <button onClick={() => centralizarAlvo(selecionado)}
                      className="w-full text-[9px] text-gray-600 hover:text-white flex items-center justify-center gap-1.5 py-1.5 border border-gray-900 rounded-lg hover:border-gray-700 transition">
                      <Navigation className="w-3 h-3" /> Centralizar no mapa
                    </button>
                  </div>

                  {/* Visibilidade */}
                  <div className="p-4 border-b border-gray-900">
                    <button onClick={() => toggleVisivel(selecionado.id)}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-[10px] font-bold transition ${selecionado.visivel
                        ? "border-green-900/50 text-green-400 bg-green-950/20 hover:bg-green-950/30"
                        : "border-gray-800 text-gray-600 hover:text-white"}`}>
                      {selecionado.visivel
                        ? <><Eye className="w-3.5 h-3.5" /> VISÍVEL NO MAPA</>
                        : <><EyeOff className="w-3.5 h-3.5" /> OCULTO NO MAPA</>}
                    </button>
                  </div>

                  {/* Notas */}
                  {selecionado.notas && (
                    <div className="p-4 border-b border-gray-900">
                      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <StickyNote className="w-3 h-3" /> Notas Operacionais
                      </p>
                      <p className="text-[11px] text-gray-400 leading-relaxed bg-gray-950 border border-gray-900 rounded-lg p-3">
                        {selecionado.notas}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[9px] text-gray-700">
                      <Clock className="w-3 h-3" />
                      <span>Criado: {new Date(selecionado.criadoEm).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-gray-700">
                      <RefreshCw className="w-3 h-3" />
                      <span>Atualizado: {new Date(selecionado.atualizadoEm).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Modal de edição/criação */}
        {editando && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-gray-950 border border-[#bc13fe]/30 rounded-2xl w-full max-w-md shadow-[0_0_40px_rgba(188,19,254,0.15)]">
              {/* Modal header */}
              <div className="p-5 border-b border-gray-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-lg">
                    <Flag className="w-4 h-4 text-[#bc13fe]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {formAlvo.id ? "Editar Alvo" : "Novo Alvo"}
                    </h3>
                    {coordPendente && (
                      <p className="text-[9px] font-mono text-[#bc13fe] mt-0.5">
                        {coordPendente.lat.toFixed(5)}° · {coordPendente.lng.toFixed(5)}°
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => { setEditando(false); setFormAlvo({}); setCoordPendente(null); }}
                  className="p-1.5 text-gray-600 hover:text-white border border-gray-800 rounded-lg transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form */}
              <div className="p-5 space-y-4">
                {/* Nome */}
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Designação do Alvo *</label>
                  <input
                    value={formAlvo.nome || ""}
                    onChange={e => setFormAlvo(v => ({ ...v, nome: e.target.value }))}
                    placeholder="Nome / codinome do alvo..."
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#bc13fe]/50 placeholder-gray-700 transition"
                    autoFocus
                  />
                </div>

                {/* Prioridade + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Prioridade</label>
                    <select
                      value={formAlvo.prioridade || "ALTA"}
                      onChange={e => setFormAlvo(v => ({ ...v, prioridade: e.target.value as Priority }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#bc13fe]/50 transition">
                      <option>CRÍTICA</option>
                      <option>ALTA</option>
                      <option>MÉDIA</option>
                      <option>BAIXA</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Status</label>
                    <select
                      value={formAlvo.status || "ATIVO"}
                      onChange={e => setFormAlvo(v => ({ ...v, status: e.target.value as Status }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#bc13fe]/50 transition">
                      <option>ATIVO</option>
                      <option>MONITORANDO</option>
                      <option>NEUTRALIZADO</option>
                      <option>ARQUIVADO</option>
                    </select>
                  </div>
                </div>

                {/* Coordenadas (editáveis) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Latitude</label>
                    <input
                      type="number" step="any"
                      value={formAlvo.lat || ""}
                      onChange={e => setFormAlvo(v => ({ ...v, lat: parseFloat(e.target.value) }))}
                      placeholder="-23.5505"
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#bc13fe]/50 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Longitude</label>
                    <input
                      type="number" step="any"
                      value={formAlvo.lng || ""}
                      onChange={e => setFormAlvo(v => ({ ...v, lng: parseFloat(e.target.value) }))}
                      placeholder="-46.6333"
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#bc13fe]/50 transition"
                    />
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Notas Operacionais</label>
                  <textarea
                    value={formAlvo.notas || ""}
                    onChange={e => setFormAlvo(v => ({ ...v, notas: e.target.value }))}
                    placeholder="Informações táticas, observações, referências..."
                    rows={3}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#bc13fe]/50 placeholder-gray-700 transition resize-none"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="p-5 pt-0 flex gap-3">
                <button onClick={() => { setEditando(false); setFormAlvo({}); setCoordPendente(null); }}
                  className="flex-1 py-2.5 text-sm font-bold text-gray-500 border border-gray-800 rounded-xl hover:text-white hover:border-gray-600 transition">
                  Cancelar
                </button>
                <button onClick={salvarAlvo} disabled={!formAlvo.nome?.trim()}
                  className="flex-1 py-2.5 text-sm font-black text-white bg-[#bc13fe]/20 border border-[#bc13fe]/40 rounded-xl hover:bg-[#bc13fe]/30 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(188,19,254,0.2)]">
                  {formAlvo.id ? "Salvar Alterações" : "Registrar Alvo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
