"use client";

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    __gmapsLoaded?: Promise<void>;
    google: any;
  }
}

const DARK_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a4a4a" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#3a3a3a" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0d0d0d" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#0f0f0f" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#3a3a3a" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#0a1a0a" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#1a3a1a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#121212" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#3a3a3a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#4a4a4a" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#0f0f0f" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#3a3a3a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000814" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#1a2a3a" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#000814" }] },
];

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.__gmapsLoaded) return window.__gmapsLoaded;
  window.__gmapsLoaded = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.__gmapsLoaded;
}

function makeSvgMarker(color: string, size = 22) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="${color}"/>
  </svg>`;
  return { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), scaledSize: { width: size, height: size } };
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

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
    if (!apiKey) return;

    (async () => {
      try {
        await loadGoogleMaps(apiKey);
        if (cancelled || !mapRef.current) return;

        // Clean up old instance
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        if (instanceRef.current) {
          instanceRef.current = null;
          mapRef.current.innerHTML = '';
        }

        const center = operatorLocation
          ? { lat: operatorLocation.lat, lng: operatorLocation.lng }
          : records.length > 0
          ? { lat: records[0].lat, lng: records[0].lng }
          : { lat: -15.7801, lng: -47.9292 };

        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: records.length > 0 || operatorLocation ? 4 : 2,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: DARK_STYLES,
        });

        instanceRef.current = map;

        const infoWindow = new window.google.maps.InfoWindow();

        // Interception markers (red)
        records.forEach(r => {
          if (!r.lat || !r.lng) return;

          const icon = makeSvgMarker('#ef4444');
          const marker = new window.google.maps.Marker({
            map,
            position: { lat: r.lat, lng: r.lng },
            icon: {
              url: icon.url,
              scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
            },
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
          const opIcon = makeSvgMarker('#00f3ff', 28);
          const opMarker = new window.google.maps.Marker({
            map,
            position: { lat: operatorLocation.lat, lng: operatorLocation.lng },
            icon: {
              url: opIcon.url,
              scaledSize: new window.google.maps.Size(opIcon.scaledSize.width, opIcon.scaledSize.height),
            },
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
      } catch (_) {}
    })();

    return () => { cancelled = true; };
  }, [records, operatorLocation]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem', backgroundColor: '#000' }}
        className="z-0"
      />
    </div>
  );
}
