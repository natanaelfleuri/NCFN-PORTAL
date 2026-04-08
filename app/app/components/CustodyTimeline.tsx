'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Lock, FileText, Shield, Timer } from 'lucide-react';

interface CustodyState {
  custodyStartedAt?: string | null;
  initialReportAt?: string | null;
  intermediaryReportAt?: string | null;
  encryptedAt?: string | null;
  finalReportAt?: string | null;
  finalReportExpiresAt?: string | null;
}

interface CustodyTimelineProps {
  custodyState: CustodyState;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

function isAvailable(referenceAt: string | null | undefined, delayMinutes: number): boolean {
  if (!referenceAt) return false;
  const ref = new Date(referenceAt).getTime();
  return Date.now() >= ref + delayMinutes * 60 * 1000;
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  });

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (remaining <= 0) {
    return <span className="text-red-400 font-mono text-[10px] font-bold">EXPIRADO</span>;
  }

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);

  return (
    <span className="text-amber-400 font-mono text-[10px] font-bold tabular-nums">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export default function CustodyTimeline({ custodyState }: CustodyTimelineProps) {
  const {
    custodyStartedAt,
    initialReportAt,
    intermediaryReportAt,
    encryptedAt,
    finalReportAt,
    finalReportExpiresAt,
  } = custodyState;

  const initialAvailable = isAvailable(custodyStartedAt, 30);
  const intermediaryAvailable = isAvailable(custodyStartedAt, 120);

  const steps = [
    {
      id: 'custody',
      label: 'T0 — Início da Custódia',
      icon: Shield,
      doneAt: custodyStartedAt,
      done: !!custodyStartedAt,
      available: true,
      color: { done: '#00f3ff', available: '#00f3ff', pending: '#4b5563' },
    },
    {
      id: 'initial',
      label: 'Relatório Inicial',
      sublabel: 'Disponível 30min após T0',
      icon: FileText,
      doneAt: initialReportAt,
      done: !!initialReportAt,
      available: initialAvailable,
      color: { done: '#22c55e', available: '#f59e0b', pending: '#4b5563' },
    },
    {
      id: 'intermediary',
      label: 'Relatório Intermediário',
      sublabel: 'Disponível 2h após T0',
      icon: FileText,
      doneAt: intermediaryReportAt,
      done: !!intermediaryReportAt,
      available: intermediaryAvailable,
      color: { done: '#22c55e', available: '#f59e0b', pending: '#4b5563' },
    },
    {
      id: 'encrypted',
      label: 'Criptografia',
      sublabel: 'Proteção AES-256',
      icon: Lock,
      doneAt: encryptedAt,
      done: !!encryptedAt,
      available: !!intermediaryReportAt,
      color: { done: '#bc13fe', available: '#bc13fe', pending: '#4b5563' },
    },
    {
      id: 'final',
      label: 'Relatório Final',
      sublabel: finalReportExpiresAt ? 'Expira em 5h após geração' : 'Disponível 48h após Relatório Intermediário',
      icon: CheckCircle2,
      doneAt: finalReportAt,
      done: !!finalReportAt,
      available: isAvailable(intermediaryReportAt, 2880), // 48h = 2880 min
      color: { done: '#f59e0b', available: '#f59e0b', pending: '#4b5563' },
    },
  ];

  const now = Date.now();
  const finalExpired = finalReportExpiresAt && new Date(finalReportExpiresAt).getTime() < now;
  const finalActive = finalReportAt && finalReportExpiresAt && !finalExpired;

  return (
    <div className="rounded-2xl border border-white/8 bg-black/30 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Timer className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Linha do Tempo de Custódia</h3>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-5 bottom-5 w-px bg-white/8" />

        <div className="space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const color = step.done
              ? step.color.done
              : step.available
                ? step.color.available
                : step.color.pending;

            const isLast = i === steps.length - 1;

            return (
              <div key={step.id} className="flex items-start gap-4 relative">
                {/* Circle */}
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 z-10"
                  style={{
                    borderColor: color,
                    background: step.done ? `${color}20` : step.available ? `${color}10` : '#0a0a0f',
                    boxShadow: step.done ? `0 0 12px ${color}40` : 'none',
                  }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-xs font-bold"
                      style={{ color: step.done ? 'white' : step.available ? color : '#6b7280' }}
                    >
                      {step.label}
                    </p>
                    {step.done && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                        style={{ background: `${step.color.done}20`, color: step.color.done, border: `1px solid ${step.color.done}30` }}
                      >
                        Concluído
                      </span>
                    )}
                    {!step.done && step.available && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Disponível
                      </span>
                    )}
                    {!step.done && !step.available && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-gray-800/50 text-gray-600 border border-gray-700/30">
                        Aguardando
                      </span>
                    )}
                  </div>

                  {step.sublabel && !step.done && (
                    <p className="text-[10px] text-gray-600 mt-0.5">{step.sublabel}</p>
                  )}

                  {step.doneAt && (
                    <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{formatDateTime(step.doneAt)}</p>
                  )}

                  {/* Countdown for final report */}
                  {isLast && finalActive && finalReportExpiresAt && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] text-gray-500">Expira em:</span>
                      <Countdown expiresAt={finalReportExpiresAt} />
                    </div>
                  )}

                  {isLast && finalExpired && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-red-500" />
                      <span className="text-[10px] text-red-500 font-mono font-bold">Relatório Final Expirado</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
