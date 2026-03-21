"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Plus, Trash2, Eye, EyeOff, Search,
  Target, AlertTriangle, Shield, Download, X, Edit3,
  ChevronRight, Crosshair, Layers, Navigation, Radio,
  Clock, StickyNote, Flag, Lock, Unlock, RefreshCw,
  Navigation2, PenLine, Maximize2,
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

  // 3D tilt
  const [tilt3d, setTilt3d] = useState(false);

  // Route mode
  const [modoRota, setModoRota] = useState(false);
  const rotaWaypointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const rotaMarkersRef = useRef<any[]>([]);
  const rotaPolylineRef = useRef<any>(null);
  const [rotaDistancias, setRotaDistancias] = useState<{ seg: number[]; total: number } | null>(null);

  // Drawing
  const drawingManagerRef = useRef<any>(null);
  const drawnShapesRef = useRef<any[]>([]);
  const [modoDesenho, setModoDesenho] = useState(false);
  const [drawTool, setDrawTool] = useState<"polygon" | "circle" | "rectangle" | "polyline">("polygon");
  const [drawColor, setDrawColor] = useState("#bc13fe");
  const [drawOpacity, setDrawOpacity] = useState(0.3);
  const [savedDrawings, setSavedDrawings] = useState<any[]>([]);

  // Refs to avoid stale closures in drawing
  const drawColorRef = useRef(drawColor);
  const drawOpacityRef = useRef(drawOpacity);
  useEffect(() => { drawColorRef.current = drawColor; }, [drawColor]);
  useEffect(() => { drawOpacityRef.current = drawOpacity; }, [drawOpacity]);

  // Middle mouse drag refs
  const isDraggingMiddleRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // ── SURPRISE FEATURES ─────────────────────────────────────────────────────

  // 1. Context menu (right-click)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 2. Proximity rings (show 500m/1km/5km circles around selected alvo)
  const proximityCirclesRef = useRef<any[]>([]);
  const [proximityAtivo, setProximityAtivo] = useState(false);

  // 3. Heading (compass rotation for 3D)
  const [heading, setHeading] = useState(0);

  // 4. Geolocation
  const [geolocLoading, setGeolocLoading] = useState(false);
  const geolocMarkerRef = useRef<any>(null);

  // 5. Geocoding search
  const [geocodeBusca, setGeocodeBusca] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Heading effect
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setHeading(heading);
  }, [heading]);

  // Proximity rings effect
  useEffect(() => {
    // Clear old circles
    proximityCirclesRef.current.forEach(c => c.setMap(null));
    proximityCirclesRef.current = [];
    if (!proximityAtivo || !selecionado || !mapInstanceRef.current) return;
    const radii = [500, 1000, 5000];
    const colors = ["#00f3ff", "#f59e0b", "#ef4444"];
    radii.forEach((r, i) => {
      const circle = new window.google.maps.Circle({
        center: { lat: selecionado.lat, lng: selecionado.lng },
        radius: r,
        map: mapInstanceRef.current,
        strokeColor: colors[i],
        strokeOpacity: 0.6,
        strokeWeight: 1.5,
        fillColor: colors[i],
        fillOpacity: 0.04,
        zIndex: 0,
      });
      proximityCirclesRef.current.push(circle);
    });
  }, [proximityAtivo, selecionado]);

  // Geolocate
  const geolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeolocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat, lng });
          mapInstanceRef.current.setZoom(14);
          if (geolocMarkerRef.current) geolocMarkerRef.current.setMap(null);
          const svgPulse = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="rgba(0,243,255,0.15)" stroke="#00f3ff" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="4" fill="#00f3ff"/>
          </svg>`;
          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstanceRef.current,
            icon: { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgPulse), scaledSize: new window.google.maps.Size(24, 24), anchor: new window.google.maps.Point(12, 12) },
            title: "Sua localização",
            zIndex: 9999,
          });
          geolocMarkerRef.current = marker;
        }
        setGeolocLoading(false);
      },
      () => setGeolocLoading(false)
    );
  }, []);

  // Fit all alvos in bounds
  const fitBounds = useCallback(() => {
    if (!mapInstanceRef.current || alvos.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    alvos.filter(a => a.visivel).forEach(a => bounds.extend({ lat: a.lat, lng: a.lng }));
    mapInstanceRef.current.fitBounds(bounds, 60);
  }, [alvos]);

  // Geocode search
  const geocodeSearch = useCallback(async () => {
    if (!geocodeBusca.trim() || !mapInstanceRef.current) return;
    setGeocodeLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: geocodeBusca }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          const loc = results[0].geometry.location;
          mapInstanceRef.current.panTo(loc);
          mapInstanceRef.current.setZoom(13);
        }
        setGeocodeLoading(false);
      });
    } catch { setGeocodeLoading(false); }
  }, [geocodeBusca]);

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=drawing,geometry&callback=initMap&v=weekly`;
    script.async = true;
    script.defer = true;
    window.initMap = initMap;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
      delete window.initMap;
    };
  }, []);

  // Save drawings to localStorage
  const saveDrawings = useCallback(() => {
    const serialized = drawnShapesRef.current.map((shape: any) => {
      if (shape instanceof window.google.maps.Polygon) {
        const path = shape.getPath().getArray().map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
        return { type: "polygon", path, fillColor: shape.fillColor, fillOpacity: shape.fillOpacity, strokeColor: shape.strokeColor };
      } else if (shape instanceof window.google.maps.Circle) {
        const c = shape.getCenter();
        return { type: "circle", center: { lat: c.lat(), lng: c.lng() }, radius: shape.getRadius(), fillColor: shape.fillColor, fillOpacity: shape.fillOpacity, strokeColor: shape.strokeColor };
      } else if (shape instanceof window.google.maps.Rectangle) {
        const b = shape.getBounds();
        return { type: "rectangle", bounds: { north: b.getNorthEast().lat(), south: b.getSouthWest().lat(), east: b.getNorthEast().lng(), west: b.getSouthWest().lng() }, fillColor: shape.fillColor, fillOpacity: shape.fillOpacity, strokeColor: shape.strokeColor };
      } else if (shape instanceof window.google.maps.Polyline) {
        const path = shape.getPath().getArray().map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
        return { type: "polyline", path, strokeColor: shape.strokeColor };
      }
      return null;
    }).filter(Boolean);
    localStorage.setItem("ncfn_drawings_mapa", JSON.stringify(serialized));
    setSavedDrawings(serialized);
  }, []);

  // Load drawings from localStorage
  const loadDrawings = useCallback((map: any) => {
    const raw = localStorage.getItem("ncfn_drawings_mapa");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      data.forEach((d: any) => {
        let shape: any = null;
        if (d.type === "polygon") {
          shape = new window.google.maps.Polygon({
            paths: d.path,
            fillColor: d.fillColor || "#bc13fe",
            fillOpacity: d.fillOpacity ?? 0.3,
            strokeColor: d.strokeColor || "#bc13fe",
            strokeWeight: 2,
            map,
          });
        } else if (d.type === "circle") {
          shape = new window.google.maps.Circle({
            center: d.center,
            radius: d.radius,
            fillColor: d.fillColor || "#bc13fe",
            fillOpacity: d.fillOpacity ?? 0.3,
            strokeColor: d.strokeColor || "#bc13fe",
            strokeWeight: 2,
            map,
          });
        } else if (d.type === "rectangle") {
          shape = new window.google.maps.Rectangle({
            bounds: d.bounds,
            fillColor: d.fillColor || "#bc13fe",
            fillOpacity: d.fillOpacity ?? 0.3,
            strokeColor: d.strokeColor || "#bc13fe",
            strokeWeight: 2,
            map,
          });
        } else if (d.type === "polyline") {
          shape = new window.google.maps.Polyline({
            path: d.path,
            strokeColor: d.strokeColor || "#bc13fe",
            strokeWeight: 3,
            map,
          });
        }
        if (shape) drawnShapesRef.current.push(shape);
      });
    } catch (_) {}
  }, []);

  // Restore route from localStorage
  const loadRota = useCallback((map: any) => {
    const raw = localStorage.getItem("ncfn_rota_mapa");
    if (!raw) return;
    try {
      const pts: { lat: number; lng: number }[] = JSON.parse(raw);
      if (!pts.length) return;
      rotaWaypointsRef.current = pts;
      pts.forEach((pt, idx) => {
        const svgNum = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="13" fill="#f59e0b" stroke="#000" stroke-width="1.5"/>
          <text x="14" y="19" text-anchor="middle" font-size="12" font-weight="bold" fill="#000">${idx + 1}</text>
        </svg>`;
        const marker = new window.google.maps.Marker({
          position: pt,
          map,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgNum),
            scaledSize: new window.google.maps.Size(28, 28),
            anchor: new window.google.maps.Point(14, 14),
          },
          title: `Ponto ${idx + 1}`,
        });
        rotaMarkersRef.current.push(marker);
      });
      if (pts.length > 1) {
        const poly = new window.google.maps.Polyline({
          path: pts,
          strokeColor: "#f59e0b",
          strokeWeight: 2,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "16px" }],
          strokeOpacity: 0,
          map,
        });
        rotaPolylineRef.current = poly;
      }
      // calculate distances
      const segs: number[] = [];
      for (let i = 1; i < pts.length; i++) {
        const d = window.google.maps.geometry.spherical.computeDistanceBetween(
          new window.google.maps.LatLng(pts[i - 1].lat, pts[i - 1].lng),
          new window.google.maps.LatLng(pts[i].lat, pts[i].lng)
        );
        segs.push(d);
      }
      const total = segs.reduce((a, b) => a + b, 0);
      if (segs.length) setRotaDistancias({ seg: segs, total });
    } catch (_) {}
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
      tilt: 0,
    });
    mapInstanceRef.current = map;
    infoWindowRef.current = new window.google.maps.InfoWindow();

    // Middle mouse drag
    const mapDiv = mapRef.current;
    mapDiv.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        isDraggingMiddleRef.current = true;
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
      }
    });
    mapDiv.addEventListener("mousemove", (e: MouseEvent) => {
      if (isDraggingMiddleRef.current) {
        const deltaX = e.clientX - lastXRef.current;
        const deltaY = e.clientY - lastYRef.current;
        map.panBy(-deltaX, -deltaY);
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
      }
    });
    mapDiv.addEventListener("mouseup", (e: MouseEvent) => {
      if (e.button === 1) {
        isDraggingMiddleRef.current = false;
      }
    });

    map.addListener("click", (e: any) => {
      if (modoAdicionarRef.current) {
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
        return;
      }
      if (modoRotaRef.current) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const newPts = [...rotaWaypointsRef.current, { lat, lng }];
        rotaWaypointsRef.current = newPts;

        const idx = newPts.length - 1;
        const svgNum = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="13" fill="#f59e0b" stroke="#000" stroke-width="1.5"/>
          <text x="14" y="19" text-anchor="middle" font-size="12" font-weight="bold" fill="#000">${idx + 1}</text>
        </svg>`;
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgNum),
            scaledSize: new window.google.maps.Size(28, 28),
            anchor: new window.google.maps.Point(14, 14),
          },
          title: `Ponto ${idx + 1}`,
        });
        rotaMarkersRef.current.push(marker);

        // update polyline
        if (rotaPolylineRef.current) {
          rotaPolylineRef.current.setPath(newPts);
        } else {
          const poly = new window.google.maps.Polyline({
            path: newPts,
            strokeColor: "#f59e0b",
            strokeWeight: 2,
            icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "16px" }],
            strokeOpacity: 0,
            map,
          });
          rotaPolylineRef.current = poly;
        }

        // distances
        if (newPts.length > 1) {
          const segs: number[] = [];
          for (let i = 1; i < newPts.length; i++) {
            const d = window.google.maps.geometry.spherical.computeDistanceBetween(
              new window.google.maps.LatLng(newPts[i - 1].lat, newPts[i - 1].lng),
              new window.google.maps.LatLng(newPts[i].lat, newPts[i].lng)
            );
            segs.push(d);
          }
          const total = segs.reduce((a, b) => a + b, 0);
          setRotaDistancias({ seg: segs, total });
        }

        // save route
        localStorage.setItem("ncfn_rota_mapa", JSON.stringify(newPts));
        return;
      }
    });

    // Drawing manager
    const dm = new window.google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: { fillColor: "#bc13fe", fillOpacity: 0.3, strokeColor: "#bc13fe", strokeWeight: 2, clickable: true, editable: false },
      circleOptions: { fillColor: "#bc13fe", fillOpacity: 0.3, strokeColor: "#bc13fe", strokeWeight: 2, clickable: true, editable: false },
      rectangleOptions: { fillColor: "#bc13fe", fillOpacity: 0.3, strokeColor: "#bc13fe", strokeWeight: 2, clickable: true, editable: false },
      polylineOptions: { strokeColor: "#bc13fe", strokeWeight: 3, clickable: true, editable: false },
    });
    dm.setMap(map);
    drawingManagerRef.current = dm;

    window.google.maps.event.addListener(dm, "overlaycomplete", (e: any) => {
      // apply current colors from refs
      const color = drawColorRef.current;
      const opacity = drawOpacityRef.current;
      if (e.type !== "polyline") {
        e.overlay.setOptions({ fillColor: color, fillOpacity: opacity, strokeColor: color });
      } else {
        e.overlay.setOptions({ strokeColor: color });
      }
      drawnShapesRef.current.push(e.overlay);
      saveDrawings();
      dm.setDrawingMode(null);
    });

    loadDrawings(map);
    loadRota(map);

    // Right-click context menu
    map.addListener("rightclick", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      // Get pixel position relative to map div
      const overlay = new window.google.maps.OverlayView();
      overlay.draw = () => {};
      overlay.setMap(map);
      window.requestAnimationFrame(() => {
        const proj = overlay.getProjection();
        if (!proj) { setContextMenu({ x: e.pixel?.x ?? 200, y: e.pixel?.y ?? 200, lat, lng }); return; }
        const point = proj.fromLatLngToContainerPixel(e.latLng);
        setContextMenu({ x: point.x, y: point.y, lat, lng });
        overlay.setMap(null);
      });
    });

    setMapCarregado(true);
  }

  // Ref para modoAdicionar (acessível dentro do listener)
  const modoAdicionarRef = useRef(false);
  useEffect(() => { modoAdicionarRef.current = modoAdicionar; }, [modoAdicionar]);

  // Ref para modoRota
  const modoRotaRef = useRef(false);
  useEffect(() => { modoRotaRef.current = modoRota; }, [modoRota]);

  // Cursor no mapa quando modoAdicionar
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    let cursor = "grab";
    if (modoAdicionar) cursor = "crosshair";
    else if (modoRota) cursor = "cell";
    mapInstanceRef.current.setOptions({ draggableCursor: cursor });
  }, [modoAdicionar, modoRota]);

  // Tipo de mapa
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setMapTypeId(tipoMapa);
  }, [tipoMapa]);

  // 3D tilt
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setTilt(tilt3d ? 45 : 0);
  }, [tilt3d]);

  // Drawing manager options sync
  useEffect(() => {
    if (!drawingManagerRef.current) return;
    const dm = drawingManagerRef.current;
    dm.setOptions({
      polygonOptions: { fillColor: drawColor, fillOpacity: drawOpacity, strokeColor: drawColor, strokeWeight: 2, clickable: true, editable: false },
      circleOptions: { fillColor: drawColor, fillOpacity: drawOpacity, strokeColor: drawColor, strokeWeight: 2, clickable: true, editable: false },
      rectangleOptions: { fillColor: drawColor, fillOpacity: drawOpacity, strokeColor: drawColor, strokeWeight: 2, clickable: true, editable: false },
      polylineOptions: { strokeColor: drawColor, strokeWeight: 3, clickable: true, editable: false },
    });
  }, [drawColor, drawOpacity, drawTool]);

  // Drawing mode active/inactive
  useEffect(() => {
    if (!drawingManagerRef.current) return;
    if (modoDesenho) {
      drawingManagerRef.current.setDrawingMode(drawTool);
    } else {
      drawingManagerRef.current.setDrawingMode(null);
    }
  }, [modoDesenho, drawTool]);

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
      const cfg = PRIORITY_CONFIG[alvo.prioridade] ?? PRIORITY_CONFIG["ALTA"];
      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="32" viewBox="0 0 26 32">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <ellipse cx="13" cy="30" rx="5" ry="2" fill="rgba(0,0,0,0.4)"/>
          <path d="M13 2 C7.5 2 3 6.5 3 12 C3 20 13 30 13 30 C13 30 23 20 23 12 C23 6.5 18.5 2 13 2Z"
            fill="${cfg.dot}" fill-opacity="${alvo.visivel ? "0.55" : "0.2"}" stroke="${cfg.color}" stroke-width="1.5" filter="url(#glow)"/>
          <circle cx="13" cy="12" r="4" fill="rgba(0,0,0,0.6)" stroke="${cfg.color}" stroke-width="1"/>
          <circle cx="13" cy="12" r="1.5" fill="${cfg.color}"/>
        </svg>`;

      const icon = {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgIcon),
        scaledSize: new window.google.maps.Size(26, 32),
        anchor: new window.google.maps.Point(13, 32),
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

  const salvarRota = () => {
    localStorage.setItem("ncfn_rota_mapa", JSON.stringify(rotaWaypointsRef.current));
  };

  const limparRota = () => {
    rotaMarkersRef.current.forEach(m => m.setMap(null));
    rotaMarkersRef.current = [];
    if (rotaPolylineRef.current) {
      rotaPolylineRef.current.setMap(null);
      rotaPolylineRef.current = null;
    }
    rotaWaypointsRef.current = [];
    setRotaDistancias(null);
    localStorage.removeItem("ncfn_rota_mapa");
  };

  const limparDesenhos = () => {
    drawnShapesRef.current.forEach(s => s.setMap(null));
    drawnShapesRef.current = [];
    localStorage.removeItem("ncfn_drawings_mapa");
    setSavedDrawings([]);
  };

  const formatDist = (m: number) => {
    if (m >= 1000) return (m / 1000).toFixed(1) + " km";
    return Math.round(m) + " m";
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

  // Current mode indicator
  const currentMode = modoAdicionar ? "MARCANDO ALVO" : modoRota ? "MODO ROTA" : modoDesenho ? "MODO DESENHO" : null;
  const modeColor = modoAdicionar ? "#ef4444" : modoRota ? "#f59e0b" : "#bc13fe";

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

          {/* 3D button */}
          <button onClick={() => setTilt3d(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition ${tilt3d
              ? "bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
              : "border-gray-800 text-gray-500 hover:text-white hover:border-gray-600"}`}>
            <Maximize2 className="w-3 h-3" /> 3D
          </button>

          {/* Rota button */}
          <button onClick={() => {
            const next = !modoRota;
            setModoRota(next);
            if (next) { setModoAdicionar(false); setModoDesenho(false); }
          }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition ${modoRota
              ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse"
              : "border-gray-800 text-gray-500 hover:text-white hover:border-gray-600"}`}>
            <Navigation2 className="w-3 h-3" /> ROTA
          </button>

          {/* Desenho button */}
          <button onClick={() => {
            const next = !modoDesenho;
            setModoDesenho(next);
            if (next) { setModoAdicionar(false); setModoRota(false); }
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition ${geolocLoading ? "border-[#00f3ff]/40 text-[#00f3ff] animate-pulse" : "border-gray-800 text-gray-500 hover:text-[#00f3ff] hover:border-[#00f3ff]/30"}`}>
            <Crosshair className="w-3 h-3" />
          </button>

          {/* Proximity rings */}
          <button onClick={() => setProximityAtivo(v => !v)} title="Anéis de proximidade (500m/1km/5km)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition ${proximityAtivo ? "bg-[#00f3ff]/10 border-[#00f3ff]/40 text-[#00f3ff]" : "border-gray-800 text-gray-500 hover:text-white"}`}>
            <Radio className="w-3 h-3" />
          </button>

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
                  onClick={() => {
                    const next = !modoAdicionar;
                    setModoAdicionar(next);
                    if (next) { setModoRota(false); setModoDesenho(false); }
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
                    const cfg = PRIORITY_CONFIG[alvo.prioridade] ?? PRIORITY_CONFIG["ALTA"];
                    const stCfg = STATUS_CONFIG[alvo.status] ?? STATUS_CONFIG["ATIVO"];
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

          {/* Mode badge */}
          {currentMode && mapCarregado && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse border"
              style={{
                background: modeColor + "20",
                borderColor: modeColor + "60",
                color: modeColor,
                boxShadow: `0 0 12px ${modeColor}40`,
              }}>
              {currentMode}
            </div>
          )}

          {/* Drawing toolbar */}
          {modoDesenho && mapCarregado && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#bc13fe]/30 backdrop-blur-md"
              style={{ background: "rgba(0,0,0,0.85)" }}>
              {/* Tool selector */}
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

              {/* Color picker */}
              <div className="flex items-center gap-1.5 border-r border-gray-800 pr-2">
                <span className="text-[9px] text-gray-600 uppercase">Cor</span>
                <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
              </div>

              {/* Opacity slider */}
              <div className="flex items-center gap-1.5 border-r border-gray-800 pr-2">
                <span className="text-[9px] text-gray-600 uppercase">Op</span>
                <input type="range" min={0.1} max={0.9} step={0.05} value={drawOpacity}
                  onChange={e => setDrawOpacity(parseFloat(e.target.value))}
                  className="w-16 accent-[#bc13fe]" />
                <span className="text-[9px] text-gray-500 w-6">{Math.round(drawOpacity * 100)}%</span>
              </div>

              {/* Clear all */}
              <button onClick={limparDesenhos}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-red-500 border border-red-900/40 rounded hover:bg-red-950/30 transition">
                <Trash2 className="w-3 h-3" /> Limpar tudo
              </button>
            </div>
          )}

          {/* Route distance panel */}
          {rotaDistancias && mapCarregado && (
            <div className="absolute bottom-14 left-3 z-20 rounded-xl border border-yellow-500/30 backdrop-blur-md overflow-hidden"
              style={{ background: "rgba(0,0,0,0.88)", minWidth: 200 }}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-yellow-500/20">
                <div className="flex items-center gap-1.5">
                  <Navigation2 className="w-3 h-3 text-yellow-400" />
                  <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">ROTA</span>
                </div>
                <button onClick={limparRota}
                  className="text-[8px] font-bold text-red-500 hover:text-red-400 border border-red-900/40 rounded px-1.5 py-0.5 hover:bg-red-950/30 transition">
                  Limpar
                </button>
              </div>
              <div className="px-3 py-2 space-y-1">
                {rotaDistancias.seg.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-[9px] text-gray-500 font-mono">P{i + 1}→P{i + 2}</span>
                    <span className="text-[9px] font-bold text-yellow-300">{formatDist(d)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-yellow-500/20 mt-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Total</span>
                  <span className="text-[10px] font-black text-yellow-400">{formatDist(rotaDistancias.total)}</span>
                </div>
              </div>
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

          {/* Geocoding search bar */}
          {mapCarregado && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20"
              style={{ maxWidth: 320, width: "calc(100% - 40px)" }}>
              <div className="flex-1 flex items-center gap-2 bg-black/90 border border-gray-700 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                <Search className="w-3 h-3 text-gray-500 flex-shrink-0" />
                <input
                  value={geocodeBusca}
                  onChange={e => setGeocodeBusca(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && geocodeSearch()}
                  placeholder="Buscar endereço ou cidade..."
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

          {/* Heading dial (visible when 3D active) */}
          {mapCarregado && tilt3d && (
            <div className="absolute bottom-14 right-3 z-20 flex flex-col items-center gap-1 bg-black/80 border border-gray-700 rounded-xl p-2 backdrop-blur-sm">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Bússola</span>
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border border-gray-700" style={{ background: "rgba(0,0,0,0.5)" }} />
                <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${heading}deg)`, transition: "transform 0.2s" }}>
                  <div className="w-0.5 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #ef4444 50%, #6b7280 50%)" }} />
                </div>
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-red-400">N</span>
              </div>
              <input type="range" min={0} max={360} value={heading} onChange={e => setHeading(Number(e.target.value))}
                className="w-16 accent-[#bc13fe]" style={{ writingMode: "horizontal-tb" }} />
              <span className="text-[8px] font-mono text-gray-600">{heading}°</span>
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

          {/* Right-click context menu */}
          {contextMenu && (
            <div ref={contextMenuRef}
              className="absolute z-50 bg-black/95 border border-gray-700 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm"
              style={{ left: contextMenu.x + 8, top: contextMenu.y + 8, minWidth: 180 }}>
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
                  if (modoRotaRef.current || modoRota) {
                    // Add as route point
                    const fakeEvent = { latLng: { lat: () => contextMenu.lat, lng: () => contextMenu.lng } };
                    // trigger route add manually
                  }
                  setModoRota(true);
                  setModoAdicionar(false);
                  setModoDesenho(false);
                  setContextMenu(null);
                }}>
                <Navigation className="w-3 h-3 text-[#f59e0b]" /> Iniciar rota daqui
              </button>
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
