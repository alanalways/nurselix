import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible NextAuth config (no Prisma, no Node-only libs).
 * Used by middleware.ts for route protection.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Auth pages: allow everyone, redirect logged-in users to dashboard
      if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Password reset: must be reachable without a session
      if (pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) {
        return true;
      }

      // Fully public pages
      if (pathname === "/pricing") return true;
      if (pathname === "/terms" || pathname === "/privacy") return true;

      // API routes handle their own auth
      if (pathname.startsWith("/api/")) return true;

      // Everything else: require authentication
      if (!isLoggedIn) return false;

      return true;
    },
  },
  providers: [], // Filled in lib/auth.ts
} satisfies NextAuthConfig;
