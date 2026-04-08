"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon broken by webpack
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type ForensicsRecord = {
  id: string; arquivo: string; ip: string; locationName: string;
  lat: number; lng: number; dataBaixado: string; device: string;
};

type OperatorLocation = {
  lat: number; lng: number; email: string; ip: string;
  city: string; country: string;
};

// Recenter map when operator location changes
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

// Force Leaflet to recalculate size after CSS zoom transformations
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// Ctrl+scroll = zoom; plain scroll = page scroll
function CtrlScrollZoom() {
  const map = useMap();
  useEffect(() => {
    map.scrollWheelZoom.disable();
    const el = map.getContainer();
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      map.setZoom(map.getZoom() + (e.deltaY < 0 ? 1 : -1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [map]);
  return null;
}

export default function DynamicMap({
  records,
  operatorLocation,
}: {
  records: ForensicsRecord[];
  operatorLocation?: OperatorLocation | null;
}) {
  const center: [number, number] = operatorLocation
    ? [operatorLocation.lat, operatorLocation.lng]
    : records.length > 0
    ? [records[0].lat, records[0].lng]
    : [-15.7801, -47.9292];

  const zoom = records.length > 0 || operatorLocation ? 4 : 2;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', background: '#000814', borderRadius: '0.75rem' }}
      zoomControl
      attributionControl={false}
    >
      {/* Dark tile layer — Carto Dark Matter (no API key required) */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      <InvalidateSize />
      <CtrlScrollZoom />

      {/* Recenter when operator moves */}
      {operatorLocation && (
        <MapRecenter lat={operatorLocation.lat} lng={operatorLocation.lng} />
      )}

      {/* Interception markers — red */}
      {records.map(r => {
        if (!r.lat || !r.lng) return null;
        return (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={8}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.7,
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', background: '#0a0010', color: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid rgba(188,19,254,0.3)', minWidth: '200px' }}>
                <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>⚠ {r.arquivo}</div>
                <div>IP: <span style={{ color: '#00f3ff' }}>{r.ip}</span></div>
                <div>Local: {r.locationName}</div>
                <div>Data: {r.dataBaixado}</div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.device}</div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Operator marker — cyan */}
      {operatorLocation && (
        <CircleMarker
          center={[operatorLocation.lat, operatorLocation.lng]}
          radius={12}
          pathOptions={{
            color: '#00f3ff',
            fillColor: '#00f3ff',
            fillOpacity: 0.3,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', background: '#000814', color: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,243,255,0.4)', minWidth: '200px' }}>
              <div style={{ color: '#00f3ff', fontWeight: 'bold', marginBottom: '4px' }}>● OPERADOR ATIVO</div>
              <div>{operatorLocation.email}</div>
              <div>IP: <span style={{ color: '#00f3ff' }}>{operatorLocation.ip}</span></div>
              <div>Local: {operatorLocation.city}, {operatorLocation.country}</div>
            </div>
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
    {/* Hint overlay — shown briefly on hover */}
    <div style={{
      position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '4px 10px', pointerEvents: 'none',
      fontSize: 10, fontFamily: 'monospace', color: '#9ca3af', zIndex: 500, whiteSpace: 'nowrap',
    }}>
      Ctrl + scroll para zoom
    </div>
    </div>
  );
}
