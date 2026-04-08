"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Wifi, User, Shield, HardDrive, Clock, Globe, Monitor, Smartphone } from 'lucide-react';

const DynamicMap = dynamic(() => import('./DynamicMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-[#bc13fe] font-mono text-sm animate-pulse">
      Inicializando mapa forense...
    </div>
  ),
});

type ForensicsRecord = {
  id: string; arquivo: string; ip: string; locationName: string;
  lat: number; lng: number; dataBaixado: string; device: string;
};

type GeoMe = {
  email: string; role: string; plan: string;
  uploadedFilesCount: number; totalBytesUsed: number;
  ip: string; isLocal: boolean;
  location: { city: string; region: string; country: string; ll: [number,number]; timezone: string } | null;
  browser: string; os: string; userAgent: string;
  sessionTime: string; joinedAt: string | null;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(2)} MB`;
}

export default function MapDashboard() {
  const [records, setRecords] = useState<ForensicsRecord[]>([]);
  const [geoMe, setGeoMe]     = useState<GeoMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/forensics').then(r => r.ok ? r.json() : { records: [] }).catch(() => ({ records: [] })),
      fetch('/api/geo-me').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([forensics, geo]) => {
      setRecords(forensics.records || []);
      setGeoMe(geo || null);
      setLoading(false);
    });
  }, []);

  const operatorLocation = geoMe?.location
    ? { lat: geoMe.location.ll[0], lng: geoMe.location.ll[1], email: geoMe.email, ip: geoMe.ip, city: geoMe.location.city, country: geoMe.location.country }
    : null;

  return (
    <div className="space-y-6 mt-12 w-full">
      {/* Section header — padrão SectionTitle */}
      <div className="flex items-center gap-4 px-1">
        <div>
          <h3 className="text-base lg:text-lg font-black uppercase tracking-wider" style={{ color: '#bc13fe' }}>
            Localização Rastreável do Gerente Ativo e de Ameaças em Tempo Real
          </h3>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">Interceptações locais + operador ativo</p>
        </div>
        <div className="h-px flex-grow" style={{ background: 'linear-gradient(to right, rgba(188,19,254,0.3), transparent)' }} />
        <div className="flex items-center gap-2 px-3 py-1 bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded-full flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f3ff] animate-pulse" />
          <span className="text-[#00f3ff] text-[10px] font-mono">{records.length} interceptações</span>
        </div>
      </div>

      {/* Main layout: map + operator panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* Map — no backdrop-blur (breaks leaflet tile rendering) */}
        <div className="rounded-2xl border border-[#bc13fe]/30 overflow-hidden relative h-[560px] xl:h-[600px] shadow-[0_0_40px_rgba(188,19,254,0.1)] bg-[#000814]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-[#bc13fe]/40 animate-spin" />
                </div>
                <span className="text-[#bc13fe] font-mono text-xs animate-pulse">Carregando mapa...</span>
              </div>
            </div>
          ) : (
            <DynamicMap records={records} operatorLocation={operatorLocation} />
          )}
          {/* Map legend */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 z-[400] pointer-events-none">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10">
              <div className="w-3 h-3 rounded-full bg-[#00f3ff] shadow-[0_0_6px_rgba(0,243,255,0.8)]" />
              <span className="text-[10px] font-mono text-white/70">Operador</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <span className="text-[10px] font-mono text-white/70">Interceptação</span>
            </div>
          </div>
        </div>

        {/* Operator info panel */}
        {geoMe && (
          <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="glass-panel rounded-2xl border border-[#00f3ff]/30 p-4 shadow-[0_0_20px_rgba(0,243,255,0.05)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-[#00f3ff]/10 border border-[#00f3ff]/30">
                  <User className="w-5 h-5 text-[#00f3ff]" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Operador Ativo</p>
                  <p className="text-white font-bold text-sm truncate max-w-[200px]">{geoMe.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <InfoRow icon={Shield} label="Função" value={geoMe.role.toUpperCase()} color="text-[#bc13fe]" />
                <InfoRow icon={HardDrive} label="Plano" value={geoMe.plan === 'pro' ? 'PRO ✓' : 'Trial'} color={geoMe.plan === 'pro' ? 'text-emerald-400' : 'text-yellow-400'} />
                <InfoRow icon={HardDrive} label="Arquivos" value={`${geoMe.uploadedFilesCount} · ${formatBytes(geoMe.totalBytesUsed)}`} color="text-gray-300" />
              </div>
            </div>

            {/* Network / Location */}
            <div className="glass-panel rounded-2xl border border-[#bc13fe]/20 p-4">
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Wifi className="w-3 h-3" /> Rede & Localização
              </p>
              <div className="space-y-2">
                <InfoRow icon={MapPin} label="IP" value={geoMe.ip} mono color="text-[#00f3ff]" />
                {geoMe.location ? (
                  <>
                    <InfoRow icon={Globe} label="Cidade" value={`${geoMe.location.city}, ${geoMe.location.region}`} color="text-gray-300" />
                    <InfoRow icon={Globe} label="País" value={geoMe.location.country} color="text-gray-300" />
                    <InfoRow icon={MapPin} label="Coord." value={`${geoMe.location.ll[0].toFixed(4)}, ${geoMe.location.ll[1].toFixed(4)}`} mono color="text-gray-400" />
                    <InfoRow icon={Clock} label="Fuso" value={geoMe.location.timezone} color="text-gray-400" />
                  </>
                ) : (
                  <p className="text-xs text-gray-600 font-mono">Localização indisponível</p>
                )}
                {geoMe.isLocal && (
                  <div className="mt-2 px-2 py-1 bg-yellow-950/30 border border-yellow-600/30 rounded text-yellow-400 text-[10px] font-mono">
                    ⚠ Acesso local — coordenadas simuladas (Brasília)
                  </div>
                )}
              </div>
            </div>

            {/* Device */}
            <div className="glass-panel rounded-2xl border border-gray-700/30 p-4">
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Monitor className="w-3 h-3" /> Dispositivo
              </p>
              <div className="space-y-2">
                <InfoRow icon={Monitor} label="Browser" value={geoMe.browser} color="text-gray-300" />
                <InfoRow icon={Smartphone} label="OS" value={geoMe.os} color="text-gray-300" />
                <InfoRow icon={Clock} label="Sessão" value={new Date(geoMe.sessionTime).toLocaleTimeString('pt-BR')} color="text-gray-400" />
                {geoMe.joinedAt && (
                  <InfoRow icon={Clock} label="Membro desde" value={new Date(geoMe.joinedAt).toLocaleDateString('pt-BR')} color="text-gray-500" />
                )}
              </div>
              <p className="text-[9px] text-gray-700 font-mono mt-3 break-all leading-relaxed line-clamp-2" title={geoMe.userAgent}>
                {geoMe.userAgent}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legal disclaimer */}
      <div className="glass-panel rounded-2xl border border-gray-800/40 p-5 shadow-inner">
        <p className="text-[10px] text-gray-600 font-mono leading-relaxed tracking-wide text-justify">
          O endereço de Protocolo de Internet (IP) consubstancia identificador técnico atribuído a dispositivo conectado a rede de dados, cuja finalidade precípua é viabilizar a comunicação entre terminais, permitindo a indicação da origem lógica de determinada atividade digital, sem, contudo, possuir aptidão para individualizar, de forma direta e inequívoca, a identidade civil do agente. Nessa senda, os registros de IP ostentam natureza eminentemente indiciária e contextual, revelando-se insuficientes, quando considerados de forma isolada, para a comprovação da autoria delitiva. Sua valoração probatória demanda, imprescindivelmente, a conjugação com outros elementos informativos idôneos, regularmente obtidos mediante autorização judicial, quando exigível, e em estrita observância às garantias constitucionais do devido processo legal, da ampla defesa e do contraditório, de modo a viabilizar a segura imputação da conduta ao respectivo responsável.
        </p>
      </div>

      {/* Interceptions table */}
      <div className="glass-panel rounded-2xl border border-[#bc13fe]/20 overflow-hidden shadow-[0_0_20px_rgba(188,19,254,0.05)]">
        <div className="px-6 py-4 border-b border-[#bc13fe]/20 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Histórico de Interceptações de Ameaças e Tentativas de Acesso Não Autorizados</h4>
          <span className="text-[10px] font-mono text-gray-600">{records.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-[10px] text-white uppercase bg-[#bc13fe]/10 border-b border-[#bc13fe]/20 tracking-widest font-bold">
              <tr>
                <th className="px-5 py-3">Arquivo</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">IP / Local</th>
                <th className="px-5 py-3 hidden lg:table-cell">Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-gray-600 font-mono text-xs uppercase tracking-widest">
                    Nenhuma interceptação registrada.
                  </td>
                </tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-[#bc13fe]/5 transition-colors group">
                  <td className="px-5 py-3 font-medium text-red-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{r.arquivo}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.dataBaixado}</td>
                  <td className="px-5 py-3">
                    <span className="block font-mono text-[#00f3ff] text-xs">{r.ip}</span>
                    <span className="block text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{r.locationName}</span>
                  </td>
                  <td className="px-5 py-3 text-[10px] font-mono text-gray-600 hidden lg:table-cell">
                    <span className="block truncate max-w-xs" title={r.device}>{r.device}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false, color = 'text-gray-300' }: {
  icon: any; label: string; value: string; mono?: boolean; color?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
      <span className="text-[10px] text-gray-600 w-16 flex-shrink-0 font-mono">{label}</span>
      <span className={`text-[11px] ${color} ${mono ? 'font-mono' : ''} break-all leading-tight`}>{value}</span>
    </div>
  );
}
