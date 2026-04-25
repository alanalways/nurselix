import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Streams an audio asset's bytes to the client.
 * Auth is required (any logged-in user) — listening questions
 * shouldn't be scrapable from the public internet.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.audioAsset.findUnique({
    where: { id },
    select: { data: true, mimeType: true, durationSec: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = asset.data as unknown as Buffer;
  // Copy into a fresh ArrayBuffer-backed Uint8Array (BodyInit compatible across edge/node).
  const ab = new ArrayBuffer(raw.byteLength);
  new Uint8Array(ab).set(raw);
  return new NextResponse(ab, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType ?? "audio/wav",
      "Content-Length": String(raw.byteLength),
      "Cache-Control": "private, max-age=3600",
      "Accept-Ranges": "bytes",
    },
  });
}
