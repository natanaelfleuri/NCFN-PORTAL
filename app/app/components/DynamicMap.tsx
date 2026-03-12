"use client";

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

type ForensicsRecord = {
  id: string; arquivo: string; ip: string; locationName: string;
  lat: number; lng: number; dataBaixado: string; device: string;
};

type OperatorLocation = {
  lat: number; lng: number; email: string; ip: string;
  city: string; country: string;
};

export default function DynamicMap({
  records,
  operatorLocation,
}: {
  records: ForensicsRecord[];
  operatorLocation?: OperatorLocation | null;
}) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current) return;

      // Fix webpack icon paths
      // @ts-expect-error
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Center: operator location > first record > Brasília
      const center: [number, number] = operatorLocation
        ? [operatorLocation.lat, operatorLocation.lng]
        : records.length > 0
        ? [records[0].lat, records[0].lng]
        : [-15.7801, -47.9292];

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView(center, records.length > 0 || operatorLocation ? 4 : 2);

      instanceRef.current = map;

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Interception markers (red)
      const redIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:12px;height:12px;border-radius:50%;
          background:#ef4444;
          box-shadow:0 0 10px rgba(239,68,68,0.8),0 0 20px rgba(239,68,68,0.4);
          border:2px solid rgba(255,255,255,0.3);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      records.forEach(r => {
        if (!r.lat || !r.lng) return;
        const m = L.marker([r.lat, r.lng], { icon: redIcon }).addTo(map);
        m.bindPopup(`
          <div style="font-family:monospace;font-size:12px;background:#0a0010;color:#fff;padding:8px;border-radius:8px;border:1px solid rgba(188,19,254,0.3)">
            <div style="color:#ef4444;font-weight:bold;margin-bottom:4px">⚠ ${r.arquivo}</div>
            <div>IP: <span style="color:#00f3ff">${r.ip}</span></div>
            <div>Local: ${r.locationName}</div>
            <div>Data: ${r.dataBaixado}</div>
            <div style="font-size:10px;color:#6b7280;margin-top:4px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.device}</div>
          </div>
        `, { className: 'ncfn-popup' });
      });

      // Operator marker (cyan pulsing)
      if (operatorLocation) {
        const opIcon = L.divIcon({
          className: '',
          html: `<div style="position:relative;width:20px;height:20px">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              background:rgba(0,243,255,0.2);
              animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
            "></div>
            <div style="
              position:absolute;inset:4px;border-radius:50%;
              background:#00f3ff;
              box-shadow:0 0 12px rgba(0,243,255,0.9),0 0 25px rgba(0,243,255,0.5);
              border:2px solid white;
            "></div>
          </div>
          <style>@keyframes ping{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}</style>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const om = L.marker([operatorLocation.lat, operatorLocation.lng], { icon: opIcon, zIndexOffset: 1000 }).addTo(map);
        om.bindPopup(`
          <div style="font-family:monospace;font-size:12px;background:#000814;color:#fff;padding:8px;border-radius:8px;border:1px solid rgba(0,243,255,0.4)">
            <div style="color:#00f3ff;font-weight:bold;margin-bottom:4px">● OPERADOR ATIVO</div>
            <div>${operatorLocation.email}</div>
            <div>IP: <span style="color:#00f3ff">${operatorLocation.ip}</span></div>
            <div>Local: ${operatorLocation.city}, ${operatorLocation.country}</div>
          </div>
        `, { className: 'ncfn-popup' });
        om.openPopup();
      }

    })();

    return () => {
      cancelled = true;
      instanceRef.current?.remove();
      instanceRef.current = null;
    };
  }, [records, operatorLocation]);

  return (
    <div
      ref={mapRef}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      className="z-0"
    />
  );
}
