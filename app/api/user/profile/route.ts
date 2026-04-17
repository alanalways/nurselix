import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.learnerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) return NextResponse.json({ profile: null });

  return NextResponse.json({
    profile: {
      domainMastery: profile.domainMastery,
      topWeaknesses: profile.topWeaknesses,
      behaviorPatterns: profile.behaviorPatterns,
      mistakeCounts: profile.mistakeCounts,
      confidenceBand: profile.confidenceBand,
      recentTrend: profile.recentTrend,
      insightSummary: profile.insightSummary,
      nextActions: profile.nextActions,
      studyPlan: profile.studyPlan,
      thetaHistory: profile.thetaHistory,
      sessionsAnalysed: profile.sessionsAnalysed,
      updatedAt: profile.updatedAt,
    },
  });
}
