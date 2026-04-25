import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns metadata of the latest audio asset for a question
 * (without the binary payload).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> | { questionId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId } = await params;
  const asset = await prisma.audioAsset.findFirst({
    where: { questionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, durationSec: true, voicesUsed: true,
      mimeType: true, sampleRate: true, createdAt: true,
    },
  });
  if (!asset) {
    return NextResponse.json({ error: "No audio for this question" }, { status: 404 });
  }
  return NextResponse.json({
    ...asset,
    audioUrl: `/api/audio/${asset.id}`,
  });
}
