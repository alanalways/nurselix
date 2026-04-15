import { NextResponse } from "next/server";

export async function GET() {
  const status = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    services: {
      api: "healthy",
      // Phase 2+: check DB, Redis, MinIO
      database: "unchecked",
      redis: "unchecked",
      minio: "unchecked",
    },
    uptime: process.uptime(),
  };

  return NextResponse.json(status);
}
