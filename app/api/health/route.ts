import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let dbStatus = "unhealthy";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "healthy";
  } catch {
    dbStatus = "unhealthy";
  }

  const status = {
    status: dbStatus === "healthy" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    services: {
      api: "healthy",
      database: dbStatus,
      redis: "unchecked",
      minio: "unchecked",
    },
    uptime: process.uptime(),
  };

  return NextResponse.json(
    status,
    { status: dbStatus === "healthy" ? 200 : 503 }
  );
}
