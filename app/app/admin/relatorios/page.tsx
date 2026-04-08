"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Plus, Trash2, Eye, EyeOff, Search,
  Target, AlertTriangle, Download, X, Edit3,
  ChevronRight, Crosshair, Layers, Navigation, Radio,
  Navigation2, PenLine, Maximize2, Mountain, Globe,
  Lock, Clock, RefreshCw, StickyNote, Flag,
} from "lucide-react";

const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || "";

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

type Rota = {
  id: string;
  nome: string;
  color: string;
  pontos: { lat: number; lng: number }[];
};

const PRIORITY_CONFIG: Record<Priority, { color: string; dot: string; border: string; bg: string }> = {
  "CRÍTICA": { color: "#ff0040", dot: "#ff0040", border: "rgba(255,0,64,0.4)",   bg: "rgba(255,0,64,0.08)"  },
  "ALTA":    { color: "#ef4444", dot: "#ef4444", border: "rgba(239,68,68,0.4)",  bg: "rgba(239,68,68,0.08)" },
  "MÉDIA":   { color: "#f97316", dot: "#f97316", border: "rgba(249,115,22,0.4)", bg: "rgba(249,115,22,0.08)"},
  "BAIXA":   { color: "#22c55e", dot: "#22c55e", border: "rgba(34,197,94,0.4)",  bg: "rgba(34,197,94,0.08)" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  "ATIVO":        { label: "ATIVO",        color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  "MONITORANDO":  { label: "MONITORANDO",  color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  "NEUTRALIZADO": { label: "NEUTRALIZADO", color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  "ARQUIVADO":    { label: "ARQUIVADO",    color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const ROTA_COLORS = ["#f59e0b","#00f3ff","#bc13fe","#22c55e","#ef4444","#3b82f6","#e879f9","#34d399"];

function gerarCodigo() {
  return "ALV-" + Math.random().toString(36).substring(2, 7).toUpperCase();
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeMarkerSvg(color: string, visible: boolean) {
  const a = visible ? 1 : 0.4;
  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        <ellipse cx="14" cy="34" rx="5" ry="2" fill="rgba(0,0,0,0.4)" opacity="${a}"/>
        <path d="M14 2C8 2 3 7 3 14C3 23 14 34 14 34C14 34 25 23 25 14C25 7 20 2 14 2Z" fill="${color}" fill-opacity="${a * 0.5}" stroke="${color}" stroke-width="1.5" opacity="${a}"/>
        <circle cx="14" cy="14" r="5" fill="rgba(0,0,0,0.5)" stroke="${color}" stroke-width="1.2" opacity="${a}"/>
        <circle cx="14" cy="14" r="2" fill="${color}" opacity="${a}"/>
      </svg>`
    )
  );
}

function makeRoutePtSvg(color: string, num: number) {
  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="${color}" stroke="#000" stroke-width="1.5"/>
        <text x="14" y="19" text-anchor="middle" font-size="12" font-weight="bold" fill="#000">${num}</text>
      </svg>`
    )
  );
}

declare global {
  interface Window { Cesium: any; }
}

export default function MapaAlvosPage() {
  // ── Map refs ──────────────────────────────────────────────────────────────
  const cesiumRef  = useRef<HTMLDivElement>(null);
  const viewerRef  = useRef<any>(null);
  const entitiesRef        = useRef<Map<string, any>>(new Map());
  const routeEntitiesRef   = useRef<Map<string, { line: any; pts: any[] }>>(new Map());
  const drawnEntitiesRef   = useRef<any[]>([]);
  const proximityEntitiesRef = useRef<any[]>([]);
  const measureEntitiesRef = useRef<any[]>([]);
  const geolocEntityRef    = useRef<any>(null);
  const vehicleEntitiesRef = useRef<Map<string, any>>(new Map());
  const vehicleAnimsRef    = useRef<Map<string, any>>(new Map());
  const drawPositionsRef   = useRef<{ lat: number; lng: number }[]>([]);
  const liveDrawEntityRef  = useRef<any>(null);
  const measurePointsRef   = useRef<{ lat: number; lng: number }[]>([]);
  const osmBuildingPrimRef = useRef<any>(null);

  // Stale-closure refs
  const modoAdicionarRef  = useRef(false);
  const modoRotaRef       = useRef(false);
  const rotaAtivaIdRef    = useRef<string | null>(null);
  const rotasRef          = useRef<Rota[]>([]);
  const modoDesenhoRef    = useRef(false);
  const drawToolRef       = useRef<"polygon" | "circle" | "rectangle" | "polyline">("polygon");
  const drawColorRef      = useRef("#bc13fe");
  const drawOpacityRef    = useRef(0.3);
  const measuringRef      = useRef(false);
  const contextMenuRef    = useRef<HTMLDivElement>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [alvos, setAlvos]               = useState<Alvo[]>([]);
  const [selecionado, setSelecionado]   = useState<Alvo | null>(null);
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [mapCarregado, setMapCarregado] = useState(false);
  const [mapError, setMapError]         = useState<string | null>(null);
  const [busca, setBusca]               = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState<Priority | "TODOS">("TODOS");
  const [filtroStatus, setFiltroStatus]         = useState<Status | "TODOS">("TODOS");
  const [editando, setEditando]         = useState(false);
  const [formAlvo, setFormAlvo]         = useState<Partial<Alvo>>({});
  const [coordPendente, setCoordPendente] = useState<{ lat: number; lng: number } | null>(null);
  const [painelAberto, setPainelAberto] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  // Imagery
  const [imageryType, setImageryType]   = useState<"dark" | "satellite" | "hybrid" | "osm">("dark");

  // 3D terrain + buildings
  const [tilt3d, setTilt3d]             = useState(false);
  const [osmBuildings, setOsmBuildings] = useState(false);

  // Route mode
  const [modoRota, setModoRota]         = useState(false);
  const [rotas, setRotas]               = useState<Rota[]>([]);
  const [rotaAtivaId, setRotaAtivaId]   = useState<string | null>(null);
  const [animatingAll, setAnimatingAll] = useState(false);

  // Drawing
  const [modoDesenho, setModoDesenho]   = useState(false);
  const [drawTool, setDrawTool]         = useState<"polygon" | "circle" | "rectangle" | "polyline">("polygon");
  const [drawColor, setDrawColor]       = useState("#bc13fe");
  const [drawOpacity, setDrawOpacity]   = useState(0.3);

  // Measuring
  const [measuring, setMeasuring]       = useState(false);
  const [measureDist, setMeasureDist]   = useState<number | null>(null);

  // Context menu
  const [contextMenu, setContextMenu]   = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);

  // Proximity rings
  const [proximityAtivo, setProximityAtivo] = useState(false);

  // Geolocation
  const [geolocLoading, setGeolocLoading] = useState(false);

  // Geocoding search
  const [geocodeBusca, setGeocodeBusca]   = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);

  // ── Sync stale-closure refs ────────────────────────────────────────────────
  useEffect(() => { modoAdicionarRef.current = modoAdicionar; }, [modoAdicionar]);
  useEffect(() => { modoRotaRef.current = modoRota; }, [modoRota]);
  useEffect(() => { rotaAtivaIdRef.current = rotaAtivaId; }, [rotaAtivaId]);
  useEffect(() => { rotasRef.current = rotas; }, [rotas]);
  useEffect(() => { modoDesenhoRef.current = modoDesenho; }, [modoDesenho]);
  useEffect(() => { drawToolRef.current = drawTool; }, [drawTool]);
  useEffect(() => { drawColorRef.current = drawColor; }, [drawColor]);
  useEffect(() => { drawOpacityRef.current = drawOpacity; }, [drawOpacity]);
  useEffect(() => { measuringRef.current = measuring; }, [measuring]);

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("ncfn_alvos_mapa");
    if (saved) setAlvos(JSON.parse(saved));
    const savedRotas = localStorage.getItem("ncfn_rotas_mapa");
    if (savedRotas) {
      try {
        const data: Rota[] = JSON.parse(savedRotas);
        if (data.length) {
          setRotas(data);
          rotasRef.current = data;
          setRotaAtivaId(data[0].id);
          rotaAtivaIdRef.current = data[0].id;
        }
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ncfn_alvos_mapa", JSON.stringify(alvos));
  }, [alvos]);

  // ── Close context menu on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fullscreen class ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mapFullscreen) document.body.classList.add("ncfn-map-fullscreen");
    else document.body.classList.remove("ncfn-map-fullscreen");
    return () => document.body.classList.remove("ncfn-map-fullscreen");
  }, [mapFullscreen]);

  // ── Load CesiumJS via CDN ─────────────────────────────────────────────────
  useEffect(() => {
    if (window.Cesium) { initCesium(); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Widgets/widgets.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Cesium.js";
    script.async = true;
    script.onload = () => initCesium();
    script.onerror = () => setMapError("Falha ao carregar CesiumJS via CDN. Verifique a conectividade com cesium.com.");
    document.head.appendChild(script);

    return () => {
      // leave script/link in DOM so hot-reload doesn't reload Cesium repeatedly
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── initCesium ────────────────────────────────────────────────────────────
  function initCesium() {
    if (!cesiumRef.current) return;
    const C = window.Cesium;
    if (CESIUM_TOKEN) C.Ion.defaultAccessToken = CESIUM_TOKEN;

    let viewer: any;
    try {
      viewer = new C.Viewer(cesiumRef.current, {
        baseLayerPicker: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        geocoder: false,
        homeButton: false,
        fullscreenButton: false,
        animation: false,
        timeline: false,
        infoBox: false,
        selectionIndicator: false,
        imageryProvider: false,
        terrainProvider: new C.EllipsoidTerrainProvider(),
      });
    } catch (err) {
      setMapError("Erro ao inicializar o visualizador CesiumJS: " + String(err));
      return;
    }

    viewer.scene.backgroundColor = C.Color.fromCssColorString("#050510");
    viewer.scene.globe.baseColor  = C.Color.fromCssColorString("#050510");
    viewer.scene.globe.enableLighting = false;
    try { viewer.scene.skyBox.show        = false; } catch (_) {}
    try { viewer.scene.sun.show           = false; } catch (_) {}
    try { viewer.scene.moon.show          = false; } catch (_) {}
    try { viewer.scene.skyAtmosphere.show = false; } catch (_) {}

    // Initial imagery (dark)
    viewer.imageryLayers.addImageryProvider(
      new C.UrlTemplateImageryProvider({
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c", "d"],
        maximumLevel: 19,
        credit: "© CartoDB",
      })
    );

    // Start camera
    viewer.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(-47.882, -15.793, 6000000),
      duration: 0,
    });

    viewerRef.current = viewer;

    // ── Event handler ──────────────────────────────────────────────────────
    const handler = new C.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((e: any) => {
      setContextMenu(null);
      const cartesian = viewer.camera.pickEllipsoid(e.position, viewer.scene.globe.ellipsoid);
      if (!cartesian) return;
      const carto = C.Cartographic.fromCartesian(cartesian);
      const lat = C.Math.toDegrees(carto.latitude);
      const lng = C.Math.toDegrees(carto.longitude);

      // Measuring mode
      if (measuringRef.current) {
        measurePointsRef.current.push({ lat, lng });
        if (measurePointsRef.current.length === 1) {
          // First point — add billboard
          const ent = viewer.entities.add({
            position: C.Cartesian3.fromDegrees(lng, lat),
            billboard: {
              image: makeMarkerSvg("#00f3ff", true),
              width: 20, height: 26,
              verticalOrigin: C.VerticalOrigin.BOTTOM,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          measureEntitiesRef.current.push(ent);
        } else if (measurePointsRef.current.length === 2) {
          const [p1, p2] = measurePointsRef.current;
          const dist = haversine(p1.lat, p1.lng, p2.lat, p2.lng);
          setMeasureDist(dist);
          const p2ent = viewer.entities.add({
            position: C.Cartesian3.fromDegrees(lng, lat),
            billboard: {
              image: makeMarkerSvg("#00f3ff", true),
              width: 20, height: 26,
              verticalOrigin: C.VerticalOrigin.BOTTOM,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          const lineEnt = viewer.entities.add({
            polyline: {
              positions: [
                C.Cartesian3.fromDegrees(p1.lng, p1.lat),
                C.Cartesian3.fromDegrees(lng, lat),
              ],
              width: 2,
              material: C.Color.fromCssColorString("#00f3ff"),
              clampToGround: true,
            },
          });
          measureEntitiesRef.current.push(p2ent, lineEnt);
          measurePointsRef.current = [];
        }
        return;
      }

      // Add alvo mode
      if (modoAdicionarRef.current) {
        setCoordPendente({ lat, lng });
        setFormAlvo({ lat, lng, prioridade: "ALTA", status: "ATIVO", notas: "", visivel: true });
        setEditando(true);
        setModoAdicionar(false);
        return;
      }

      // Drawing mode
      if (modoDesenhoRef.current) {
        drawPositionsRef.current.push({ lat, lng });
        updateLiveDrawEntity(viewer, C);
        return;
      }

      // Route mode
      if (modoRotaRef.current) {
        const activeId = rotaAtivaIdRef.current;
        if (!activeId) return;
        const rotasNow = rotasRef.current;
        const rIdx = rotasNow.findIndex(r => r.id === activeId);
        if (rIdx === -1) return;
        const rota = rotasNow[rIdx];
        const newPontos = [...rota.pontos, { lat, lng }];
        const newRota = { ...rota, pontos: newPontos };
        const newRotas = [...rotasNow.slice(0, rIdx), newRota, ...rotasNow.slice(rIdx + 1)];
        rotasRef.current = newRotas;
        setRotas(newRotas);
        updateRouteEntity(viewer, C, newRota);
        localStorage.setItem("ncfn_rotas_mapa", JSON.stringify(newRotas));
        return;
      }

      // Click on entity
      const picked = viewer.scene.pick(e.position);
      if (picked && picked.id && picked.id.id) {
        const alvoId = picked.id.id as string;
        setAlvos(prev => {
          const found = prev.find(a => a.id === alvoId);
          if (found) {
            setSelecionado(found);
            setPainelAberto(true);
          }
          return prev;
        });
      }
    }, C.ScreenSpaceEventType.LEFT_CLICK);

    // Double-click → finish drawing
    handler.setInputAction((_e: any) => {
      if (modoDesenhoRef.current) {
        finishDrawing(viewer, C);
      }
    }, C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // Right-click → context menu
    handler.setInputAction((e: any) => {
      const cartesian = viewer.camera.pickEllipsoid(e.position, viewer.scene.globe.ellipsoid);
      if (!cartesian) return;
      const carto = C.Cartographic.fromCartesian(cartesian);
      const lat = C.Math.toDegrees(carto.latitude);
      const lng = C.Math.toDegrees(carto.longitude);
      const rect = cesiumRef.current!.getBoundingClientRect();
      setContextMenu({
        x: e.position.x,
        y: e.position.y,
        lat,
        lng,
      });
    }, C.ScreenSpaceEventType.RIGHT_CLICK);

    setMapCarregado(true);

    // Restore saved routes entities
    const savedRotasRaw = localStorage.getItem("ncfn_rotas_mapa");
    if (savedRotasRaw) {
      try {
        const data: Rota[] = JSON.parse(savedRotasRaw);
        data.forEach(rota => updateRouteEntity(viewer, C, rota));
      } catch (_) {}
    }

    // Restore saved drawings
    const savedDrawings = localStorage.getItem("ncfn_drawings_mapa_cesium");
    if (savedDrawings) {
      try {
        const data = JSON.parse(savedDrawings);
        data.forEach((d: any) => restoreDrawing(viewer, C, d));
      } catch (_) {}
    }
  }

  // ── Imagery switching ──────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium) return;
    const C = window.Cesium;
    viewer.imageryLayers.removeAll();
    if (imageryType === "dark") {
      viewer.imageryLayers.addImageryProvider(
        new C.UrlTemplateImageryProvider({
          url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          subdomains: ["a","b","c","d"], maximumLevel: 19, credit: "© CartoDB",
        })
      );
    } else if (imageryType === "satellite") {
      viewer.imageryLayers.addImageryProvider(
        new C.UrlTemplateImageryProvider({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          maximumLevel: 19, credit: "© ESRI",
        })
      );
    } else if (imageryType === "hybrid") {
      viewer.imageryLayers.addImageryProvider(
        new C.UrlTemplateImageryProvider({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          maximumLevel: 19, credit: "© ESRI",
        })
      );
      viewer.imageryLayers.addImageryProvider(
        new C.UrlTemplateImageryProvider({
          url: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
          subdomains: ["a","b","c","d"], maximumLevel: 19, credit: "© CartoDB",
        })
      );
    } else if (imageryType === "osm") {
      viewer.imageryLayers.addImageryProvider(
        new C.UrlTemplateImageryProvider({
          url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          maximumLevel: 19, credit: "© OpenStreetMap",
        })
      );
    }
  }, [imageryType, mapCarregado]);

  // ── 3D Terrain ────────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium) return;
    const C = window.Cesium;
    if (tilt3d && CESIUM_TOKEN) {
      C.CesiumTerrainProvider.fromIonAssetId(1).then((tp: any) => {
        viewer.terrainProvider = tp;
      }).catch(() => {
        viewer.terrainProvider = new C.EllipsoidTerrainProvider();
      });
    } else {
      viewer.terrainProvider = new C.EllipsoidTerrainProvider();
    }
  }, [tilt3d, mapCarregado]);

  // ── OSM Buildings ─────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium) return;
    const C = window.Cesium;
    if (osmBuildings && CESIUM_TOKEN) {
      C.createOsmBuildingsAsync().then((b: any) => {
        osmBuildingPrimRef.current = viewer.scene.primitives.add(b);
      }).catch(() => {});
    } else {
      if (osmBuildingPrimRef.current) {
        try { viewer.scene.primitives.remove(osmBuildingPrimRef.current); } catch (_) {}
        osmBuildingPrimRef.current = null;
      }
    }
  }, [osmBuildings, mapCarregado]);

  // ── Sync alvo markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!mapCarregado || !viewer || !window.Cesium) return;
    const C = window.Cesium;

    // Remove deleted
    entitiesRef.current.forEach((ent, id) => {
      if (!alvos.find(a => a.id === id)) {
        try { viewer.entities.remove(ent); } catch (_) {}
        entitiesRef.current.delete(id);
      }
    });

    // Add/update
    alvos.forEach(alvo => {
      const cfg = PRIORITY_CONFIG[alvo.prioridade] ?? PRIORITY_CONFIG["ALTA"];
      const svgUrl = makeMarkerSvg(cfg.color, alvo.visivel);
      if (entitiesRef.current.has(alvo.id)) {
        const ent = entitiesRef.current.get(alvo.id);
        ent.position = new C.ConstantPositionProperty(C.Cartesian3.fromDegrees(alvo.lng, alvo.lat));
        ent.billboard.image = svgUrl;
        ent.show = alvo.visivel;
      } else {
        const ent = viewer.entities.add({
          id: alvo.id,
          position: C.Cartesian3.fromDegrees(alvo.lng, alvo.lat),
          billboard: {
            image: svgUrl,
            width: 28,
            height: 36,
            verticalOrigin: C.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: C.HeightReference.CLAMP_TO_GROUND,
          },
          show: alvo.visivel,
        });
        entitiesRef.current.set(alvo.id, ent);
      }
    });
  }, [alvos, mapCarregado]);

  // ── Proximity rings ───────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium) return;
    const C = window.Cesium;
    proximityEntitiesRef.current.forEach(e => { try { viewer.entities.remove(e); } catch (_) {} });
    proximityEntitiesRef.current = [];
    if (!proximityAtivo || !selecionado) return;
    const radii   = [500, 1000, 5000];
    const colors  = ["#00f3ff", "#f59e0b", "#ef4444"];
    radii.forEach((r, i) => {
      const ent = viewer.entities.add({
        position: C.Cartesian3.fromDegrees(selecionado.lng, selecionado.lat),
        ellipse: {
          semiMajorAxis: r,
          semiMinorAxis: r,
          material: C.Color.fromCssColorString(colors[i]).withAlpha(0.04),
          outline: true,
          outlineColor: C.Color.fromCssColorString(colors[i]).withAlpha(0.6),
          outlineWidth: 1.5,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      });
      proximityEntitiesRef.current.push(ent);
    });
  }, [proximityAtivo, selecionado, mapCarregado]);

  // ── Route entity helpers ──────────────────────────────────────────────────
  function updateRouteEntity(viewer: any, C: any, rota: Rota) {
    // Remove existing
    const existing = routeEntitiesRef.current.get(rota.id);
    if (existing) {
      try { viewer.entities.remove(existing.line); } catch (_) {}
      existing.pts.forEach((p: any) => { try { viewer.entities.remove(p); } catch (_) {} });
    }
    if (rota.pontos.length === 0) {
      routeEntitiesRef.current.delete(rota.id);
      return;
    }
    // Point billboards
    const ptEnts: any[] = rota.pontos.map((pt, idx) =>
      viewer.entities.add({
        position: C.Cartesian3.fromDegrees(pt.lng, pt.lat),
        billboard: {
          image: makeRoutePtSvg(rota.color, idx + 1),
          width: 28,
          height: 28,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      })
    );
    // Dashed polyline
    let lineEnt: any = null;
    if (rota.pontos.length > 1) {
      const positions = rota.pontos.map(pt => C.Cartesian3.fromDegrees(pt.lng, pt.lat));
      lineEnt = viewer.entities.add({
        polyline: {
          positions,
          width: 2,
          material: new C.PolylineDashMaterialProperty({
            color: C.Color.fromCssColorString(rota.color),
            dashLength: 16,
          }),
          clampToGround: true,
        },
      });
    }
    routeEntitiesRef.current.set(rota.id, { line: lineEnt, pts: ptEnts });
  }

  // ── Drawing helpers ───────────────────────────────────────────────────────
  function updateLiveDrawEntity(viewer: any, C: any) {
    if (liveDrawEntityRef.current) {
      try { viewer.entities.remove(liveDrawEntityRef.current); } catch (_) {}
      liveDrawEntityRef.current = null;
    }
    const pts = drawPositionsRef.current;
    if (pts.length < 2) return;
    const positions = pts.map(p => C.Cartesian3.fromDegrees(p.lng, p.lat));
    const tool = drawToolRef.current;
    const color = C.Color.fromCssColorString(drawColorRef.current);
    let ent: any;
    if (tool === "polyline") {
      ent = viewer.entities.add({
        polyline: { positions, width: 2, material: color.withAlpha(0.7), clampToGround: true },
      });
    } else {
      ent = viewer.entities.add({
        polyline: { positions: [...positions, positions[0]], width: 1, material: color.withAlpha(0.5), clampToGround: true },
      });
    }
    liveDrawEntityRef.current = ent;
  }

  function restoreDrawing(viewer: any, C: any, d: any) {
    let ent: any = null;
    const color = C.Color.fromCssColorString(d.color ?? "#bc13fe");
    const opacity = d.opacity ?? 0.3;
    if (d.type === "polygon" && d.positions?.length >= 3) {
      const positions = d.positions.map((p: any) => C.Cartesian3.fromDegrees(p.lng, p.lat));
      ent = viewer.entities.add({
        polygon: {
          hierarchy: new C.PolygonHierarchy(positions),
          material: color.withAlpha(opacity),
          outline: true,
          outlineColor: color,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      });
    } else if (d.type === "polyline" && d.positions?.length >= 2) {
      const positions = d.positions.map((p: any) => C.Cartesian3.fromDegrees(p.lng, p.lat));
      ent = viewer.entities.add({
        polyline: { positions, width: 3, material: color, clampToGround: true },
      });
    } else if (d.type === "circle" && d.center && d.radius) {
      ent = viewer.entities.add({
        position: C.Cartesian3.fromDegrees(d.center.lng, d.center.lat),
        ellipse: {
          semiMajorAxis: d.radius,
          semiMinorAxis: d.radius,
          material: color.withAlpha(opacity),
          outline: true,
          outlineColor: color,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      });
    } else if (d.type === "rectangle" && d.bounds) {
      ent = viewer.entities.add({
        rectangle: {
          coordinates: C.Rectangle.fromDegrees(d.bounds.minLng, d.bounds.minLat, d.bounds.maxLng, d.bounds.maxLat),
          material: color.withAlpha(opacity),
          outline: true,
          outlineColor: color,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      });
    }
    if (ent) drawnEntitiesRef.current.push(ent);
  }

  function finishDrawing(viewer: any, C: any) {
    if (liveDrawEntityRef.current) {
      try { viewer.entities.remove(liveDrawEntityRef.current); } catch (_) {}
      liveDrawEntityRef.current = null;
    }
    const pts = drawPositionsRef.current;
    const tool = drawToolRef.current;
    const color = C.Color.fromCssColorString(drawColorRef.current);
    const opacity = drawOpacityRef.current;

    let ent: any = null;
    let serialized: any = null;

    if (tool === "polygon" && pts.length >= 3) {
      const positions = pts.map(p => C.Cartesian3.fromDegrees(p.lng, p.lat));
      ent = viewer.entities.add({
        polygon: {
          hierarchy: new C.PolygonHierarchy(positions),
          material: color.withAlpha(opacity),
          outline: true,
          outlineColor: color,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      });
      serialized = { type: "polygon", positions: pts, color: drawColorRef.current, opacity };
    } else if (tool === "polyline" && pts.length >= 2) {
      const positions = pts.map(p => C.Cartesian3.fromDegrees(p.lng, p.lat));
      ent = viewer.entities.add({
        polyline: { positions, width: 3, material: color, clampToGround: true },
      });
      serialized = { type: "polyline", positions: pts, color: drawColorRef.current };
    } else if (tool === "circle" && pts.length >= 2) {
      const r = haversine(pts[0].lat, pts[0].lng, pts[1].lat, pts[1].lng);
      ent = viewer.entities.add({
        position: C.Cartesian3.fromDegrees(pts[0].lng, pts[0].lat),
        ellipse: {
          semiMajorAxis: r,
          semiMinorAxis: r,
          material: color.withAlpha(opacity),
          outline: true,
          outlineColor: color,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      });
      serialized = { type: "circle", center: pts[0], radius: r, color: drawColorRef.current, opacity };
    } else if (tool === "rectangle" && pts.length >= 2) {
      const minLat = Math.min(pts[0].lat, pts[1].lat);
      const maxLat = Math.max(pts[0].lat, pts[1].lat);
      const minLng = Math.min(pts[0].lng, pts[1].lng);
      const maxLng = Math.max(pts[0].lng, pts[1].lng);
      ent = viewer.entities.add({
        rectangle: {
          coordinates: C.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
          material: color.withAlpha(opacity),
          outline: true,
          outlineColor: color,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      });
      serialized = { type: "rectangle", bounds: { minLat, maxLat, minLng, maxLng }, color: drawColorRef.current, opacity };
    }

    if (ent) drawnEntitiesRef.current.push(ent);
    if (serialized) {
      const raw = localStorage.getItem("ncfn_drawings_mapa_cesium");
      let arr: any[] = [];
      try { if (raw) arr = JSON.parse(raw); } catch (_) {}
      arr.push(serialized);
      localStorage.setItem("ncfn_drawings_mapa_cesium", JSON.stringify(arr));
    }
    drawPositionsRef.current = [];
  }

  const limparDesenhos = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    drawnEntitiesRef.current.forEach(e => { try { viewer.entities.remove(e); } catch (_) {} });
    drawnEntitiesRef.current = [];
    if (liveDrawEntityRef.current) {
      try { viewer.entities.remove(liveDrawEntityRef.current); } catch (_) {}
      liveDrawEntityRef.current = null;
    }
    drawPositionsRef.current = [];
    localStorage.removeItem("ncfn_drawings_mapa_cesium");
  }, []);

  const limparMedicao = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    measureEntitiesRef.current.forEach(e => { try { viewer.entities.remove(e); } catch (_) {} });
    measureEntitiesRef.current = [];
    measurePointsRef.current = [];
    setMeasureDist(null);
  }, []);

  // ── Business logic ────────────────────────────────────────────────────────
  const centralizarAlvo = useCallback((alvo: Alvo) => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium) return;
    const C = window.Cesium;
    viewer.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(alvo.lng, alvo.lat, 50000),
      duration: 1.5,
    });
    setSelecionado(alvo);
  }, []);

  const fitBounds = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium || alvos.length === 0) return;
    const C = window.Cesium;
    const visible = alvos.filter(a => a.visivel);
    if (visible.length === 0) return;
    const positions = visible.map(a => C.Cartesian3.fromDegrees(a.lng, a.lat));
    viewer.camera.flyToBoundingSphere(C.BoundingSphere.fromPoints(positions), { duration: 1.5 });
  }, [alvos]);

  const geolocate = useCallback(() => {
    if (!navigator.geolocation || !viewerRef.current || !window.Cesium) return;
    setGeolocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const C = window.Cesium;
        const viewer = viewerRef.current;
        if (geolocEntityRef.current) {
          try { viewer.entities.remove(geolocEntityRef.current); } catch (_) {}
        }
        const svgPulse = encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="rgba(0,243,255,0.15)" stroke="#00f3ff" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="4" fill="#00f3ff"/>
          </svg>`
        );
        const ent = viewer.entities.add({
          position: C.Cartesian3.fromDegrees(lng, lat),
          billboard: {
            image: "data:image/svg+xml;charset=UTF-8," + svgPulse,
            width: 24, height: 24,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        geolocEntityRef.current = ent;
        viewer.camera.flyTo({
          destination: C.Cartesian3.fromDegrees(lng, lat, 30000),
          duration: 1.5,
        });
        setGeolocLoading(false);
      },
      () => setGeolocLoading(false)
    );
  }, []);

  const geocodeSearch = useCallback(async () => {
    if (!geocodeBusca.trim() || !viewerRef.current || !window.Cesium) return;
    setGeocodeLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geocodeBusca)}&format=json&limit=1`,
        { headers: { "Accept-Language": "pt-BR" } }
      );
      const data = await res.json();
      if (data[0]) {
        const C = window.Cesium;
        viewerRef.current.camera.flyTo({
          destination: C.Cartesian3.fromDegrees(parseFloat(data[0].lon), parseFloat(data[0].lat), 30000),
          duration: 1.5,
        });
      }
    } catch (_) {}
    setGeocodeLoading(false);
  }, [geocodeBusca]);

  const salvarAlvo = () => {
    if (!formAlvo.nome?.trim()) return;
    const agora = new Date().toISOString();
    if (formAlvo.id) {
      setAlvos(prev => prev.map(a => a.id === formAlvo.id ? { ...a, ...formAlvo, atualizadoEm: agora } as Alvo : a));
      setSelecionado(prev => prev?.id === formAlvo.id ? { ...prev, ...formAlvo, atualizadoEm: agora } as Alvo : prev);
    } else {
      const novo: Alvo = {
        id: crypto.randomUUID(),
        nome: formAlvo.nome!,
        lat: formAlvo.lat!,
        lng: formAlvo.lng!,
        prioridade: (formAlvo.prioridade as Priority) || "ALTA",
        status: (formAlvo.status as Status) || "ATIVO",
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
    const blob = new Blob(
      [JSON.stringify({ alvos, exportadoEm: new Date().toISOString(), sistema: "NCFN" }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ncfn_mapa_alvos_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const limparTodosAlvos = async () => {
    if (!window.confirm(`Remover todos os ${alvos.length} alvos do mapa? Esta ação não pode ser desfeita.`)) return;
    const viewer = viewerRef.current;
    if (viewer) {
      entitiesRef.current.forEach(e => { try { viewer.entities.remove(e); } catch (_) {} });
      entitiesRef.current.clear();
    }
    for (const a of alvos) {
      await fetch(`/api/admin/relatorios?id=${a.id}`, { method: "DELETE" }).catch(() => {});
    }
    setAlvos([]);
    setSelecionado(null);
  };

  const novaRota = () => {
    const id = crypto.randomUUID();
    const color = ROTA_COLORS[rotasRef.current.length % ROTA_COLORS.length];
    const nome = `Rota ${rotasRef.current.length + 1}`;
    const nova: Rota = { id, nome, color, pontos: [] };
    const newRotas = [...rotasRef.current, nova];
    rotasRef.current = newRotas;
    setRotas(newRotas);
    setRotaAtivaId(id);
    rotaAtivaIdRef.current = id;
    localStorage.setItem("ncfn_rotas_mapa", JSON.stringify(newRotas));
  };

  const limparRota = (rotaId: string) => {
    const viewer = viewerRef.current;
    if (viewer) {
      const existing = routeEntitiesRef.current.get(rotaId);
      if (existing) {
        try { viewer.entities.remove(existing.line); } catch (_) {}
        existing.pts.forEach((p: any) => { try { viewer.entities.remove(p); } catch (_) {} });
        routeEntitiesRef.current.delete(rotaId);
      }
      const carEnt = vehicleEntitiesRef.current.get(rotaId);
      if (carEnt) { try { viewer.entities.remove(carEnt); } catch (_) {} vehicleEntitiesRef.current.delete(rotaId); }
    }
    const carAnim = vehicleAnimsRef.current.get(rotaId);
    if (carAnim) { clearInterval(carAnim); vehicleAnimsRef.current.delete(rotaId); }
    const newRotas = rotasRef.current.filter(r => r.id !== rotaId);
    rotasRef.current = newRotas;
    setRotas(newRotas);
    if (rotaAtivaIdRef.current === rotaId) {
      const next = newRotas.length > 0 ? newRotas[0].id : null;
      setRotaAtivaId(next);
      rotaAtivaIdRef.current = next;
    }
    localStorage.setItem("ncfn_rotas_mapa", JSON.stringify(newRotas));
  };

  const handleAnimateAll = () => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium) return;
    const C = window.Cesium;

    if (animatingAll) {
      vehicleAnimsRef.current.forEach((interval) => clearInterval(interval));
      vehicleAnimsRef.current.clear();
      vehicleEntitiesRef.current.forEach(e => { try { viewer.entities.remove(e); } catch (_) {} });
      vehicleEntitiesRef.current.clear();
      setAnimatingAll(false);
      return;
    }

    const validRotas = rotasRef.current.filter(r => r.pontos.length >= 2);
    if (validRotas.length === 0) return;
    setAnimatingAll(true);

    validRotas.forEach(rota => {
      const points = rota.pontos;
      const carSvg = encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="17" fill="#1e3a5f" stroke="${rota.color}" stroke-width="2"/>
          <text x="18" y="24" text-anchor="middle" font-size="20">🚔</text>
        </svg>`
      );
      const carEnt = viewer.entities.add({
        position: C.Cartesian3.fromDegrees(points[0].lng, points[0].lat),
        billboard: {
          image: "data:image/svg+xml;charset=UTF-8," + carSvg,
          width: 36, height: 36,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
        },
      });
      vehicleEntitiesRef.current.set(rota.id, carEnt);

      const STEPS_PER_SEGMENT = 120;
      const INTERVAL_MS = 30;
      let segIdx = 0;
      let step = 0;

      const interval = setInterval(() => {
        if (segIdx >= points.length - 1) {
          clearInterval(interval);
          vehicleAnimsRef.current.delete(rota.id);
          if (vehicleAnimsRef.current.size === 0) {
            setTimeout(() => {
              vehicleEntitiesRef.current.forEach(e => { try { viewer.entities.remove(e); } catch (_) {} });
              vehicleEntitiesRef.current.clear();
              setAnimatingAll(false);
            }, 1200);
          }
          return;
        }
        const p1 = points[segIdx];
        const p2 = points[segIdx + 1];
        const t = step / STEPS_PER_SEGMENT;
        const lat = p1.lat + (p2.lat - p1.lat) * t;
        const lng = p1.lng + (p2.lng - p1.lng) * t;
        carEnt.position = new C.ConstantPositionProperty(C.Cartesian3.fromDegrees(lng, lat));
        step++;
        if (step > STEPS_PER_SEGMENT) { step = 0; segIdx++; }
      }, INTERVAL_MS);

      vehicleAnimsRef.current.set(rota.id, interval);
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDist = (m: number) => {
    if (m >= 1000) return (m / 1000).toFixed(1) + " km";
    return Math.round(m) + " m";
  };

  const alvosFiltered = alvos.filter(a => {
    if (filtroPrioridade !== "TODOS" && a.prioridade !== filtroPrioridade) return false;
    if (filtroStatus !== "TODOS" && a.status !== filtroStatus) return false;
    if (busca)
      return (
        a.nome.toLowerCase().includes(busca.toLowerCase()) ||
        a.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        a.notas.toLowerCase().includes(busca.toLowerCase())
      );
    return true;
  });

  const statsCritica = alvos.filter(a => a.prioridade === "CRÍTICA").length;
  const statsAtivos  = alvos.filter(a => a.status === "ATIVO").length;

  const currentMode  = modoAdicionar ? "MARCANDO ALVO" : modoRota ? "MODO ROTA" : modoDesenho ? "MODO DESENHO" : measuring ? "MEDINDO DISTÂNCIA" : null;
  const modeColor    = modoAdicionar ? "#ef4444" : modoRota ? "#f59e0b" : measuring ? "#00f3ff" : "#bc13fe";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col bg-black overflow-hidden ${mapFullscreen ? "fixed inset-0 z-[500]" : "h-screen"}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
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

        {/* Stats */}
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

        {/* Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 max-w-[55vw]">

          {/* Imagery type */}
          <div className="flex items-center gap-1 bg-black/60 border border-gray-800 rounded-lg p-1">
            <span className="text-[8px] text-gray-700 font-mono uppercase tracking-wider px-1">Camadas</span>
            {([
              { key: "dark",      label: "DARK" },
              { key: "satellite", label: "SAT"  },
              { key: "hybrid",    label: "HBR"  },
              { key: "osm",       label: "OSM"  },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setImageryType(key)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider transition border ${imageryType === key
                  ? "bg-[#00f3ff]/15 border-[#00f3ff]/40 text-[#00f3ff]"
                  : "border-transparent text-gray-600 hover:text-gray-300"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Fullscreen */}
          <button onClick={() => setMapFullscreen(v => !v)} title="Mapa em tela cheia"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition ${mapFullscreen
              ? "bg-[#00f3ff]/10 border-[#00f3ff]/40 text-[#00f3ff]"
              : "border-gray-800 text-gray-500 hover:text-[#00f3ff] hover:border-[#00f3ff]/30"}`}>
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* 3D Terrain */}
          <button onClick={() => setTilt3d(v => !v)} title={CESIUM_TOKEN ? "Terreno 3D" : "Token necessário para terreno 3D"}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition ${tilt3d
              ? "bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
              : "border-gray-800 text-gray-500 hover:text-white hover:border-gray-600"}`}>
            <Mountain className="w-3 h-3" /> 3D
          </button>

          {/* OSM Buildings */}
          {CESIUM_TOKEN && (
            <button onClick={() => setOsmBuildings(v => !v)} title="Edifícios 3D OSM"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition ${osmBuildings
                ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                : "border-gray-800 text-gray-500 hover:text-white hover:border-gray-600"}`}>
              3D Bld
            </button>
          )}

          {/* Measuring */}
          <button onClick={() => {
            const next = !measuring;
            setMeasuring(next);
            if (!next) limparMedicao();
            if (next) { setModoAdicionar(false); setModoRota(false); setModoDesenho(false); }
          }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition ${measuring
              ? "bg-[#00f3ff]/10 border-[#00f3ff]/40 text-[#00f3ff] animate-pulse"
              : "border-gray-800 text-gray-500 hover:text-[#00f3ff] hover:border-[#00f3ff]/30"}`}
            title="Medir distância (2 cliques)">
            📏
          </button>

          {/* Route mode */}
          <button onClick={() => {
            const next = !modoRota;
            setModoRota(next);
            if (next) {
              setModoAdicionar(false);
              setModoDesenho(false);
              setMeasuring(false);
              if (rotasRef.current.length === 0) {
                const id = crypto.randomUUID();
                const nova: Rota = { id, nome: "Rota 1", color: ROTA_COLORS[0], pontos: [] };
                rotasRef.current = [nova];
                setRotas([nova]);
                setRotaAtivaId(id);
                rotaAtivaIdRef.current = id;
                localStorage.setItem("ncfn_rotas_mapa", JSON.stringify([nova]));
              }
            }
          }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition ${modoRota
              ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse"
              : "border-gray-800 text-gray-500 hover:text-white hover:border-gray-600"}`}>
            <Navigation2 className="w-3 h-3" /> ROTA
          </button>
          {rotas.length > 0 && (
            <button onClick={novaRota} title="Nova rota"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border border-yellow-900/50 text-yellow-600 hover:text-yellow-400 hover:border-yellow-500/40 transition">
              <Plus className="w-3 h-3" />
            </button>
          )}
          {rotas.some(r => r.pontos.length >= 2) && (
            <button onClick={handleAnimateAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition ${animatingAll
                ? "bg-[#00f3ff]/10 border-[#00f3ff]/40 text-[#00f3ff] animate-pulse"
                : "border-[#00f3ff]/30 text-[#00f3ff]/70 hover:bg-[#00f3ff]/10 hover:text-[#00f3ff]"}`}>
              {animatingAll ? "⏹ Parar" : "🚔 Animar"}
            </button>
          )}

          {/* Drawing mode */}
          <button onClick={() => {
            const next = !modoDesenho;
            setModoDesenho(next);
            if (next) { setModoAdicionar(false); setModoRota(false); setMeasuring(false); }
            else { drawPositionsRef.current = []; }
          }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition ${modoDesenho
              ? "bg-[#bc13fe]/20 border-[#bc13fe]/50 text-[#bc13fe] shadow-[0_0_8px_rgba(188,19,254,0.3)]"
              : "border-gray-800 text-gray-500 hover:text-white hover:border-gray-600"}`}>
            <PenLine className="w-3 h-3" /> DESENHO
          </button>

          {/* Fit bounds */}
          <button onClick={fitBounds} title="Enquadrar todos os alvos"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition border-gray-800 text-gray-500 hover:text-white hover:border-gray-600">
            <Target className="w-3 h-3" />
          </button>

          {/* Geolocate */}
          <button onClick={geolocate} disabled={geolocLoading} title="Minha localização"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition ${geolocLoading
              ? "border-[#00f3ff]/40 text-[#00f3ff] animate-pulse"
              : "border-gray-800 text-gray-500 hover:text-[#00f3ff] hover:border-[#00f3ff]/30"}`}>
            <Crosshair className="w-3 h-3" />
          </button>

          {/* Proximity rings */}
          <button onClick={() => setProximityAtivo(v => !v)} title="Anéis de proximidade"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition ${proximityAtivo
              ? "bg-[#00f3ff]/10 border-[#00f3ff]/40 text-[#00f3ff]"
              : "border-gray-800 text-gray-500 hover:text-white"}`}>
            <Radio className="w-3 h-3" />
          </button>

          <button onClick={exportarJSON}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-gray-400 border border-gray-800 rounded-lg hover:border-gray-600 hover:text-white transition">
            <Download className="w-3 h-3" />
          </button>

          {alvos.length > 0 && (
            <button onClick={limparTodosAlvos}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-red-600 border border-red-900/40 rounded-lg hover:border-red-600/50 hover:text-red-400 transition"
              title="Limpar todos os alvos">
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <button onClick={() => setPainelAberto(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold border rounded-lg transition border-gray-800 text-gray-400 hover:text-white">
            <Layers className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left sidebar ─────────────────────────────────────────────── */}
        {painelAberto && (
          <div className="w-80 flex-shrink-0 flex flex-col border-r border-[#bc13fe]/15 bg-black/95 z-10">
            <div className="p-3 space-y-2 border-b border-gray-900">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5">
                  <Search className="w-3 h-3 text-gray-600" />
                  <input value={busca} onChange={e => setBusca(e.target.value)}
                    placeholder="buscar alvo, código..."
                    className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder-gray-700" />
                </div>
                <button
                  onClick={() => {
                    const next = !modoAdicionar;
                    setModoAdicionar(next);
                    if (next) { setModoRota(false); setModoDesenho(false); setMeasuring(false); }
                    setSelecionado(null);
                    setEditando(false);
                  }}
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

              <div className="flex gap-1 flex-wrap">
                {(["TODOS", "CRÍTICA", "ALTA", "MÉDIA", "BAIXA"] as const).map(p => (
                  <button key={p} onClick={() => setFiltroPrioridade(p as any)}
                    className={`px-2 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider transition border ${filtroPrioridade === p
                      ? p === "TODOS" ? "bg-white/10 border-white/20 text-white" : ""
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
                    const cfg    = PRIORITY_CONFIG[alvo.prioridade] ?? PRIORITY_CONFIG["ALTA"];
                    const stCfg  = STATUS_CONFIG[alvo.status] ?? STATUS_CONFIG["ATIVO"];
                    const isSel  = selecionado?.id === alvo.id;
                    return (
                      <div key={alvo.id}
                        onClick={() => { centralizarAlvo(alvo); setSelecionado(alvo); }}
                        className={`flex items-center gap-3 px-3 py-2.5 border-b cursor-pointer transition-all ${isSel
                          ? "bg-[#bc13fe]/8 border-b-[#bc13fe]/20"
                          : "border-b-gray-900/60 hover:bg-white/2"}`}>
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

        {/* ── Map area ─────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <div ref={cesiumRef} className="w-full h-full" style={{ background: "#050510" }} />

          {/* Error */}
          {mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 gap-4 px-8">
              <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
              <div className="text-center space-y-1">
                <p className="text-red-400 font-black text-sm uppercase tracking-widest">Falha ao Carregar Mapa</p>
                <p className="text-gray-500 text-xs font-mono leading-relaxed max-w-md">{mapError}</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {!mapCarregado && !mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
              <div className="relative mb-6">
                <Globe className="w-12 h-12 text-[#bc13fe] animate-spin" style={{ animationDuration: "2s" }} />
                <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
              </div>
              <p className="text-[10px] text-[#bc13fe] font-mono uppercase tracking-[0.3em]">Carregando CesiumJS...</p>
            </div>
          )}

          {/* Mode badge */}
          {currentMode && mapCarregado && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse border"
              style={{
                background: modeColor + "20",
                borderColor: modeColor + "60",
                color: modeColor,
                boxShadow: `0 0 12px ${modeColor}40`,
              }}>
              {currentMode}
            </div>
          )}

          {/* Measure distance badge */}
          {measuring && measureDist !== null && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full font-black text-[11px] border border-[#00f3ff]/40 bg-black/80 text-[#00f3ff] backdrop-blur-sm flex items-center gap-2">
              📏 {formatDist(measureDist)}
              <button onClick={limparMedicao} className="ml-2 text-gray-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Drawing toolbar */}
          {modoDesenho && mapCarregado && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#bc13fe]/30 backdrop-blur-md"
              style={{ background: "rgba(0,0,0,0.85)" }}>
              <div className="flex items-center gap-1 border-r border-gray-800 pr-2">
                {(["polygon", "circle", "rectangle", "polyline"] as const).map(tool => (
                  <button key={tool} onClick={() => setDrawTool(tool)}
                    className={`px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wider transition border ${drawTool === tool
                      ? "bg-[#bc13fe]/20 border-[#bc13fe]/40 text-[#bc13fe]"
                      : "border-gray-800 text-gray-600 hover:text-gray-300"}`}>
                    {tool === "polygon" ? "Polígono" : tool === "circle" ? "Círculo" : tool === "rectangle" ? "Retângulo" : "Linha"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 border-r border-gray-800 pr-2">
                <span className="text-[9px] text-gray-600 uppercase">Cor</span>
                <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
              </div>
              <div className="flex items-center gap-1.5 border-r border-gray-800 pr-2">
                <span className="text-[9px] text-gray-600 uppercase">Op</span>
                <input type="range" min={0.1} max={0.9} step={0.05} value={drawOpacity}
                  onChange={e => setDrawOpacity(parseFloat(e.target.value))}
                  className="w-16 accent-[#bc13fe]" />
                <span className="text-[9px] text-gray-500 w-6">{Math.round(drawOpacity * 100)}%</span>
              </div>
              <button onClick={limparDesenhos}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-red-500 border border-red-900/40 rounded hover:bg-red-950/30 transition">
                <Trash2 className="w-3 h-3" /> Limpar
              </button>
              <span className="text-[8px] text-gray-600 border-l border-gray-800 pl-2">
                {drawTool === "circle" ? "1° clique=centro, 2°=raio" : drawTool === "rectangle" ? "2 cantos" : "Duplo-clique finaliza"}
              </span>
            </div>
          )}

          {/* Multi-route panel */}
          {rotas.length > 0 && mapCarregado && (
            <div className="absolute bottom-14 left-3 z-20 rounded-xl border border-yellow-500/30 backdrop-blur-md overflow-hidden"
              style={{ background: "rgba(0,0,0,0.92)", minWidth: 220, maxWidth: 260 }}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-yellow-500/20">
                <div className="flex items-center gap-1.5">
                  <Navigation2 className="w-3 h-3 text-yellow-400" />
                  <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">ROTAS ({rotas.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {rotas.some(r => r.pontos.length >= 2) && (
                    <button onClick={handleAnimateAll}
                      className={`text-[8px] font-bold border rounded px-1.5 py-0.5 transition ${animatingAll
                        ? "text-[#00f3ff] border-[#00f3ff]/40 bg-[#00f3ff]/10 animate-pulse"
                        : "text-[#00f3ff]/70 border-[#00f3ff]/30 hover:bg-[#00f3ff]/10 hover:text-[#00f3ff]"}`}>
                      {animatingAll ? "⏹ Parar" : "🚔 Animar Todas"}
                    </button>
                  )}
                  <button onClick={novaRota}
                    className="text-[8px] font-bold text-yellow-500 border border-yellow-900/40 rounded px-1.5 py-0.5 hover:bg-yellow-950/30 transition">
                    + Nova
                  </button>
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {rotas.map(rota => {
                  const isAtiva = rota.id === rotaAtivaId;
                  const totalDist = rota.pontos.length > 1
                    ? rota.pontos.slice(1).reduce((acc, pt, i) => acc + haversine(rota.pontos[i].lat, rota.pontos[i].lng, pt.lat, pt.lng), 0)
                    : 0;
                  return (
                    <div key={rota.id}
                      onClick={() => { setRotaAtivaId(rota.id); rotaAtivaIdRef.current = rota.id; }}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-900/60 transition ${isAtiva ? "bg-white/5" : "hover:bg-white/3"}`}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rota.color, boxShadow: `0 0 6px ${rota.color}` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate" style={{ color: isAtiva ? rota.color : "#9ca3af" }}>{rota.nome}</p>
                        <p className="text-[8px] text-gray-600 font-mono">
                          {rota.pontos.length} pt{rota.pontos.length !== 1 ? "s" : ""}
                          {totalDist > 0 ? ` · ${formatDist(totalDist)}` : ""}
                        </p>
                      </div>
                      {isAtiva && modoRota && (
                        <span className="text-[7px] font-black text-yellow-400 uppercase tracking-wider animate-pulse">ATIVO</span>
                      )}
                      <button onClick={e => { e.stopPropagation(); limparRota(rota.id); }}
                        className="p-0.5 text-red-700 hover:text-red-400 transition flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proximity rings legend */}
          {proximityAtivo && selecionado && mapCarregado && (
            <div className="absolute bottom-14 left-3 z-20 bg-black/80 border border-gray-700 rounded-xl p-2.5 backdrop-blur-sm">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Raios de proximidade</p>
              {[["500m", "#00f3ff"], ["1 km", "#f59e0b"], ["5 km", "#ef4444"]].map(([label, color]) => (
                <div key={label} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-0.5 rounded" style={{ background: color }} />
                  <span className="text-[9px] font-mono" style={{ color }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom status bar */}
          {mapCarregado && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/80 border border-gray-800 rounded-full backdrop-blur-sm z-10">
              <Navigation className="w-3 h-3 text-[#bc13fe]" />
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                {alvos.length} alvo{alvos.length !== 1 ? "s" : ""} mapeado{alvos.length !== 1 ? "s" : ""}
              </span>
              <span className="text-gray-800">·</span>
              <span className="text-[9px] font-mono text-gray-600">CesiumJS 1.121 · NCFN GEOINT</span>
              {!CESIUM_TOKEN && (
                <>
                  <span className="text-gray-800">·</span>
                  <span className="text-[9px] font-mono text-yellow-700">token não configurado</span>
                </>
              )}
            </div>
          )}

          {/* Geocoding search bar */}
          {mapCarregado && (
            <div className="absolute top-3 right-3 flex items-center gap-1 z-20" style={{ maxWidth: 300 }}>
              <div className="flex-1 flex items-center gap-2 bg-black/90 border border-gray-700 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                <Search className="w-3 h-3 text-gray-500 flex-shrink-0" />
                <input
                  value={geocodeBusca}
                  onChange={e => setGeocodeBusca(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && geocodeSearch()}
                  placeholder="Buscar endereço..."
                  className="bg-transparent text-[11px] text-white outline-none w-full placeholder-gray-600"
                />
                {geocodeBusca && (
                  <button onClick={() => setGeocodeBusca("")}>
                    <X className="w-3 h-3 text-gray-600 hover:text-gray-300" />
                  </button>
                )}
              </div>
              <button onClick={geocodeSearch} disabled={geocodeLoading}
                className="px-3 py-1.5 bg-black/90 border border-gray-700 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:border-gray-500 transition disabled:opacity-50">
                {geocodeLoading ? "..." : "Ir"}
              </button>
            </div>
          )}

          {/* Right-click context menu */}
          {contextMenu && (
            <div ref={contextMenuRef}
              className="absolute z-50 bg-black/95 border border-gray-700 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm"
              style={{ left: contextMenu.x + 8, top: contextMenu.y + 8, minWidth: 200 }}>
              <div className="px-3 py-2 border-b border-gray-800">
                <p className="text-[9px] font-mono text-gray-500">
                  {contextMenu.lat.toFixed(6)}, {contextMenu.lng.toFixed(6)}
                </p>
              </div>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition text-left"
                onClick={() => {
                  navigator.clipboard.writeText(`${contextMenu.lat.toFixed(6)}, ${contextMenu.lng.toFixed(6)}`);
                  setContextMenu(null);
                }}>
                <Lock className="w-3 h-3 text-gray-600" /> Copiar coordenadas
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition text-left"
                onClick={() => {
                  setFormAlvo({ lat: contextMenu.lat, lng: contextMenu.lng, prioridade: "ALTA", status: "ATIVO", notas: "", visivel: true });
                  setCoordPendente({ lat: contextMenu.lat, lng: contextMenu.lng });
                  setEditando(true);
                  setModoAdicionar(false);
                  setContextMenu(null);
                }}>
                <Plus className="w-3 h-3 text-[#bc13fe]" /> Adicionar alvo aqui
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition text-left"
                onClick={() => {
                  window.open(`https://www.google.com/maps?q=${contextMenu.lat},${contextMenu.lng}`, "_blank");
                  setContextMenu(null);
                }}>
                <MapPin className="w-3 h-3 text-green-400" /> Abrir no Google Maps
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition text-left"
                onClick={() => {
                  window.open(`https://earth.google.com/web/@${contextMenu.lat},${contextMenu.lng},1000a,1000d`, "_blank");
                  setContextMenu(null);
                }}>
                <Globe className="w-3 h-3 text-blue-400" /> Ver no Google Earth
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition text-left"
                onClick={() => {
                  setModoRota(true);
                  setModoAdicionar(false);
                  setModoDesenho(false);
                  setMeasuring(false);
                  setContextMenu(null);
                }}>
                <Navigation className="w-3 h-3 text-[#f59e0b]" /> Iniciar rota daqui
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel (selected alvo detail) ───────────────────────── */}
        {selecionado && !editando && (
          <div className="w-72 flex-shrink-0 flex flex-col border-l border-[#bc13fe]/15 bg-black/97 z-10 overflow-y-auto">
            {(() => {
              const cfg   = PRIORITY_CONFIG[selecionado.prioridade];
              const stCfg = STATUS_CONFIG[selecionado.status];
              return (
                <>
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

        {/* ── Edit/create modal ─────────────────────────────────────────── */}
        {editando && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-gray-950 border border-[#bc13fe]/30 rounded-2xl w-full max-w-md shadow-[0_0_40px_rgba(188,19,254,0.15)]">
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

              <div className="p-5 space-y-4">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Prioridade</label>
                    <select value={formAlvo.prioridade || "ALTA"}
                      onChange={e => setFormAlvo(v => ({ ...v, prioridade: e.target.value as Priority }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#bc13fe]/50 transition">
                      <option>CRÍTICA</option><option>ALTA</option><option>MÉDIA</option><option>BAIXA</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Status</label>
                    <select value={formAlvo.status || "ATIVO"}
                      onChange={e => setFormAlvo(v => ({ ...v, status: e.target.value as Status }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#bc13fe]/50 transition">
                      <option>ATIVO</option><option>MONITORANDO</option><option>NEUTRALIZADO</option><option>ARQUIVADO</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Latitude</label>
                    <input type="number" step="any" value={formAlvo.lat || ""}
                      onChange={e => setFormAlvo(v => ({ ...v, lat: parseFloat(e.target.value) }))}
                      placeholder="-23.5505"
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#bc13fe]/50 transition" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Longitude</label>
                    <input type="number" step="any" value={formAlvo.lng || ""}
                      onChange={e => setFormAlvo(v => ({ ...v, lng: parseFloat(e.target.value) }))}
                      placeholder="-46.6333"
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#bc13fe]/50 transition" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Notas Operacionais</label>
                  <textarea value={formAlvo.notas || ""}
                    onChange={e => setFormAlvo(v => ({ ...v, notas: e.target.value }))}
                    placeholder="Informações táticas, observações, referências..."
                    rows={3}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#bc13fe]/50 placeholder-gray-700 transition resize-none" />
                </div>
              </div>

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

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-900 bg-black/95 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <span className="text-gray-400 font-semibold">Dica:</span> Clique duplo para finalizar polígonos/linhas. Para medição, clique em dois pontos.{" "}
          Para edifícios 3D configure{" "}
          <span className="text-[#00f3ff]/80 font-mono text-[10px]">NEXT_PUBLIC_CESIUM_TOKEN</span>.
        </p>
        <p className="text-[9px] text-gray-700 font-mono flex-shrink-0">CesiumJS 1.121 · NCFN Geointeligência Operacional</p>
      </div>
    </div>
  );
}
