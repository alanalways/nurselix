import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { Role, Plan } from "@/types";

/**
 * Admin emails — these users are automatically promoted to ADMIN + ELITE on
 * first sign-in and every subsequent sign-in (self-healing if role is demoted).
 *
 * Hard-coded list (single owner today). Add an email to the array to grant
 * admin role on next sign-in.
 */
const ADMIN_EMAILS = new Set([
  "cmshj30326@gmail.com",
]);

async function ensureAdminRole(email: string | null | undefined) {
  if (!email) return null;
  const normalized = email.toLowerCase();
  if (!ADMIN_EMAILS.has(normalized)) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, role: true, plan: true },
    });
    if (!user) return null;
    if (user.role !== "ADMIN" || user.plan !== "ELITE") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN", plan: "ELITE" },
      });
      return { id: user.id, role: "ADMIN" as Role, plan: "ELITE" as Plan };
    }
    return { id: user.id, role: user.role as Role, plan: user.plan as Plan };
  } catch (err) {
    console.warn("[auth] ensureAdminRole failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
        });
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(
          String(credentials.password),
          user.password
        );
        if (!isValid) return null;

        await ensureAdminRole(user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // First sign-in: copy user fields into the token
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "STUDENT";
        token.plan = user.plan ?? "FREE";
      }
      // OAuth sign-in: promote admin and fetch fresh role/plan from DB
      if (account && account.provider !== "credentials") {
        await ensureAdminRole(token.email);
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true, plan: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.plan = dbUser.plan;
        }
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id   = token.id as string;
        session.user.role = (token.role  ?? "STUDENT") as Role;
        session.user.plan = (token.plan  ?? "FREE")    as Plan;
      }
      return session;
    },
  },
  events: {
    // Create default UserSettings + promote admin for new OAuth users
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });

      const isAdminEmail = user.email && ADMIN_EMAILS.has(user.email.toLowerCase());
      if (isAdminEmail) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN", plan: "ELITE" },
        });
        return;
      }

      // Grant the same initial trial that email signup receives.
      // Beta (until 2026-05-01): PRO until beta ends.
      // After beta: BASIC for 7 days. trialUsed=true blocks re-trials forever.
      const BETA_ENDS = new Date("2026-05-01T00:00:00Z");
      const inBeta = Date.now() < BETA_ENDS.getTime();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: inBeta ? "PRO" : "BASIC",
          trialUsed: true,
          trialEndsAt: inBeta
            ? BETA_ENDS
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    },
  },
});
