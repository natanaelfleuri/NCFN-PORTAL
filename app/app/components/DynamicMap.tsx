"use client";

import { useEffect, useState, useRef } from 'react';

import 'leaflet/dist/leaflet.css';

type ForensicsRecord = {
    id: string;
    arquivo: string;
    ip: string;
    locationName: string;
    lat: number;
    lng: number;
    dataBaixado: string;
    device: string;
};

export default function DynamicMap({ records }: { records: ForensicsRecord[] }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        let cancelled = false;

        (async () => {
            // Dynamically import leaflet — never evaluated during SSR
            const L = (await import('leaflet')).default;

            if (cancelled || !mapRef.current) return;

            // Fix default marker icons (broken by webpack bundling)
            // @ts-expect-error - next.js leaflet patch
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });

            const center: [number, number] = records.length > 0
                ? [records[0].lat, records[0].lng]
                : [-15.7801, -47.9292];

            const zoom = records.length > 0 ? 4 : 2;

            const map = L.map(mapRef.current).setView(center, zoom);
            mapInstanceRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            records.forEach(record => {
                const marker = L.marker([record.lat, record.lng]).addTo(map);
                marker.bindPopup(`
                    <div style="font-family: sans-serif; font-size: 13px; line-height: 1.6;">
                        <strong style="color: #dc2626; display: block; margin-bottom: 6px;">Arquivo Interceptado: ${record.arquivo}</strong>
                        <div><b>IP Alvo:</b> ${record.ip}</div>
                        <div><b>Localização:</b> ${record.locationName}</div>
                        <div><b>Data:</b> ${record.dataBaixado}</div>
                        <div style="font-size: 11px; color: #6b7280; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;" title="${record.device}">${record.device}</div>
                    </div>
                `);
            });

            setIsLoaded(true);
        })();

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [records]);

    return (
        <div
            ref={mapRef}
            style={{
                height: '100%',
                width: '100%',
                borderRadius: '1rem',
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in',
            }}
            className="z-0"
        />
    );
}
