'use client';

import { useEffect, useState } from 'react';
import { HardDrive, FileText, Zap } from 'lucide-react';

export default function QuotaBar() {
  const [quota, setQuota] = useState<{ planType: string, uploadedFilesCount: number, totalBytesUsed: number } | null>(null);

  useEffect(() => {
    fetch('/api/quota')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setQuota(data);
      });
  }, []);

  if (!quota) return null;

  const maxFiles = 10;
  const maxBytes = 1073741824; // 1GB

  const isPro = quota.planType === 'PRO';

  if (isPro) {
    return (
      <div className="mt-6 mb-2 mx-4 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-cyan-400 mb-2">
          <Zap className="h-4 w-4" />
          <span className="text-xs font-bold tracking-widest uppercase">NCFN PRO</span>
        </div>
        <div className="text-[10px] text-cyan-200/50">Custódia ilimitada ativada · Sem restrições de volume ou quantidade de ativos.</div>
      </div>
    );
  }

  const filesPercentage = Math.min((quota.uploadedFilesCount / maxFiles) * 100, 100);
  const bytesPercentage = Math.min((quota.totalBytesUsed / maxBytes) * 100, 100);
  
  const isDanger = filesPercentage >= 100 || bytesPercentage >= 100;

  return (
    <div className={`mt-6 mb-2 mx-4 p-3 rounded-lg border ${isDanger ? 'bg-red-900/20 border-red-500/50' : 'bg-black/40 border-slate-700/50'}`}>
        <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cota Operacional · Trial</span>
            <a href="/upgrade" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-all">ACREDITAÇÃO PRO</a>
        </div>

        {/* Files Bar */}
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5 text-slate-300">
                    <FileText className="h-3 w-3" />
                    <span className="text-[10px]">Arquivos</span>
                </div>
                <span className={`text-[10px] font-mono ${filesPercentage >= 100 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                    {quota.uploadedFilesCount} / {maxFiles}
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${filesPercentage >= 100 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-indigo-500'}`} 
                  style={{ width: `${filesPercentage}%` }} />
            </div>
        </div>

        {/* Storage Bar */}
        <div>
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5 text-slate-300">
                    <HardDrive className="h-3 w-3" />
                    <span className="text-[10px]">Armazenamento</span>
                </div>
                <span className={`text-[10px] font-mono ${bytesPercentage >= 100 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                    {(quota.totalBytesUsed / 1024 / 1024).toFixed(1)}MB / 1GB
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${bytesPercentage >= 100 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`} 
                  style={{ width: `${bytesPercentage}%` }} />
            </div>
        </div>
    </div>
  );
}
