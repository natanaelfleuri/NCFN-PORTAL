"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./DynamicMap'), { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center text-[#bc13fe]">Gerando mosaico do mapa...</div> });

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

export default function MapDashboard() {
    const [records, setRecords] = useState<ForensicsRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/forensics')
            .then(res => res.json())
            .then(data => {
                setRecords(data.records || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erro ao carregar os dados forenses", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-center mt-10 text-[#bc13fe] animate-pulse">Carregando Cartografia Forense...</div>;

    return (
        <div className="space-y-8 mt-12 w-full">
            <h3 className="text-3xl font-bold text-center text-white mb-6" style={{ textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>
                Cartografia Forense (Interceptações Locais)
            </h3>

            <div className="glass-panel p-4 rounded-2xl border border-[#bc13fe]/30 overflow-hidden relative z-0 h-[500px] w-full">
                <DynamicMap records={records} />
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-[#bc13fe]/30 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="text-xs text-white uppercase bg-[#bc13fe]/10 border-b border-[#bc13fe]/30">
                        <tr>
                            <th className="px-6 py-3">Arquivo</th>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Alvo (IP/Local)</th>
                            <th className="px-6 py-3">Assinatura Dispositivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center">Nenhuma interceptação registrada ainda.</td>
                            </tr>
                        ) : (
                            records.map(record => (
                                <tr key={record.id} className="border-b border-gray-800 hover:bg-[#bc13fe]/5 transition-colors">
                                    <td className="px-6 py-4 font-medium text-red-400">{record.arquivo}</td>
                                    <td className="px-6 py-4">{record.dataBaixado}</td>
                                    <td className="px-6 py-4">
                                        <span className="block">{record.ip}</span>
                                        <span className="block text-xs text-gray-500">{record.locationName}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs truncate max-w-xs" title={record.device}>{record.device}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
