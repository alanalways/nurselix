"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import StatsOverview from "@/components/dashboard/StatsOverview";
import TodayBriefing from "@/components/dashboard/TodayBriefing";
import QuickStart from "@/components/dashboard/QuickStart";
import DailyProgress from "@/components/dashboard/DailyProgress";
import AssessmentPrompt from "@/components/dashboard/AssessmentPrompt";
import ExamCountdown from "@/components/dashboard/ExamCountdown";
import StreakCard from "@/components/dashboard/StreakCard";
import DomainRadarChart from "@/components/dashboard/RadarChart";
import HeatMap from "@/components/dashboard/HeatMap";
import UpgradeBanner from "@/components/dashboard/UpgradeBanner";
import HermesCard from "@/components/dashboard/HermesCard";

function computeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "早安";
  if (hour >= 12 && hour < 18) return "午安";
  return "晚安";
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "同學";
  const [greeting, setGreeting] = useState("你好");
  useEffect(() => { setGreeting(computeGreeting()); }, []);

  return (
    <div className="j-page p-4 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* Running head + greeting */}
      <div style={{ borderBottom: "1px solid var(--j-line)", paddingBottom: 20 }}>
        <div className="j-mono" style={{ color: "var(--j-ink-muted)", marginBottom: 8 }}>
          — Reader{"'"}s Desk · Vol. 14 —
        </div>
        <h1
          className="j-display"
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontStyle: "italic",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {greeting}，<span style={{ color: "var(--j-phosphor)" }}>{name}</span>
        </h1>
        <p className="j-zh" style={{ fontSize: 15, color: "var(--j-ink-dim)", marginTop: 6 }}>
          繼續你的備考之旅。
        </p>
      </div>

      {/* Today Briefing */}
      <TodayBriefing />

      {/* Upgrade Banner */}
      <UpgradeBanner />

      {/* Assessment Prompt */}
      <AssessmentPrompt />

      {/* Stats Overview */}
      <StatsOverview />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuickStart />
          <HeatMap />
        </div>
        <div className="space-y-4">
          <HermesCard />
          <DailyProgress />
          <ExamCountdown />
          <StreakCard />
        </div>
      </div>

      {/* Radar Chart */}
      <DomainRadarChart />
    </div>
  );
}
