"use client";

import { motion } from "framer-motion";
import StatsOverview from "@/components/dashboard/StatsOverview";
import QuickStart from "@/components/dashboard/QuickStart";
import DailyProgress from "@/components/dashboard/DailyProgress";
import AssessmentPrompt from "@/components/dashboard/AssessmentPrompt";
import ExamCountdown from "@/components/dashboard/ExamCountdown";
import StreakCard from "@/components/dashboard/StreakCard";
import DomainRadarChart from "@/components/dashboard/RadarChart";
import HeatMap from "@/components/dashboard/HeatMap";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

export default function DashboardPage() {
  return (
    <motion.div
      {...pageVariants}
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          早安，護理師小明 👋
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          今天是你備考的第 <span className="text-[var(--gold)] font-semibold">7</span> 天，繼續加油！
        </p>
      </div>

      {/* Assessment Prompt (if not done) */}
      <AssessmentPrompt />

      {/* Stats Overview */}
      <StatsOverview />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Start */}
        <div className="lg:col-span-2 space-y-6">
          <QuickStart />
          <HeatMap />
        </div>

        {/* Right: Sidebar Cards */}
        <div className="space-y-4">
          <DailyProgress />
          <ExamCountdown />
          <StreakCard />
        </div>
      </div>

      {/* Radar Chart */}
      <DomainRadarChart />
    </motion.div>
  );
}
