import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function resolveConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;

  // Fail-fast in production: silently connecting to localhost is worse than a
  // clear startup error.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[prisma] DATABASE_URL is not set in production. Refusing to fall back to localhost. " +
        "Configure DATABASE_URL in the environment before starting the server.",
    );
  }

  // Dev / build-time fallback: let the build proceed; first query will fail
  // with a clear connection error if Postgres is not running locally.
  return "postgresql://localhost/nurslix";
}

function createPrismaClient() {
  const pool = new Pool({ connectionString: resolveConnectionString() });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
