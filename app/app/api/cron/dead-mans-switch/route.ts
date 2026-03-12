// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import fs from 'fs-extra';
import path from 'path';

export const dynamic = "force-dynamic";

// In a real scenario, protect this endpoint with an internal API KEY secret, headers matching, or ensure it's only called locally by the container
export async function GET(req: NextRequest) {
    try {
        const secretHeader = req.headers.get("Authorization");

        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret || secretHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized Heartbeat" }, { status: 401 });
        }

        const admins = await prisma.user.findMany({
            where: {
                deadManSwitchDays: { not: null }
            }
        });

        const actionsTaken = [];
        const now = new Date();

        for (const admin of admins) {
            if (!admin.lastSeenAt || !admin.deadManSwitchDays) continue;

            const targetDate = new Date(admin.lastSeenAt);
            targetDate.setDate(targetDate.getDate() + admin.deadManSwitchDays);

            if (now > targetDate) {
                // TIMER EXPIRED! EXECUTE PROTOCOL!
                actionsTaken.push(`Switch activated for admin: ${admin.email}`);

                if (admin.deadManTriggerAction === 'LOCKDOWN') {
                    // Lock out everyone
                    await prisma.guestEmail.updateMany({
                        data: { active: false }
                    });

                    // Revoke all temp links
                    await prisma.sharedLink.deleteMany({});

                    // Creates a lockdown file indicator at project root that layout/middleware can check
                    await fs.writeFile(path.join(process.cwd(), '../arquivos/_SYSTEM_LOCKOUT'), `SISTEMA TRAVADO EM: ${new Date().toISOString()}\nProtocolo NCFN Dead Man's Switch Ativado (Cron).\n`, 'utf8');

                    // Reset admin's switch to prevent infinite loops (or keep it and wait for them to manually login to delete the lockdown file)
                } else if (admin.deadManTriggerAction === 'DELETE_ALL') {
                    // Wipe everything
                    const storageRoot = path.join(process.cwd(), '../arquivos');

                    if (await fs.pathExists(storageRoot)) {
                        // Read all folders and destroy
                        const items = await fs.readdir(storageRoot);
                        for (const item of items) {
                            if (item !== '.gitkeep' && item !== 'Lixeira') {
                                await fs.remove(path.join(storageRoot, item));
                            }
                        }

                        // Force recreation of basic structure to not crash the app entirely
                        const defaultFolders = ['0_CRIADA_PELO_SISTEMA', 'Lixeira', '1_ZONA_FRANCA_PUBLICO', '9_ACESSO_TEMPORARIO_E_UNICO'];
                        for (const sf of defaultFolders) {
                            await fs.ensureDir(path.join(storageRoot, sf));
                        }
                    }

                    // Reset rule to false to prevent repeated wipes automatically
                    await prisma.user.update({
                        where: { id: admin.id },
                        data: { deadManSwitchDays: null }
                    });
                }
            }
        }

        return NextResponse.json({ status: "Cron execution successful", triggered: actionsTaken });

    } catch (e) {
        console.error("[CRON_ERROR]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
