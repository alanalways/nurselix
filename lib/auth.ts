import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { Role, Plan } from "@/types";

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
      // OAuth sign-in: fetch fresh role/plan from DB (adapter created the user)
      if (account && account.provider !== "credentials") {
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
    // Create default UserSettings for new OAuth users
    async createUser({ user }) {
      if (user.id) {
        await prisma.userSettings.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
      }
    },
  },
});
