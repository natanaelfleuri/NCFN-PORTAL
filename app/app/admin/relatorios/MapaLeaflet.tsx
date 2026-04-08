"use client";
// @ts-nocheck
import { useEffect, useRef, useCallback } from "react";
import {
  MapContainer, TileLayer, Marker, Polyline, Polygon,
  Circle, Popup, useMapEvents, useMap, LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ── Fix webpack broken default icon ─────────────────────────────── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ── Types ─────────────────────────────────────────────────────────── */
type Priority = "CRÍTICA" | "ALTA" | "MÉDIA" | "BAIXA";
type Status   = "ATIVO" | "MONITORANDO" | "NEUTRALIZADO" | "ARQUIVADO";

export type Alvo = {
  id: string; nome: string; lat: number; lng: number;
  prioridade: Priority; status: Status; notas: string;
  criadoEm: string; atualizadoEm: string; codigo: string; visivel: boolean;
};

export type Rota = {
  id: string; nome: string; color: string;
  pontos: { lat: number; lng: number }[];
};

export type DrawnShape = {
  id: string;
  type: "polygon" | "circle" | "rectangle" | "polyline";
  color: string;
  opacity: number;
  points: { lat: number; lng: number }[];
  radius?: number; // for circle (meters)
};

export type MapMode =
  | "normal"
  | "adicionar"
  | "rota"
  | "desenho"
  | "medindo"
  | "geocode";

const PRIORITY_COLOR: Record<Priority, string> = {
  "CRÍTICA": "#ff0040",
  "ALTA":    "#ef4444",
  "MÉDIA":   "#f97316",
  "BAIXA":   "#22c55e",
};

/* ── Utility: create custom divIcon ─────────────────────────────────── */
function alvoIcon(color: string, visivel: boolean) {
  const a = visivel ? 1 : 0.35;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <ellipse cx="14" cy="34" rx="5" ry="2" fill="rgba(0,0,0,0.4)" opacity="${a}"/>
    <path d="M14 2C8 2 3 7 3 14C3 23 14 34 14 34S25 23 25 14C25 7 20 2 14 2Z" fill="${color}" fill-opacity="${a * 0.45}" stroke="${color}" stroke-width="1.5" opacity="${a}"/>
    <circle cx="14" cy="14" r="5" fill="rgba(0,0,0,0.5)" stroke="${color}" stroke-width="1.2" opacity="${a}"/>
    <circle cx="14" cy="14" r="2" fill="${color}" opacity="${a}"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

function routePointIcon(color: string, num: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="12" fill="${color}" stroke="#000" stroke-width="1.5"/>
    <text x="13" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#000">${num}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [26, 26], iconAnchor: [13, 13] });
}

function geolocIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="9" fill="rgba(0,243,255,0.2)" stroke="#00f3ff" stroke-width="1.5"/>
    <circle cx="10" cy="10" r="4" fill="#00f3ff"/>
    <circle cx="10" cy="10" r="2" fill="white"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [20, 20], iconAnchor: [10, 10] });
}

function drawPointIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="5" fill="${color}" stroke="#000" stroke-width="1"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [12, 12], iconAnchor: [6, 6] });
}

/* ── Tile layers ─────────────────────────────────────────────────── */
const TILES = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: '© <a href="https://carto.com">CartoDB</a>',
    subdomains: ["a","b","c","d"] as string[],
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '© <a href="https://esri.com">ESRI</a>',
    subdomains: [] as string[],
  },
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    subdomains: [] as string[],
  },
};

/* ── Map event handler (inner component) ────────────────────────── */
function MapEvents({
  mode, onMapClick, onRightClick, drawColor,
}: {
  mode: MapMode;
  onMapClick: (lat: number, lng: number, x: number, y: number) => void;
  onRightClick: (lat: number, lng: number, x: number, y: number) => void;
  drawColor: string;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const { x, y } = e.containerPoint;
      onMapClick(lat, lng, x, y);
    },
    contextmenu(e) {
      e.originalEvent.preventDefault();
      const { lat, lng } = e.latlng;
      const { x, y } = e.containerPoint;
      onRightClick(lat, lng, x, y);
    },
    dblclick(e) {
      // consumed by child components if needed
    },
  });
  return null;
}

/* ── Cursor style overlay ────────────────────────────────────────── */
function CursorStyle({ mode }: { mode: MapMode }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const cursors: Record<MapMode, string> = {
      normal:     "grab",
      adicionar:  "crosshair",
      rota:       "cell",
      desenho:    "crosshair",
      medindo:    "crosshair",
      geocode:    "grab",
    };
    container.style.cursor = cursors[mode] || "grab";
    return () => { container.style.cursor = "grab"; };
  }, [mode, map]);
  return null;
}

