import withPWAInit from "next-pwa";
import { fileURLToPath } from "url";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "http", hostname: "172.233.94.193" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  // Baseline defence-in-depth headers. Conservative so we don't break
  // Sentry, NextAuth OAuth redirects, or the PWA. CSP intentionally NOT
  // added — Next.js inline runtime + Sentry inline scripts make a strict
  // CSP non-trivial; revisit when traffic warrants.
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  /**
   * Explicitly wire up the "@/" path alias in webpack so it resolves
   * correctly in ALL build environments (Zeabur Nixpacks, Docker, Vercel,
   * local) even when tsconfig.json path resolution is not picked up first.
   */
  webpack(config, { buildId: _buildId, ...options }) {
    // Preserve any aliases already registered (e.g. by next-pwa)
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    return config;
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
  ],
});

const pwaWrapped = withPWA(nextConfig);

// Sentry is only wired when a DSN is configured. The wrapper is cheap when the
// auth token is missing — it just skips source-map upload. At runtime,
// Sentry.init() in sentry.*.config.ts no-ops if the DSN env var is unset.
export default withSentryConfig(pwaWrapped, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
});
