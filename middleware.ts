import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use the Edge-compatible config (no Prisma) for middleware
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, manifest.json, sw.js, workbox-* (PWA assets)
     * - /icons/       (PWA icon folder)
     * - /api/auth/*   (NextAuth internal routes — handled by NextAuth itself)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|workbox|icons).*)",
  ],
};
