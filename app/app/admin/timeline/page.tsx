"use client";
// @ts-nocheck
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { setFileCtx } from '@/app/components/FileContextNav';
import { ArrowLeft, Clock, Shield, Lock, FileText, CheckCircle, AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import CustodyTimeline from '@/app/components/CustodyTimeline';

type CustodyState = {
  id: string;
  folder: string;
  filename: string;
  custodyStartedAt: string;
  initialReportId: string | null;
  intermediaryReportId: string | null;
  encryptedAt: string | null;
  finalReportId: string | null;
};

type LaudoRef = {
  id: string;
  titulo: string;
  reportType: string;
  createdAt: string;
};

type TimelineEntry = CustodyState & {
  initialReport?: LaudoRef;
  finalReport?: LaudoRef;
};

const ACTION_COLORS: Record<string, string> = {
  read: '#00f3ff',
  download: '#3b82f6',
  custody: '#bc13fe',
  pericia: '#f59e0b',
  delete: '#ef4444',
  trash: '#f97316',
  canary: '#ef4444',
  encrypt: '#22c55e',
};

function StepDot({ done, active, color }: { done: boolean; active: boolean; color: string }) {
  if (done) return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}20`, border: `2px solid ${color}` }}>
      <CheckCircle className="w-4 h-4" style={{ color }} />
    </div>
  );
  if (active) return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse"
      style={{ background: `${color}15`, border: `2px solid ${color}60` }}>
      <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: '#ffffff08', border: '2px solid #ffffff15' }}>
      <div className="w-2 h-2 rounded-full bg-gray-600" />
    </div>
  );
}

function CustodyCard({ entry, expanded, onToggle }: { entry: TimelineEntry; expanded: boolean; onToggle: () => void }) {
  const steps = [
    {
      label: 'Custódia Iniciada',
      done: true,
      ts: entry.custodyStartedAt,
      color: '#bc13fe',
      icon: Shield,
    },
    {
      label: 'Relatório Inicial',
      done: !!entry.initialReportId,
      ts: entry.initialReport?.createdAt,
      color: '#3b82f6',
      icon: FileText,
    },
    {
      label: 'Relatório Intermediário',
      done: !!entry.intermediaryReportId,
      ts: null,
      color: '#f59e0b',
      icon: FileText,
    },
    {
      label: 'Encriptação',
      done: !!entry.encryptedAt,
      ts: entry.encryptedAt,
      color: '#22c55e',
      icon: Lock,
    },
    {
      label: 'Relatório Final',
      done: !!entry.finalReportId,
      ts: entry.finalReport?.createdAt,
      color: '#ef4444',
      icon: FileText,
    },
  ];

  const doneSteps = steps.filter(s => s.done).length;
  const pct = Math.round((doneSteps / steps.length) * 100);
  const isComplete = doneSteps === steps.length;

  return (
    <div className="glass-panel rounded-xl border overflow-hidden transition-all duration-200"
      style={{ borderColor: isComplete ? '#22c55e30' : '#ffffff10' }}>
      {/* Header */}
      <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
        onClick={onToggle}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isComplete ? '#22c55e12' : '#bc13fe12', border: `1px solid ${isComplete ? '#22c55e30' : '#bc13fe30'}` }}>
          {isComplete
            ? <CheckCircle className="w-5 h-5 text-emerald-400" />
            : <Shield className="w-5 h-5" style={{ color: '#bc13fe' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{entry.filename}</p>
          <p className="text-xs text-gray-500 truncate">{entry.folder}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Progress bar */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold" style={{ color: isComplete ? '#22c55e' : '#bc13fe' }}>
              {doneSteps}/{steps.length} etapas
            </span>
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: isComplete ? '#22c55e' : '#bc13fe' }} />
            </div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded steps */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <CustodyTimeline
            custodyState={{
              custodyStartedAt: entry.custodyStartedAt,
              initialReportAt: entry.initialReport?.createdAt || (entry as any).initialReportAt || null,
              intermediaryReportAt: (entry as any).intermediaryReportAt || null,
              encryptedAt: entry.encryptedAt,
              finalReportAt: entry.finalReport?.createdAt || (entry as any).finalReportAt || null,
              finalReportExpiresAt: (entry as any).finalReportExpiresAt || null,
            }}
          />
        </div>
      )}
    </div>
  );
}

function TimelinePageInner() {
  const searchParams = useSearchParams();
  const ctxFolder = searchParams.get('folder');
  const ctxFile   = searchParams.get('file');

  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'pending' | 'complete'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/custody-timeline');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-expand entry from URL params
  useEffect(() => {
    if (ctxFolder && ctxFile && entries.length > 0) {
      const entry = entries.find(e => e.folder === ctxFolder && e.filename === ctxFile);
      if (entry) {
        setExpanded(prev => new Set([...prev, entry.id]));
        setFileCtx(ctxFolder, ctxFile);
      }
    }
  }, [ctxFolder, ctxFile, entries]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    // Set file context when expanding
    const entry = entries.find(e => e.id === id);
    if (entry && !expanded.has(id)) setFileCtx(entry.folder, entry.filename);
  };

  const filtered = entries.filter(e => {
    const doneSteps = [e.initialReportId, e.intermediaryReportId, e.encryptedAt, e.finalReportId].filter(Boolean).length + 1;
    if (filter === 'complete') return doneSteps === 5;
    if (filter === 'pending') return doneSteps < 5;
    return true;
  });

  const complete = entries.filter(e => e.initialReportId && e.intermediaryReportId && e.encryptedAt && e.finalReportId).length;
  const pending = entries.length - complete;

  return (
    <div className="min-h-screen p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: '#bc13fe' }} />
            Linha do Tempo de Custódia
          </h1>
          <p className="text-xs text-gray-500">Ciclo de vida forense de cada ativo custodiado</p>
        </div>
        <button onClick={load} className="ml-auto p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: entries.length, color: '#bc13fe' },
          { label: 'Pendentes', value: pending, color: '#f59e0b' },
          { label: 'Concluídos', value: complete, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="glass-panel p-3 rounded-xl border border-white/5 text-center">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'complete'] as const).map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              background: filter === f ? '#bc13fe20' : '#ffffff08',
              border: `1px solid ${filter === f ? '#bc13fe50' : '#ffffff10'}`,
              color: filter === f ? '#bc13fe' : '#6b7280',
            }}>
            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Concluídos'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhum ativo custodiado encontrado.</p>
          <p className="text-xs mt-1">Inicie uma perícia para criar o ciclo de custódia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <CustodyCard
              key={entry.id}
              entry={entry}
              expanded={expanded.has(entry.id)}
              onToggle={() => toggle(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={null}>
      <TimelinePageInner />
    </Suspense>
  );
}
