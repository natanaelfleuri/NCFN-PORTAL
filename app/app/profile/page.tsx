import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { Shield } from "lucide-react";
import Link from "next/link";
import ProfileClient from "@/app/components/ProfileClient";

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

    // Serialize for client component (no Date objects)
    const serialized = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.image,
        role: dbUser.role,
        planType: dbUser.planType,
        fullName: dbUser.fullName,
        documentId: dbUser.documentId,
        certificationAuth: dbUser.certificationAuth,
        totalBytesUsed: dbUser.totalBytesUsed,
        uploadedFilesCount: dbUser.uploadedFilesCount,
        lastSeenAt: dbUser.lastSeenAt?.toISOString() || null,
        totpEnabled: dbUser.totpEnabled,
        deadManSwitchDays: dbUser.deadManSwitchDays,
        deadManTriggerAction: dbUser.deadManTriggerAction,
        aiConfig: dbUser.aiConfig ? {
            preferredModel: dbUser.aiConfig.preferredModel,
            geminiKey: dbUser.aiConfig.geminiKey,
            openaiKey: dbUser.aiConfig.openaiKey,
        } : null,
    };

    return <ProfileClient dbUser={serialized} />;
}
