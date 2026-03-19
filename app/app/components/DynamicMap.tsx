"use client";

import { useEffect, useRef, useState } from 'react';

const MAP_ID_DARK  = 'bc7a2bd22c9e684f343256d5';
const MAP_ID_LIGHT = 'ff3c152cbb6a039ab9a368c0';

declare global {
  interface Window {
    __gmapsLoaded?: Promise<void>;
    google: any;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.__gmapsLoaded) return window.__gmapsLoaded;
  window.__gmapsLoaded = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=beta`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.__gmapsLoaded;
}

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
  const markersRef  = useRef<any[]>([]);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
    if (!apiKey) return;

    (async () => {
      await loadGoogleMaps(apiKey);
      if (cancelled || !mapRef.current) return;

      const { Map } = await window.google.maps.importLibrary('maps') as any;
      const { AdvancedMarkerElement, PinElement } = await window.google.maps.importLibrary('marker') as any;

      const center = operatorLocation
        ? { lat: operatorLocation.lat, lng: operatorLocation.lng }
        : records.length > 0
        ? { lat: records[0].lat, lng: records[0].lng }
        : { lat: -15.7801, lng: -47.9292 };

      // Remove old map instance if exists
      if (instanceRef.current) {
        markersRef.current.forEach(m => { m.map = null; });
        markersRef.current = [];
        instanceRef.current = null;
        mapRef.current.innerHTML = '';
      }

      const map = new Map(mapRef.current, {
        center,
        zoom: records.length > 0 || operatorLocation ? 4 : 2,
        mapId: isDark ? MAP_ID_DARK : MAP_ID_LIGHT,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      instanceRef.current = map;

      const infoWindow = new window.google.maps.InfoWindow();

      // Interception markers (red)
      records.forEach(r => {
        if (!r.lat || !r.lng) return;

        const pin = new PinElement({
          background: '#ef4444',
          borderColor: '#991b1b',
          glyphColor: '#fff',
          scale: 0.9,
        });

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: r.lat, lng: r.lng },
          content: pin.element,
          title: r.arquivo,
        });

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family:monospace;font-size:12px;background:#0a0010;color:#fff;padding:8px;border-radius:8px;border:1px solid rgba(188,19,254,0.3);min-width:200px">
              <div style="color:#ef4444;font-weight:bold;margin-bottom:4px">⚠ ${r.arquivo}</div>
              <div>IP: <span style="color:#00f3ff">${r.ip}</span></div>
              <div>Local: ${r.locationName}</div>
              <div>Data: ${r.dataBaixado}</div>
              <div style="font-size:10px;color:#9ca3af;margin-top:4px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.device}</div>
            </div>
          `);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Operator marker (cyan)
      if (operatorLocation) {
        const opPin = new PinElement({
          background: '#00f3ff',
          borderColor: '#0891b2',
          glyphColor: '#000814',
          scale: 1.2,
        });

        const opMarker = new AdvancedMarkerElement({
          map,
          position: { lat: operatorLocation.lat, lng: operatorLocation.lng },
          content: opPin.element,
          title: 'Operador Ativo',
          zIndex: 1000,
        });

        infoWindow.setContent(`
          <div style="font-family:monospace;font-size:12px;background:#000814;color:#fff;padding:8px;border-radius:8px;border:1px solid rgba(0,243,255,0.4);min-width:200px">
            <div style="color:#00f3ff;font-weight:bold;margin-bottom:4px">● OPERADOR ATIVO</div>
            <div>${operatorLocation.email}</div>
            <div>IP: <span style="color:#00f3ff">${operatorLocation.ip}</span></div>
            <div>Local: ${operatorLocation.city}, ${operatorLocation.country}</div>
          </div>
        `);
        infoWindow.open(map, opMarker);

        opMarker.addListener('click', () => {
          infoWindow.open(map, opMarker);
        });

        markersRef.current.push(opMarker);
      }
    })();

    return () => { cancelled = true; };
  }, [records, operatorLocation, isDark]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem', backgroundColor: '#000' }}
        className="z-0"
      />
      <button
        onClick={() => setIsDark(d => !d)}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 10,
          background: isDark ? '#1f2937' : '#fff',
          color: isDark ? '#fff' : '#1f2937',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        {isDark ? '☀ Claro' : '🌙 Escuro'}
      </button>
    </div>
  );
}
