import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { PrismaClient } from "@prisma/client";
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const config = await prisma.moltbotConfig.findUnique({ where: { id: "default" } });
    const logs = await prisma.moltbotLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ config, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { action, quota, mode, url, task } = await req.json();

  try {
    if (action === "updateConfig") {
      await prisma.moltbotConfig.upsert({
        where: { id: "default" },
        update: { 
          dailyQuotaBRL: quota,
          activeMode: mode
        },
        create: {
          id: "default",
          dailyQuotaBRL: quota,
          activeMode: mode
        }
      });
      return NextResponse.json({ success: true });
    }

    if (action === "resetUsage") {
      await prisma.moltbotConfig.update({
        where: { id: "default" },
        data: { currentUsageBRL: 0 }
      });
      return NextResponse.json({ success: true });
    }

    if (action === "triggerScan") {
      // Trigger scan in the moltbot container
      // This is a fire-and-forget for the API, but we use docker exec
      const cmd = `docker exec -d moltbot_ncfn npm start -- "${url}" "${task}"`;
      await execPromise(cmd);
      return NextResponse.json({ success: true, message: "Moltbot started." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
