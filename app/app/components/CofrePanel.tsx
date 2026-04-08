"use client";

import { useEffect, useRef, useState } from "react";
import {
  Shield, Activity, FileText, ChevronDown, ChevronUp,
  Lock, Eye, File, AlertTriangle, Hash, Clock,
} from "lucide-react";
import { folderColor } from "@/lib/folderColors";

const FOLDER_LABELS: Record<string, string> = {
  '0_NCFN-ULTRASECRETOS':                         '0 · Ultrasecretos',
  '1_NCFN-PROVAS-SENSÍVEIS':                      '1 · Provas Sensíveis',
  '2_NCFN-ELEMENTOS-DE-PROVA':                    '2 · Elementos de Prova',
  '3_NCFN-DOCUMENTOS-GERENTE':                    '3 · Documentos Gerente',
  '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS':     '4 · Processos / Contratos',
  '5_NCFN-GOVERNOS-EMPRESAS':                     '5 · Governos / Empresas',
  '6_NCFN-FORNECIDOS_sem_registro_de_coleta':     '6 · Fornecidos s/ Registro',
  '7_NCFN-CAPTURAS-WEB_OSINT':                    '7 · Capturas Web / OSINT',
  '8_NCFN-VIDEOS':                                '8 · Vídeos',
  '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS': '9 · Perfis Criminais',
  '10_NCFN-ÁUDIO':                                '10 · Áudio',
  '12_NCFN-METADADOS-LIMPOS':                     '12 · Metadados Limpos',
};

interface AccessLog {
  id: string;
  filePath: string;
  action: string;
  userEmail: string;
  ip: string | null;
  isCanary: boolean;
  createdAt: string;
}

interface TimelinePoint {
  label: string;
  actor: string;
  color: string;
  isCanary: boolean;
  datetime: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string; actor: string }> = {
  read:     { label: 'Leitura',           color: '#22d3ee', actor: 'Usuário' },
  upload:   { label: 'Custódia',          color: '#8b5cf6', actor: 'Usuário' },
  download: { label: 'Download',          color: '#3b82f6', actor: 'Usuário' },
  custody:  { label: 'Custódia Inicial',  color: '#8b5cf6', actor: 'Usuário' },
  pericia:  { label: 'Perícia Digital',   color: '#a78bfa', actor: 'Sistema NCFN' },
  encrypt:  { label: 'Encriptação',       color: '#f59e0b', actor: 'Sistema NCFN' },
  decrypt:  { label: 'Decriptação',       color: '#10b981', actor: 'Usuário' },
  share:    { label: 'Compartilhamento',  color: '#6366f1', actor: 'Usuário' },
  trash:    { label: 'Lixeira',           color: '#eab308', actor: 'Usuário' },
  delete:   { label: 'Exclusão',          color: '#ef4444', actor: 'Usuário' },
  burn:     { label: 'Burn Token',        color: '#f97316', actor: 'Usuário' },
  canary:   { label: '⚠ CANARY',         color: '#ef4444', actor: 'Sistema NCFN' },
  cloud_custody: { label: 'Custódia Nuvem', color: '#06b6d4', actor: 'Usuário' },
};

function CombinedTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) return null;
  const W = 900;
  const pad = 60;
  const usable = W - pad * 2;
  const step = points.length > 1 ? usable / (points.length - 1) : 0;
  const actorRowY = 100;
  const dateRowY = 165;
  const H = dateRowY + 60;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]" style={{ height: H }}>
        {points.length > 1 && (
          <line x1={pad} y1={actorRowY} x2={pad + step * (points.length - 1)} y2={actorRowY}
            stroke="#1e293b" strokeWidth="2" />
        )}
        {points.map((pt, i) => {
          const cx = pad + step * i;
          return (
            <line key={`conn-${i}`}
              x1={cx} y1={actorRowY + 8} x2={cx} y2={dateRowY - 8}
              stroke={pt.color} strokeWidth="1.5" strokeDasharray="3 3" opacity={0.5} />
          );
        })}
        {points.length > 1 && (
          <line x1={pad} y1={dateRowY} x2={pad + step * (points.length - 1)} y2={dateRowY}
            stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 3" />
        )}
        {points.map((pt, i) => {
          const cx = pad + step * i;
          const dt = new Date(pt.datetime);
          const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return (
            <g key={i}>
              <circle cx={cx} cy={actorRowY} r={6} fill={pt.color} opacity={0.9}
                filter={pt.isCanary ? 'drop-shadow(0 0 6px #ef4444)' : `drop-shadow(0 0 4px ${pt.color}55)`} />
              <text x={cx} y={actorRowY - 12} textAnchor="start" fontSize="9"
                fill={pt.color} fontWeight="bold" fontFamily="monospace"
                transform={`rotate(-45, ${cx}, ${actorRowY - 12})`}>
                {pt.label}
              </text>
              <text x={cx} y={actorRowY + 14} textAnchor="start" fontSize="8"
                fill="#64748b" fontFamily="monospace"
                transform={`rotate(45, ${cx}, ${actorRowY + 14})`}>
                #{i + 1} {pt.actor.length > 12 ? pt.actor.slice(0, 10) + '…' : pt.actor}
              </text>
              <circle cx={cx} cy={dateRowY} r={4} fill={pt.color} opacity={0.7} />
              <text x={cx} y={dateRowY + 14} textAnchor="middle" fontSize="8"
                fill="#94a3b8" fontFamily="monospace">{dateStr}</text>
              <text x={cx} y={dateRowY + 24} textAnchor="middle" fontSize="8"
                fill="#64748b" fontFamily="monospace">{timeStr}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface CofrePanelProps {
  folder: string;
  filename: string;
  custodyState: any | null;
}

export default function CofrePanel({ folder, filename, custodyState }: CofrePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Re-fetch logs when file changes
  useEffect(() => {
    if (!folder || !filename) { setLogs([]); return; }
    setLogs([]);
    setLoading(true);
    const filePath = `${folder}/${filename}`;
    fetch(`/api/vault/logs?filePath=${encodeURIComponent(filePath)}&limit=200`)
      .then(r => r.json())
      .then(data => setLogs(data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [folder, filename]);

  // Auto-expand when logs arrive
  useEffect(() => {
    if (logs.length > 0) setExpanded(true);
  }, [logs.length > 0]);

  // Build timeline points
  const custodyEvents: TimelinePoint[] = [];
  if (custodyState) {
    if (custodyState.custodyStartedAt) custodyEvents.push({
      label: 'T0 — Custódia', actor: 'Sistema NCFN', color: '#bc13fe',
      isCanary: false, datetime: custodyState.custodyStartedAt,
    });
    if (custodyState.encryptedAt) custodyEvents.push({
      label: 'Encriptação AES-256', actor: 'Sistema NCFN', color: '#f59e0b',
      isCanary: false, datetime: custodyState.encryptedAt,
    });
    if (custodyState.initialReportAt) custodyEvents.push({
      label: 'Relatório Inicial', actor: 'Sistema NCFN', color: '#22c55e',
      isCanary: false, datetime: custodyState.initialReportAt,
    });
    if (custodyState.intermediaryReportAt) custodyEvents.push({
      label: 'Rel. Intermediário', actor: 'Sistema NCFN', color: '#3b82f6',
      isCanary: false, datetime: custodyState.intermediaryReportAt,
    });
    if (custodyState.finalReportAt) custodyEvents.push({
      label: 'Relatório Final', actor: 'Sistema NCFN', color: '#ef4444',
      isCanary: false, datetime: custodyState.finalReportAt,
    });
  }

  const logPoints: TimelinePoint[] = [...logs].reverse().map(log => {
    const act = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280', actor: log.userEmail };
    return {
      label: act.label,
      actor: log.userEmail || act.actor,
      color: act.color,
      isCanary: log.isCanary,
      datetime: log.createdAt,
    };
  });

  const timelinePoints = [...custodyEvents, ...logPoints]
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const canaryCount = logs.filter(l => l.isCanary).length;
  const totalPoints = timelinePoints.length;

  // Calculate custody duration
  const custodyDuration = custodyState?.custodyStartedAt
    ? (() => {
        const start = new Date(custodyState.custodyStartedAt).getTime();
        const end = custodyState.finalReportAt
          ? new Date(custodyState.finalReportAt).getTime()
          : Date.now();
        const hrs = Math.round((end - start) / 3600000);
        return hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
      })()
    : null;

  return (
    <div
      ref={panelRef}
      className="flex-shrink-0 transition-all duration-300"
      style={{ maxHeight: expanded ? '480px' : '40px', overflow: 'hidden', borderTop: `1px solid ${folderColor(folder)}30` }}
    >
      {/* ── Header / toggle bar ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group"
      >
        <Shield size={13} className="flex-shrink-0" style={{ color: folderColor(folder) }} />
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: folderColor(folder) }}>
          {FOLDER_LABELS[folder] || folder}
        </span>
        <span className="text-[10px] text-gray-600 font-mono">· Linha do Tempo</span>

        {/* Badges */}
        <div className="flex items-center gap-2 ml-2">
          {totalPoints > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] font-mono border border-[#8b5cf6]/20">
              {totalPoints} eventos
            </span>
          )}
          {canaryCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-black border border-red-500/30 animate-pulse">
              ⚠ {canaryCount} CANARY
            </span>
          )}
          {custodyDuration && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
              <Clock size={8} className="inline mr-0.5" />{custodyDuration}
            </span>
          )}
          {loading && (
            <div className="w-3 h-3 border border-[#8b5cf6]/40 border-t-[#8b5cf6] rounded-full animate-spin" />
          )}
        </div>

        <div className="ml-auto text-[#8b5cf6]/40 group-hover:text-[#8b5cf6] transition-colors">
          {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>

      {/* ── Body ── */}
      <div className="overflow-y-auto" style={{ maxHeight: '440px' }}>

        {/* Timeline */}
        {timelinePoints.length > 0 ? (
          <div className="border-b border-white/5">
            <div className="px-4 py-2 flex items-center gap-2 bg-black/20">
              <Activity size={11} className="text-[#8b5cf6]" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                Ações · Atores · Datas
              </span>
              <span className="text-[9px] text-gray-600 font-mono ml-auto">{timelinePoints.length} pontos</span>
            </div>
            <div className="px-3 pb-2">
              <CombinedTimeline points={timelinePoints} />
            </div>
          </div>
        ) : !loading && (
          <div className="px-4 py-4 text-[10px] text-gray-700 font-mono text-center border-b border-white/5">
            Nenhum evento de custódia registrado para este arquivo.
          </div>
        )}

        {/* Logs table */}
        {logs.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-black/20 flex items-center gap-2 sticky top-0 z-10">
              <FileText size={11} className="text-[#8b5cf6]" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">Registros de Acesso</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] font-mono ml-1">
                {logs.length}
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="text-left px-4 py-1.5">#</th>
                  <th className="text-left px-4 py-1.5">Data / Hora</th>
                  <th className="text-left px-4 py-1.5">Ação</th>
                  <th className="text-left px-4 py-1.5">Usuário</th>
                  <th className="text-left px-4 py-1.5">IP</th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().map((log, idx) => {
                  const act = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280', actor: '' };
                  return (
                    <tr key={log.id}
                      className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${log.isCanary ? 'bg-red-950/20' : ''}`}>
                      <td className="px-4 py-1.5 font-mono text-gray-700 text-[9px]">#{idx + 1}</td>
                      <td className="px-4 py-1.5 font-mono text-gray-500 whitespace-nowrap text-[9px]">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-1.5 font-bold text-[9px]" style={{ color: act.color }}>
                        {act.label}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-gray-400 truncate max-w-[160px] text-[9px]">
                        {log.userEmail}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-gray-600 text-[9px]">
                        {log.ip || '—'}
                        {log.isCanary && (
                          <span className="ml-2 text-[8px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                            ⚠ CANARY
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 flex items-center justify-center gap-2 text-[8px] text-gray-700 font-mono border-t border-white/5">
          <Shield size={8} />
          AUDITORIA NCFN · SOMENTE LEITURA · IMUTÁVEL · SHA-256 + AES-256-CBC
        </div>
      </div>
    </div>
  );
}
