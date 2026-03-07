// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';
import { Download, AlertTriangle, FileLock2 } from 'lucide-react';

const prisma = new PrismaClient();

export default async function SharedLinkPage({ params }: { params: { token: string } }) {
    const { token } = params;

    const link = await prisma.sharedLink.findUnique({
        where: { token }
    });

    if (!link) {
        return <ErrorPage />
    }

    // Check expiration
    if (new Date() > link.expiresAt) {
        await prisma.sharedLink.delete({ where: { id: link.id } });
        return <ErrorPage />
    }

    // Check max views
    if (link.maxViews !== null && link.views >= link.maxViews) {
        await prisma.sharedLink.delete({ where: { id: link.id } });
        return <ErrorPage viewConsumed={true} />
    }

    // Log the view
    await prisma.sharedLink.update({
        where: { id: link.id },
        data: { views: { increment: 1 } }
    });

    const filePath = path.join(process.cwd(), '../arquivos', link.folder, link.filename);
    const exists = await fs.pathExists(filePath);
    const stats = exists ? await fs.stat(filePath) : null;

    if (!exists) {
        return <ErrorPage />
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-3xl border border-[#00f3ff]/30 shadow-[0_0_50px_rgba(0,243,255,0.1)] max-w-lg w-full text-center space-y-6">
                <div className="flex justify-center">
                    <FileLock2 className="w-16 h-16 text-[#00f3ff]" />
                </div>
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Compartilhamento Seguro</h1>
                    <p className="text-sm text-gray-400 mt-2 font-mono">ID: {link.token.substring(0, 8)}...</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center gap-2">
                    <span className="text-[#00f3ff] font-bold truncate max-w-full block px-4">{link.filename}</span>
                    <span className="text-xs text-gray-500 font-mono">Tamanho: {(stats!.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>

                <div className="text-xs text-left bg-black/50 p-4 border border-gray-800 rounded-xl space-y-2">
                    <p className="flex justify-between">
                        <span className="text-gray-500">Expiração:</span>
                        <span className="text-red-400 font-bold">{link.expiresAt.toLocaleString('pt-BR')}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-gray-500">Regra de Acesso:</span>
                        <span className="text-orange-400 font-bold">{link.maxViews ? `Somente ${link.maxViews} acesso(s)` : 'Acessos ilimitados no prazo'}</span>
                    </p>
                    {link.maxViews && <p className="text-red-500 font-bold text-center mt-2 animate-pulse">Atenção: A recarga da página destruirá o link!</p>}
                </div>

                <a
                    href={`/api/download?folder=${encodeURIComponent(link.folder)}&filename=${encodeURIComponent(link.filename)}`}
                    className="w-full flex items-center justify-center gap-3 bg-[#00f3ff] text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(0,243,255,0.4)]"
                >
                    <Download className="w-5 h-5" />
                    Baixar Arquivo Agora
                </a>
            </div>

            <p className="mt-8 text-gray-600 font-mono text-[10px] uppercase tracking-widest">
                NCFN Enterprise Grade File Sharing
            </p>
        </div>
    );
}

function ErrorPage({ viewConsumed = false }: { viewConsumed?: boolean }) {
    return (
        <div className="min-h-screen bg-[#050510] text-[#ff3333] font-mono flex items-center justify-center p-4">
            <div className="border-2 border-[#ff3333] p-10 bg-red-950/20 shadow-[0_0_40px_rgba(255,51,51,0.2)_inset,0_0_40px_rgba(255,51,51,0.2)] rounded-xl max-w-lg text-center space-y-6">
                <AlertTriangle className="w-16 h-16 mx-auto animate-pulse" />
                <h1 className="text-3xl font-black tracking-widest uppercase">Acesso Bloqueado</h1>
                {viewConsumed ? (
                    <p className="text-sm text-[#ccaaaa]">
                        Este link foi configurado para Visualização Única. O download ou acesso do arquivo já foi consumido de forma irreversível e o token foi expurgado.
                    </p>
                ) : (
                    <p className="text-sm text-[#ccaaaa]">
                        O link solicitado não existe, expirou por limite de tempo ou foi revogado manualmente pelo Administrador do sistema.
                    </p>
                )}
            </div>
        </div>
    );
}
