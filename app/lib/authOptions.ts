import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

type AppJWT = JWT & {
  role?: "admin" | "guest";
  loginAt?: number;
  policyAcceptedAt?: string | null;
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email ?? null;
      if (!email) return false;

      if (email === ADMIN_EMAIL) {
        try {
          await prisma.user.upsert({
            where: { email },
            update: { lastSeenAt: new Date() },
            create: { email, lastSeenAt: new Date() },
          });
        } catch (e) {
          console.error("[AUTH] Failed to update admin lastSeenAt", e);
        }
        return true;
      }

      try {
        const guest = await prisma.guestEmail.findUnique({ where: { email } });
        if (guest && guest.active) {
          await prisma.guestAccessLog.create({
            data: { email, ip: null, loginAt: new Date(), lastSeenAt: new Date() },
          });
          return true;
        }
      } catch (e) {
        console.error("[AUTH] Error checking guest:", e);
      }

      return "/login?error=unauthorized";
    },
    async jwt({ token, user, trigger }) {
      const t = token as AppJWT;

      if (user?.email) {
        t.role = user.email === ADMIN_EMAIL ? "admin" : "guest";
        t.email = user.email;
        t.loginAt = Date.now();
      }

      if (t.email) {
        if (t.role === "admin") {
          const dbUser = await prisma.user.findUnique({ where: { email: t.email } });
          t.policyAcceptedAt = dbUser?.policyAcceptedAt ?? null;
        } else {
          const guest = await prisma.guestEmail.findUnique({ where: { email: t.email } });
          t.policyAcceptedAt = guest?.policyAcceptedAt ?? null;
        }
      }

      if (trigger === "update") {
        t.policyAcceptedAt = new Date().toISOString();
      }

      return t;
    },
    async session({ session, token }) {
      const t = token as AppJWT;
      const s = session as Session & {
        user?: NonNullable<Session["user"]> & {
          role?: AppJWT["role"];
          loginAt?: AppJWT["loginAt"];
          policyAcceptedAt?: AppJWT["policyAcceptedAt"];
        };
      };

      if (s.user) {
        s.user.role = t.role;
        s.user.loginAt = t.loginAt;
        s.user.policyAcceptedAt = t.policyAcceptedAt;
      }
      return s;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

