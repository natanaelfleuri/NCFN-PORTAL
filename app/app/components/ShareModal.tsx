"use client";
import { useEffect, useState } from 'react';
import { Share2, Mail, MessageCircle, Link as LinkIcon, X, Loader2 } from 'lucide-react';

type ShareModalProps = {
    isOpen: boolean;
    onClose: () => void;
    filename: string;
    folder: string;
    showToast: (msg: string) => void;
};

export default function ShareModal({ isOpen, onClose, filename, folder, showToast }: ShareModalProps) {
    const [tempLinkUrl, setTempLinkUrl] = useState<string | null>(null);
    const [linkConfig, setLinkConfig] = useState({ expiresInHours: 24, maxViews: 0 }); // 0 means no view limit
    const [loadingLink, setLoadingLink] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTempLinkUrl(null);
        }
    }, [isOpen, filename]);

    if (!isOpen) return null;

    const generateTempLink = async () => {
        setLoadingLink(true);
        try {
            const res = await fetch('/api/share-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder,
                    filename,
                    expiresInHours: linkConfig.expiresInHours,
                    maxViews: linkConfig.maxViews === 0 ? null : linkConfig.maxViews
                })
            });
            const data = await res.json();
            if (data.url) setTempLinkUrl(data.url);
            else showToast('Erro ao criar link temporário');
        } catch (e) {
            console.error(e);
            showToast('Falha na conexão.');
        } finally {
            setLoadingLink(false);
        }
    };

    const directUrl = `${window.location.origin}/api/download?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}`;
    const displayUrl = tempLinkUrl || directUrl;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Confira este arquivo seguro (Portal NCFN): ${displayUrl}`)}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(`Arquivo Compartilhado: ${filename}`)}&body=${encodeURIComponent(`Acesse o link seguro:\n\n${displayUrl}`)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(displayUrl)}&color=00f3ff&bgcolor=0a0a0f`;

    const copyLink = () => {
        navigator.clipboard.writeText(displayUrl);
        showToast('Link Copiado!');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
            <div
                className="glass-panel w-full max-w-lg p-6 rounded-2xl border flex flex-col items-center gap-6"
                style={{ borderColor: 'rgba(0, 243, 255, 0.3)', boxShadow: '0 0 40px rgba(0, 243, 255, 0.1)' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="w-full flex justify-between items-center mb-2 border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3 text-white">
                        <Share2 className="w-6 h-6 text-[#00f3ff]" />
                        <h3 className="text-xl font-bold truncate pr-4">{filename}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X className="w-6 h-6" /></button>
                </div>

                {/* QR Code centralizado */}
                <div className="flex flex-col items-center gap-2 p-4 bg-gray-900 rounded-xl border border-gray-800 w-full relative">
                    <img src={qrCodeUrl} alt="QR Code Link" width={150} height={150} className="rounded-lg mix-blend-screen" />
                    <span className="text-[10px] text-gray-500 font-mono text-center break-all w-full select-all bg-black/50 p-2 rounded">
                        {displayUrl}
                    </span>
                </div>

                {!tempLinkUrl && (
                    <div className="w-full space-y-3 bg-[#0a0a0f] p-4 rounded-xl border border-gray-800">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Compartilhamento Criptográfico</label>
                        <div className="flex gap-2">
                            <select
                                className="bg-black border border-gray-800 text-sm text-white rounded-lg p-2 flex-grow focus:outline-none focus:border-[#00f3ff]"
                                value={linkConfig.expiresInHours}
                                onChange={e => setLinkConfig({ ...linkConfig, expiresInHours: parseInt(e.target.value) })}
                            >
                                <option value={1}>Expira em 1 Hora</option>
                                <option value={24}>Expira em 24 Horas</option>
                                <option value={168}>Expira em 7 Dias</option>
                            </select>
                            <select
                                className="bg-black border border-gray-800 text-sm text-white rounded-lg p-2 flex-grow focus:outline-none focus:border-red-500"
                                value={linkConfig.maxViews}
                                onChange={e => setLinkConfig({ ...linkConfig, maxViews: parseInt(e.target.value) })}
                            >
                                <option value={0}>Acessos Ilimitados</option>
                                <option value={1}>1 Acesso (Burn After Reading)</option>
                                <option value={5}>5 Acessos</option>
                            </select>
                        </div>
                        <button
                            onClick={generateTempLink}
                            disabled={loadingLink}
                            className="w-full mt-2 py-3 bg-white/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] font-bold rounded-lg transition-colors border border-[#00f3ff]/30 text-sm flex items-center justify-center gap-2"
                        >
                            {loadingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                            Gerar Link Protegido
                        </button>
                    </div>
                )}

                {tempLinkUrl && (
                    <div className="w-full text-center text-xs text-green-400 bg-green-950/30 p-2 border border-green-500/30 rounded-lg">
                        Link Temporário gerado com Sucesso. Compartilhe usando as opções abaixo.
                    </div>
                )}

                {/* Botões Sociais */}
                <div className="flex w-full gap-3">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center gap-2 py-3 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-xl transition">
                        <MessageCircle className="w-6 h-6" />
                        <span className="text-sm font-bold">C-Whzp</span>
                    </a>
                    <a href={emailUrl} className="flex-1 flex flex-col items-center gap-2 py-3 bg-[#EA4335]/10 text-[#EA4335] hover:bg-[#EA4335]/20 border border-[#EA4335]/30 rounded-xl transition">
                        <Mail className="w-6 h-6" />
                        <span className="text-sm font-bold">C-Mail</span>
                    </a>
                    <button onClick={copyLink} className="flex-1 flex flex-col items-center gap-2 py-3 bg-[#00f3ff]/10 text-[#00f3ff] hover:bg-[#00f3ff]/20 border border-[#00f3ff]/30 rounded-xl transition">
                        <LinkIcon className="w-6 h-6" />
                        <span className="text-sm font-bold">Copiar</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
