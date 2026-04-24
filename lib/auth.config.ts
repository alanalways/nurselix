import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible NextAuth config (no Prisma, no Node-only libs).
 * Used by middleware.ts for route protection.
 */

// Routes that redirect logged-in users to dashboard.
const AUTH_ONLY_ROUTES = ["/login", "/register"];

// The editorial landing ("Nurslix Journal" cover) lives at `/` and is
// fully public. Authenticated users still see it; a "Continue reading →"
// button on the cover takes them to the dashboard.
const PUBLIC_ROUTES = [
  "/",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/terms",
  "/privacy",
  "/nursing-career",
];

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

      // Auth-only pages — allow unauthenticated, redirect if already logged in.
      if (AUTH_ONLY_ROUTES.some((p) => pathname.startsWith(p))) {
        if (isLoggedIn) return Response.redirect(new URL("/home", nextUrl));
        return true;
      }

      // Fully public pages — no session required.
      if (PUBLIC_ROUTES.some((p) => pathname.startsWith(p))) return true;

      // API routes handle their own auth.
      if (pathname.startsWith("/api/")) return true;

      // Everything else: require authentication.
      return isLoggedIn;
    },
  },
  providers: [], // Filled in lib/auth.ts
} satisfies NextAuthConfig;
