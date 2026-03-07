"use client";
import { useState, useRef } from 'react';
import { ShieldCheck, UploadCloud, Copy, Fingerprint, Info, X } from 'lucide-react';
import PublicAuth from '../components/PublicAuth';

export default function OnlineAuditor() {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedHash, setGeneratedHash] = useState<string | null>(null);
    const [expectedHash, setExpectedHash] = useState("");
    const [verdict, setVerdict] = useState<'MATCH' | 'MISMATCH' | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) processFile(droppedFile);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const processFile = async (selectedFile: File) => {
        setFile(selectedFile);
        setGeneratedHash(null);
        setVerdict(null);
        setLoading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            // Envia o arquivo para a RAM do Servidor
            const res = await fetch('/api/verify-hash', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (res.ok && data.hash) {
                setGeneratedHash(data.hash);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const checkIntegrity = () => {
        if (!generatedHash || !expectedHash) return;
        const cleanExpected = expectedHash.trim().toLowerCase();
        setVerdict(generatedHash.toLowerCase() === cleanExpected ? 'MATCH' : 'MISMATCH');
    };

    const reset = () => {
        setFile(null);
        setGeneratedHash(null);
        setExpectedHash("");
        setVerdict(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <PublicAuth>
            <div className="max-w-4xl mx-auto mt-8 space-y-12">
                <div className="text-center mb-12 space-y-4">
                    <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#bc13fe]">AUDITOR FORENSE CLOUD</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Motor de validação de Assinaturas SHA-256 executado <b>In-Memory</b> (vRAM).<br />
                        <span className="text-xs text-[#bc13fe] border-b border-[#bc13fe]/30 pb-1">Seu arquivo NUNCA é salvo fisicamente em nossos servidores durante este processo.</span>
                    </p>
                </div>

                <div
                    className={`relative w-full p-12 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] overflow-hidden ${isDragging ? 'border-[#00f3ff] bg-[#00f3ff]/10 scale-105' : file ? 'border-[#bc13fe]/30 bg-gray-900/50' : 'border-gray-700 hover:border-gray-500 bg-gray-950 hover:bg-gray-900'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileInput} className="hidden" />

                    {!file ? (
                        <>
                            <div className="w-24 h-24 mb-6 rounded-full bg-gray-800/80 flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                                <ShieldCheck className="w-12 h-12 text-[#00f3ff]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Arraste a Evidência Digital para cá</h3>
                            <p className="text-gray-500 mb-6">ou clique no botão abaixo para explorar os diretórios locais.</p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 transition flex items-center gap-3"
                            >
                                <UploadCloud className="w-5 h-5" /> Localizar Arquivo
                            </button>
                        </>
                    ) : (
                        <div className="w-full relative z-10 flex flex-col items-center">
                            <button onClick={reset} className="absolute -top-6 -right-6 p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full transition border border-gray-700">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-4 mb-8 bg-black/40 px-6 py-4 rounded-full border border-gray-800 w-full max-w-2xl">
                                <div className="p-3 bg-[#bc13fe]/20 text-[#bc13fe] rounded-full shrink-0">
                                    <Fingerprint className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col truncate w-full">
                                    <span className="text-white font-bold truncate text-lg">{file.name}</span>
                                    <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB • Analisando Integridade Molecular</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 border-4 border-t-[#00f3ff] border-gray-800 rounded-full animate-spin mx-auto"></div>
                                    <p className="text-[#00f3ff] font-bold animate-pulse">Extraindo Identidade Hash na RAM Virtual...</p>
                                </div>
                            ) : generatedHash ? (
                                <div className="w-full max-w-2xl space-y-6">
                                    <div className="bg-black/80 border border-gray-800 p-6 rounded-2xl relative group">
                                        <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">Hash SHA-256 Calculado:</p>
                                        <p className="font-mono text-xl text-[#00f3ff] break-all tracking-wide">{generatedHash}</p>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(generatedHash)}
                                            className="absolute top-6 right-6 p-2 bg-gray-800 text-white rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-[#bc13fe]"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                        <h4 className="font-bold text-white flex items-center gap-2">
                                            <ShieldCheck className="w-5 h-5 text-gray-400" />
                                            Certificação de Autenticidade
                                        </h4>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="text"
                                                placeholder="Cole o Hash original do NCFN aqui para aferição cruzada..."
                                                value={expectedHash}
                                                onChange={e => setExpectedHash(e.target.value)}
                                                className="flex-grow bg-black border border-gray-700 rounded-xl px-4 py-3 font-mono text-sm focus:border-[#bc13fe] focus:outline-none transition text-white"
                                                spellCheck={false}
                                            />
                                            <button
                                                onClick={checkIntegrity}
                                                disabled={!expectedHash}
                                                className="shrink-0 px-6 py-3 bg-[#bc13fe] hover:bg-[#a00bdb] disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition shadow-[0_0_15px_rgba(188,19,254,0.4)] disabled:shadow-none"
                                            >
                                                Emitir Veredito
                                            </button>
                                        </div>

                                        {verdict === 'MATCH' && (
                                            <div className="mt-4 bg-green-900/20 border border-green-500/50 p-4 rounded-xl flex items-start gap-4 animate-in fade-in zoom-in duration-300">
                                                <div className="p-2 bg-green-500 rounded-lg text-white shrink-0">✅</div>
                                                <div>
                                                    <h5 className="text-green-400 font-bold text-lg">AUTÊNTICO E INTACTO</h5>
                                                    <p className="text-green-200/70 text-sm">O arquivo analisado na memória possui integridade estrutural matemática 100% idêntica ao carimbo oficial do Portal NCFN.</p>
                                                </div>
                                            </div>
                                        )}

                                        {verdict === 'MISMATCH' && (
                                            <div className="mt-4 bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-4 animate-in fade-in zoom-in duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                                <div className="p-2 bg-red-500 rounded-lg text-white shrink-0 animate-bounce">❌</div>
                                                <div>
                                                    <h5 className="text-red-400 font-bold text-lg">ALERTA VERMELHO: FRAUDE DETECTADA</h5>
                                                    <p className="text-red-200/70 text-sm">O código arquitetural do arquivo sofreu mutação. Ele não confere com o original do banco de dados.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="flex items-start gap-4 bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                    <Info className="w-6 h-6 text-[#bc13fe] shrink-0 mt-1" />
                    <div>
                        <h4 className="text-white font-bold mb-2">Segurança em Nível de Memória (vRAM)</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Ao soltar um arquivo neste painel, nossa arquitetura Serverless aloca os bytes temporariamente na memória RAM do servidor Cloud primário, sem nunca submeter os buffers aos discos magnéticos (HD/SSD). O motor algorítmico extrai a assinatura e imediatamente executa a varredura do Garbage Collector, aniquilando e sobrescrevendo a memória RAM utilizada, não deixando absolutamente nenhum rastro cibernético.
                        </p>
                    </div>
                </div>
            </div>
        </PublicAuth>
    );
}
