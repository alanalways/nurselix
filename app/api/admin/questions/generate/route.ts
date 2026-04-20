import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  runOneBatch,
  pickAutoDomain,
  getApiKeys,
  VALID_DOMAINS,
  DOMAIN_TARGETS,
  MODEL_RPD,
} from "@/lib/generateBatch";

export const maxDuration = 120;

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json({
    keys: getApiKeys().length,
    models: Object.entries(MODEL_RPD).map(([id, rpd]) => ({ id, rpd })),
    domains: VALID_DOMAINS,
    domainTargets: DOMAIN_TARGETS,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const model = String(body.model ?? "gemini-2.5-flash");
  const rawDomain = String(body.domain ?? "auto");
  const domain = rawDomain === "auto" || !rawDomain ? await pickAutoDomain() : rawDomain;

  const adminId = (guard as { user?: { id?: string } }).user?.id ?? "admin";
  const result = await runOneBatch({ domain, model, adminId });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Batch failed" }, { status: 503 });
  }
  return NextResponse.json(result);
}
