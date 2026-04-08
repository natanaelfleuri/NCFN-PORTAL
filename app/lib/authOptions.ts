import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyCfJwt } from "@/lib/cfAccess";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

type AppJWT = JWT & {
  role?: "admin" | "superadmin" | "user" | "guest";
  loginAt?: number;
  policyAcceptedAt?: string | null;
  totpEnabled?: boolean;
  totpVerified?: boolean;
  loginIp?: string;
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email e Senha",
      credentials: {
        email:    { label: "Email / Usuário", type: "text" },
        passphrase: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email     = credentials?.email?.trim();
        const passphrase = credentials?.passphrase;
        if (!email || !passphrase) return null;

        // 1. Bootstrap: env admin sempre funciona
        const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;
        if (email === ADMIN_EMAIL && ADMIN_PASSPHRASE && passphrase === ADMIN_PASSPHRASE) {
          return { id: email, email, name: email };
        }

        // 2. Usuário cadastrado no banco com passwordHash
        try {
          const dbUser = await prisma.user.findUnique({ where: { email } });
          if (dbUser?.passwordHash && await bcrypt.compare(passphrase, dbUser.passwordHash)) {
            return { id: dbUser.id, email: dbUser.email!, name: dbUser.name ?? dbUser.email! };
          }
        } catch (_) {}

        return null;
      },
    }),

    // ── Cloudflare Access Zero Trust ─────────────────────────────────────────
    CredentialsProvider({
      id: "cloudflare-access",
      name: "Cloudflare Access",
      credentials: {
        cfToken: { label: "CF Access Token", type: "text" },
      },
      async authorize(credentials) {
        const cfToken = credentials?.cfToken;
        if (!cfToken) return null;

        // Verificar JWT do Cloudflare Access
        const result = await verifyCfJwt(cfToken).catch(() => null);
        if (!result?.email) return null;

        const email = result.email;

        // Verificar se email é o admin do env
        if (email === ADMIN_EMAIL) {
          await prisma.user.upsert({
            where:  { email },
            update: { lastSeenAt: new Date(), role: "admin" },
            create: { email, lastSeenAt: new Date(), role: "admin" },
          }).catch(() => {});
          return { id: email, email, name: email };
        }

        // Verificar se email existe no banco e está autorizado
        try {
          const dbUser = await prisma.user.findUnique({ where: { email } });
          if (dbUser) {
            await prisma.user.update({ where: { email }, data: { lastSeenAt: new Date() } }).catch(() => {});
            return { id: dbUser.id, email: dbUser.email!, name: dbUser.name ?? dbUser.email! };
          }
        } catch (_) {}

        return null; // Email não autorizado
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email ?? null;
      if (!email) return false;

      // Admin via env — garante registro no banco
      if (email === ADMIN_EMAIL) {
        await prisma.user.upsert({
          where:  { email },
          update: { lastSeenAt: new Date(), role: "admin" },
          create: { email, lastSeenAt: new Date(), role: "admin" },
        });
        return true;
      }

      // Usuário cadastrado no banco
      try {
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser) {
          await prisma.user.update({ where: { email }, data: { lastSeenAt: new Date() } });
          return true;
        }
      } catch (e) {
        console.error("[AUTH] Error checking user:", e);
      }

      return "/login?error=unauthorized";
    },
    async jwt({ token, user, trigger, session }) {
      const t = token as AppJWT;

      if (user?.email) {
        t.email   = user.email;
        t.loginAt = Date.now();
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        t.role = (dbUser?.role as AppJWT["role"]) ?? (user.email === ADMIN_EMAIL ? "admin" : "user");
      }

      if (t.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: t.email } });
        if (dbUser) {
          t.policyAcceptedAt = dbUser.policyAcceptedAt?.toISOString() ?? null;
          const prevTotpEnabled = t.totpEnabled;
          t.totpEnabled = dbUser.totpEnabled ?? false;
          if (t.totpEnabled && (t.totpVerified === undefined || prevTotpEnabled === false)) {
            t.totpVerified = false;
          }
          if (!t.totpEnabled) {
            t.totpVerified = undefined;
          }
        }
      }

      if (trigger === "update") {
        const s = session as any;
        if (s?.totpVerified === true) {
          t.totpVerified = true;
        } else {
          t.policyAcceptedAt = new Date().toISOString();
        }
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
        s.user.role            = t.role;
        s.user.loginAt         = t.loginAt;
        s.user.policyAcceptedAt = t.policyAcceptedAt;
        (s.user as any).totpEnabled  = t.totpEnabled;
        (s.user as any).totpVerified = t.totpVerified;
      }
      return s;
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
