import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { User, Shield, Zap, HardDrive, Award, Fingerprint, Calendar, Mail, FileCheck } from "lucide-react";
import Link from "next/link";
import TotpSetup from "@/app/components/TotpSetup";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Shield className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">ACESSO NEGADO</h1>
                <p className="text-gray-500 font-mono text-sm mt-2">AUTENTICAÇÃO NECESSÁRIA PARA VISUALIZAR PERFIL</p>
                <Link href="/login" className="mt-8 px-6 py-2 bg-white text-black font-black uppercase text-sm hover:invert transition-all">
                    SOLICITAR ACESSO
                </Link>
            </div>
        );
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { aiConfig: true }
    });

    if (!dbUser) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-400">Usuário não encontrado na base de dados.</p>
            </div>
        );
    }

    const storageUsedPercent = Math.min(100, (dbUser.totalBytesUsed / (1024 * 1024 * 1024 * 10)) * 100); // Assume 10GB trial limit for visualization

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-800 pb-8">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#00f3ff] to-[#bc13fe] p-[2px] rounded-2xl">
                            <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center overflow-hidden">
                                {dbUser.image ? (
                                    <img src={dbUser.image} alt="Avatar" className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <User className="w-12 h-12 text-[#00f3ff]" />
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-black border border-gray-800 p-1.5 rounded-lg">
                            <Zap className="w-4 h-4 text-yellow-400" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                                {dbUser.name || "OPERADOR_NCFN"}
                            </h1>
                            <span className="px-2 py-0.5 bg-[#bc13fe]/20 text-[#bc13fe] text-[10px] font-black rounded uppercase border border-[#bc13fe]/30">
                                {dbUser.role}
                            </span>
                        </div>
                        <p className="text-gray-500 font-mono text-xs mt-1 uppercase tracking-widest flex items-center gap-2">
                            <Mail className="w-3 h-3 text-[#00f3ff]" /> {dbUser.email}
                        </p>
                        <p className="text-gray-600 font-mono text-[10px] mt-1 uppercase tracking-tighter">
                            UUID: {dbUser.id}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link href="/upgrade" className="px-4 py-2 border border-[#bc13fe] text-[#bc13fe] text-xs font-black uppercase hover:bg-[#bc13fe] hover:text-white transition-all">
                        ACREDITAÇÃO PRO
                    </Link>
                    <button className="px-4 py-2 bg-white text-black text-xs font-black uppercase hover:invert transition-all">
                        EDITAR PERFIL
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-[#00f3ff]/50 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <Award className="w-12 h-12 text-[#00f3ff]" />
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">PLANO ATUAL</p>
                    <p className="text-2xl font-black text-white italic uppercase tracking-tighter">{dbUser.planType}</p>
                    <div className="mt-4 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00f3ff] shadow-[0_0_8px_#00f3ff]" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-[#bc13fe]/50 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <HardDrive className="w-12 h-12 text-[#bc13fe]" />
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">ATIVOS CUSTODIADOS</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">{dbUser.uploadedFilesCount} <span className="text-xs text-gray-500">OBJETOS</span></p>
                    <p className="text-[10px] text-gray-600 font-mono mt-1">{(dbUser.totalBytesUsed / (1024 * 1024)).toFixed(2)} MB EM CUSTÓDIA</p>
                </div>

                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-yellow-500/50 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <Fingerprint className="w-12 h-12 text-yellow-500" />
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">IDENTIDADE PERICIAL</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">{dbUser.documentId ? "VERIFICADO" : "PENDENTE"}</p>
                    <p className="text-[10px] text-gray-600 font-mono mt-1">VÍNCULO DOCUMENTAL {dbUser.documentId ? "ATIVO" : "AGUARDANDO"}</p>
                </div>

                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl relative overflow-hidden group hover:border-[#00f3ff]/50 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <Calendar className="w-12 h-12 text-[#00f3ff]" />
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">DESDE</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">
                        {dbUser.lastSeenAt 
                            ? new Date(dbUser.lastSeenAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' }).toUpperCase()
                            : "PRIMEIRO ACESSO"}
                    </p>
                    <p className="text-[10px] text-gray-600 font-mono mt-1">PROTOCOLO INICIADO</p>
                </div>
            </div>

            {/* Detailed Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Security Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-[#bc13fe]" />
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Credenciais de Operação</h2>
                    </div>
                    
                    <div className="bg-black border border-gray-800 rounded-xl divide-y divide-gray-800">
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Assinatura Certificada</p>
                                <p className="text-sm font-bold text-white uppercase italic">{dbUser.fullName || "Não Informado"}</p>
                            </div>
                            <Award className="w-5 h-5 text-gray-700" />
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Último Acesso</p>
                                <p className="text-sm font-medium text-white">
                                    {dbUser.lastSeenAt ? new Date(dbUser.lastSeenAt).toLocaleString('pt-BR') : 'Primeiro Acesso'}
                                </p>
                            </div>
                            <Calendar className="w-5 h-5 text-gray-700" />
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Identificação (DOC)</p>
                                <p className="text-sm font-mono text-white">
                                    {dbUser.documentId ? dbUser.documentId.replace(/.(?=.{3})/g, '*') : "NÃO VINCULADO"}
                                </p>
                            </div>
                            <FileCheck className="w-5 h-5 text-gray-700" />
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Autoridade de Certificação</p>
                                <p className="text-sm font-bold text-white uppercase italic">{dbUser.certificationAuth || "NCFN_DEFAULT_AUTH"}</p>
                            </div>
                            <Shield className="w-5 h-5 text-gray-700" />
                        </div>
                    </div>

                    {/* TOTP 2FA */}
                    <TotpSetup totpEnabled={dbUser.totpEnabled} />
                </div>

                {/* System Config */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-[#00f3ff]" />
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Parâmetros de Sistema</h2>
                    </div>
                    
                    <div className="bg-black border border-gray-800 rounded-xl divide-y divide-gray-800">
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Nível de Acesso (Protocolo)</p>
                                <p className="text-sm font-bold text-[#00f3ff] uppercase italic">{dbUser.role === 'admin' ? "LEVEL_01_ADMIN" : "LEVEL_02_OPERATOR"}</p>
                            </div>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">IA Assistente (Preferência)</p>
                                <p className="text-sm font-bold text-white uppercase italic">{dbUser.aiConfig?.preferredModel || "GEMINI-1.5-PRO"}</p>
                            </div>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">Protocolo 'Dead Man Switch'</p>
                                <p className="text-sm font-bold text-red-500 uppercase italic">
                                    {dbUser.deadManSwitchDays ? `${dbUser.deadManSwitchDays} DIAS / ${dbUser.deadManTriggerAction}` : "DESATIVADO"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Storage visualized Section */}
            <div className="bg-gradient-to-r from-gray-900/50 to-black border border-gray-800 p-8 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Volume de Custódia Forense</h3>
                        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Alocação cifrada AES-256 · Vault NCFN</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-[#00f3ff] italic">{storageUsedPercent.toFixed(1)}%</p>
                        <p className="text-[10px] text-gray-600 uppercase">utilizado</p>
                    </div>
                </div>
                
                <div className="w-full h-4 bg-gray-800 rounded-full border border-gray-700 overflow-hidden p-[2px]">
                    <div 
                        className="h-full bg-gradient-to-r from-[#00f3ff] via-[#bc13fe] to-[#00f3ff] rounded-full shadow-[0_0_15px_#bc13fe77] transition-all duration-1000"
                        style={{ width: `${storageUsedPercent}%`, backgroundSize: '200% 100%' }}
                    ></div>
                </div>
                
                <div className="flex justify-between mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    <span>0B · VAULT NCFN</span>
                    <span>LIMITE_CUSTÓDIA: 10 GB · AES-256</span>
                </div>
            </div>
        </div>
    );
}
