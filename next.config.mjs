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

const withSentry = (cfg) =>
  withSentryConfig(cfg, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    // Disable source-map upload during dev / when SENTRY_AUTH_TOKEN absent
    silent: !process.env.SENTRY_AUTH_TOKEN,
    // Don't block builds if Sentry isn't configured
    dryRun: !process.env.SENTRY_AUTH_TOKEN,
    telemetry: false,
    // Keep bundle size sane: only include Sentry if DSN is set
    disableClientWebpackPlugin: !process.env.NEXT_PUBLIC_SENTRY_DSN,
    disableServerWebpackPlugin: !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

export default withSentry(withPWA(nextConfig));