/* ── Main exported component ─────────────────────────────────────── */
export interface MapaLeafletProps {
  alvos: Alvo[];
  rotas: Rota[];
  shapes: DrawnShape[];
  drawingPoints: { lat: number; lng: number }[];
  drawTool: "polygon" | "circle" | "rectangle" | "polyline";
  drawColor: string;
  drawOpacity: number;
  measurePoints: { lat: number; lng: number }[];
  measureDist: number | null;
  proximityAtivo: boolean;
  proximityRadius: number;
  geolocLatLng: { lat: number; lng: number } | null;
  imageryType: "dark" | "satellite" | "hybrid" | "osm";
  mode: MapMode;
  selecionado: Alvo | null;
  onMapClick: (lat: number, lng: number, x: number, y: number) => void;
  onRightClick: (lat: number, lng: number, x: number, y: number) => void;
  onAlvoClick: (id: string) => void;
}

export default function MapaLeaflet({
  alvos, rotas, shapes, drawingPoints, drawTool, drawColor, drawOpacity,
  measurePoints, measureDist, proximityAtivo, proximityRadius,
  geolocLatLng, imageryType, mode, selecionado,
  onMapClick, onRightClick, onAlvoClick,
}: MapaLeafletProps) {

  const tile = TILES[imageryType === "hybrid" ? "satellite" : imageryType] ?? TILES.dark;

  /* For rectangle drawing: first corner is drawingPoints[0], live second corner is drawingPoints[1] */
  const rectBounds: [[number,number],[number,number]] | null =
    drawTool === "rectangle" && drawingPoints.length >= 2
      ? [[drawingPoints[0].lat, drawingPoints[0].lng], [drawingPoints[1].lat, drawingPoints[1].lng]]
      : drawTool === "rectangle" && drawingPoints.length === 1
      ? null
      : null;

  /* Circle: first point = center, second = radius edge */
  const circleCenter = drawTool === "circle" && drawingPoints.length >= 1 ? drawingPoints[0] : null;
  const circleRadius = drawTool === "circle" && drawingPoints.length >= 2
    ? haversine(drawingPoints[0].lat, drawingPoints[0].lng, drawingPoints[1].lat, drawingPoints[1].lng)
    : null;

  return (
    <MapContainer
      center={[-15.793, -47.882]}
      zoom={5}
      style={{ height: "100%", width: "100%", background: "#050510" }}
      zoomControl={false}
      doubleClickZoom={false}
      attributionControl={false}
    >
      {/* Tile layer */}
      <TileLayer url={tile.url} subdomains={tile.subdomains} attribution={tile.attribution} />

      {/* Hybrid: satellite + labels overlay */}
      {imageryType === "hybrid" && (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png"
          subdomains={["a","b","c","d"]}
          opacity={0.7}
        />
      )}

      {/* Map event handler */}
      <MapEvents mode={mode} onMapClick={onMapClick} onRightClick={onRightClick} drawColor={drawColor} />
      <CursorStyle mode={mode} />

      {/* ── Alvos ── */}
      {alvos.map(alvo => {
        const color = PRIORITY_COLOR[alvo.prioridade] ?? "#bc13fe";
        return (
          <Marker
            key={alvo.id}
            position={[alvo.lat, alvo.lng]}
            icon={alvoIcon(color, alvo.visivel)}
            eventHandlers={{ click: () => onAlvoClick(alvo.id) }}
            opacity={alvo.visivel ? 1 : 0.4}
          >
            <Popup className="ncfn-popup">
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#ccc", minWidth: 160 }}>
                <div style={{ fontWeight: 800, color, marginBottom: 4 }}>[{alvo.codigo}] {alvo.nome}</div>
                <div>P: <span style={{ color }}>{alvo.prioridade}</span> · S: {alvo.status}</div>
                {alvo.notas && <div style={{ marginTop: 6, color: "#999", fontSize: 10 }}>{alvo.notas.slice(0, 100)}</div>}
                <div style={{ marginTop: 4, color: "#555", fontSize: 9 }}>
                  {alvo.lat.toFixed(4)}, {alvo.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* ── Proximity circles ── */}
      {proximityAtivo && alvos.filter(a => a.visivel).map(alvo => (
        <Circle
          key={`prox-${alvo.id}`}
          center={[alvo.lat, alvo.lng]}
          radius={proximityRadius}
          pathOptions={{
            color: PRIORITY_COLOR[alvo.prioridade],
            fillColor: PRIORITY_COLOR[alvo.prioridade],
            fillOpacity: 0.04,
            opacity: 0.35,
            dashArray: "6 4",
            weight: 1.5,
          }}
        />
      ))}

      {/* ── Rotas ── */}
      {rotas.map(rota => {
        if (rota.pontos.length < 2) return null;
        return (
          <Polyline
            key={`route-${rota.id}`}
            positions={rota.pontos.map(p => [p.lat, p.lng])}
            pathOptions={{ color: rota.color, weight: 3, opacity: 0.85, dashArray: "10 5" }}
          />
        );
      })}

      {/* Route point markers */}
      {rotas.map(rota =>
        rota.pontos.map((pt, i) => (
          <Marker
            key={`rpt-${rota.id}-${i}`}
            position={[pt.lat, pt.lng]}
            icon={routePointIcon(rota.color, i + 1)}
          />
        ))
      )}

      {/* ── Drawn shapes ── */}
      {shapes.map(shape => {
        if (shape.type === "polygon" || shape.type === "rectangle") {
          const positions = shape.points.map(p => [p.lat, p.lng] as [number,number]);
          return (
            <Polygon
              key={shape.id}
              positions={positions}
              pathOptions={{
                color: shape.color,
                fillColor: shape.color,
                fillOpacity: shape.opacity,
                weight: 2,
              }}
            />
          );
        }
        if (shape.type === "circle" && shape.points.length >= 1 && shape.radius) {
          return (
            <Circle
              key={shape.id}
              center={[shape.points[0].lat, shape.points[0].lng]}
              radius={shape.radius}
              pathOptions={{
                color: shape.color,
                fillColor: shape.color,
                fillOpacity: shape.opacity,
                weight: 2,
              }}
            />
          );
        }
        if (shape.type === "polyline" && shape.points.length >= 2) {
          return (
            <Polyline
              key={shape.id}
              positions={shape.points.map(p => [p.lat, p.lng])}
              pathOptions={{ color: shape.color, weight: 3, opacity: 0.9 }}
            />
          );
        }
        return null;
      })}

      {/* ── Live drawing preview ── */}
      {mode === "desenho" && drawingPoints.length > 0 && (
        <>
          {/* Live line from drawn points */}
          {drawingPoints.length >= 2 && (drawTool === "polygon" || drawTool === "polyline") && (
            <Polyline
              positions={drawingPoints.map(p => [p.lat, p.lng])}
              pathOptions={{ color: drawColor, weight: 2, opacity: 0.7, dashArray: "5 3" }}
            />
          )}

          {/* Live circle */}
          {drawTool === "circle" && circleCenter && circleRadius && (
            <Circle
              center={[circleCenter.lat, circleCenter.lng]}
              radius={circleRadius}
              pathOptions={{ color: drawColor, fillColor: drawColor, fillOpacity: drawOpacity, weight: 2, opacity: 0.7 }}
            />
          )}

          {/* Live rectangle */}
          {drawTool === "rectangle" && rectBounds && (
            <Polygon
              positions={[
                rectBounds[0],
                [rectBounds[0][0], rectBounds[1][1]],
                rectBounds[1],
                [rectBounds[1][0], rectBounds[0][1]],
              ]}
              pathOptions={{ color: drawColor, fillColor: drawColor, fillOpacity: drawOpacity, weight: 2, opacity: 0.7, dashArray: "5 3" }}
            />
          )}

          {/* Drawing point markers */}
          {drawingPoints.map((pt, i) => (
            <Marker key={`dp-${i}`} position={[pt.lat, pt.lng]} icon={drawPointIcon(drawColor)} />
          ))}
        </>
      )}

      {/* ── Measurement ── */}
      {measurePoints.length === 2 && (
        <>
          <Polyline
            positions={measurePoints.map(p => [p.lat, p.lng])}
            pathOptions={{ color: "#00f3ff", weight: 2, dashArray: "6 4" }}
          />
          {measurePoints.map((pt, i) => (
            <Marker key={`mp-${i}`} position={[pt.lat, pt.lng]} icon={drawPointIcon("#00f3ff")} />
          ))}
        </>
      )}
      {measurePoints.length === 1 && (
        <Marker position={[measurePoints[0].lat, measurePoints[0].lng]} icon={drawPointIcon("#00f3ff")} />
      )}

      {/* ── Geolocation ── */}
      {geolocLatLng && (
        <Marker position={[geolocLatLng.lat, geolocLatLng.lng]} icon={geolocIcon()}>
          <Popup>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#00f3ff" }}>
              Sua localização · {geolocLatLng.lat.toFixed(4)}, {geolocLatLng.lng.toFixed(4)}
            </span>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
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
