"use client";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart2 } from 'lucide-react';

type FileItem = {
  folder: string;
  filename: string;
  size: number;
  mtime: string;
  isPublic: boolean;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / 1048576).toFixed(1)}MB`;
}

const NEON_COLORS = ['#bc13fe', '#00f3ff', '#34d399', '#f59e0b', '#ef4444', '#a78bfa', '#38bdf8', '#fb923c'];

const CustomTooltipDark = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono shadow-xl backdrop-blur-xl">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: <span className="text-white font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function AdminCharts({ files }: { files: FileItem[] }) {
  const validFiles = files.filter(f => f.filename !== 'vazio.txt');

  // ─── 1. Activity last 7 days ───
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    const count = validFiles.filter(f => f.mtime?.split('T')[0] === key).length;
    const bytes = validFiles.filter(f => f.mtime?.split('T')[0] === key).reduce((a, f) => a + f.size, 0);
    return { label, count, bytes: Math.round(bytes / 1024) };
  });

  // ─── 2. Storage by folder — all 12 folders, full names ───
  const ALL_FOLDERS = [
    '0_NCFN-ULTRASECRETOS',
    '1_NCFN-PROVAS-SENSÍVEIS',
    '2_NCFN-ELEMENTOS-DE-PROVA',
    '3_NCFN-DOCUMENTOS-GERENTE',
    '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS',
    '5_NCFN-GOVERNOS-EMPRESAS',
    '6_NCFN-FORNECIDOS_sem_registro_de_coleta',
    '7_NCFN-CAPTURAS-WEB_OSINT',
    '8_NCFN-VIDEOS',
    '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS',
    '10_NCFN-ÁUDIO',
    '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS',
  ];
  const FOLDER_SHORT: Record<string, string> = {
    '0_NCFN-ULTRASECRETOS': '0 · Ultrasecretos',
    '1_NCFN-PROVAS-SENSÍVEIS': '1 · Provas Sensíveis',
    '2_NCFN-ELEMENTOS-DE-PROVA': '2 · Elementos de Prova',
    '3_NCFN-DOCUMENTOS-GERENTE': '3 · Docs Gerente',
    '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS': '4 · Processos/Contratos',
    '5_NCFN-GOVERNOS-EMPRESAS': '5 · Governos/Empresas',
    '6_NCFN-FORNECIDOS_sem_registro_de_coleta': '6 · Fornecidos s/Reg.',
    '7_NCFN-CAPTURAS-WEB_OSINT': '7 · Capturas Web/OSINT',
    '8_NCFN-VIDEOS': '8 · Vídeos',
    '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS': '9 · Perfis Criminais',
    '10_NCFN-ÁUDIO': '10 · Áudio',
    '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS': '11 · Compartilhamento',
  };
  const byFolder: Record<string, number> = {};
  validFiles.forEach(f => {
    byFolder[f.folder] = (byFolder[f.folder] || 0) + f.size;
  });
  const folderData = ALL_FOLDERS.map(key => ({
    name: FOLDER_SHORT[key] || key.substring(0, 18),
    fullName: key.replace(/_/g, ' '),
    bytes: Math.round((byFolder[key] || 0) / 1024),
    rawBytes: byFolder[key] || 0,
    sizeLabel: formatBytes(byFolder[key] || 0),
  }));

  // ─── 3. File types distribution ───
  const extCount: Record<string, number> = {};
  validFiles.forEach(f => {
    const ext = f.filename.split('.').pop()?.toUpperCase() || 'Outros';
    extCount[ext] = (extCount[ext] || 0) + 1;
  });
  const typeData = Object.entries(extCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const total = typeData.reduce((s, d) => s + d.value, 0);

  if (validFiles.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#00f3ff]" />
          </div>
          <div>
            <h3 className="text-xl lg:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00f3ff] tracking-tighter">
              PAINEL ANALÍTICO
            </h3>
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Métricas de custódia em tempo real</p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-[#00f3ff]/30 to-transparent flex-grow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Area Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-[#00f3ff]/20">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#00f3ff]" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Atividade — Últimos 7 Dias</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last7} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#bc13fe" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#bc13fe" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltipDark />} />
              <Area type="monotone" dataKey="count" name="Arquivos" stroke="#00f3ff" strokeWidth={2} fill="url(#gradCyan)" dot={{ fill: '#00f3ff', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#00f3ff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - File Types */}
        <div className="glass-panel rounded-2xl p-5 border border-[#bc13fe]/20">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-[#bc13fe]" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Tipos de Arquivo</span>
          </div>
          {typeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipDark />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {typeData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm" style={{ background: NEON_COLORS[i % NEON_COLORS.length] }} />
                      <span className="text-[10px] font-mono text-gray-400">{d.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-300">{Math.round(d.value / total * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-600 font-mono text-center py-8">Sem dados</p>
          )}
        </div>
      </div>

      {/* Storage Bar Chart — all 12 folders, full names, size above bars */}
      <div className="glass-panel rounded-2xl p-5 border border-[#bc13fe]/20">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-[#bc13fe]" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Volume por Zona de Custódia — 12 Pastas</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={folderData} margin={{ top: 22, right: 8, left: -10, bottom: 70 }} barCategoryGap="8%">
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#bc13fe" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="barGradEmpty" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#374151" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#1f2937" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 8.5, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              angle={-42}
              textAnchor="end"
              interval={0}
              height={75}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v === 0 ? '0' : `${v}KB`}
            />
            <Tooltip
              content={<CustomTooltipDark />}
              formatter={(v: any, _name: any, props: any) => [props.payload.sizeLabel, 'Volume']}
              labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName || _l}
            />
            <Bar dataKey="bytes" radius={[4, 4, 0, 0]}>
              {folderData.map((entry, i) => (
                <Cell key={i} fill={entry.rawBytes > 0 ? 'url(#barGrad)' : 'url(#barGradEmpty)'} />
              ))}
              <LabelList
                dataKey="sizeLabel"
                position="top"
                style={{ fill: '#d1d5db', fontSize: 8, fontFamily: 'monospace' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
