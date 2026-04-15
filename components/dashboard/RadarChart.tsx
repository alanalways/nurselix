"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const data = [
  { domain: "管理照護", value: 72 },
  { domain: "安全感控", value: 65 },
  { domain: "健康促進", value: 80 },
  { domain: "心理完整", value: 58 },
  { domain: "基本照護", value: 75 },
  { domain: "藥理用藥", value: 45 },
  { domain: "降低風險", value: 62 },
  { domain: "生理調適", value: 70 },
];

export default function DomainRadarChart() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
      <h3 className="font-semibold text-[var(--text-primary)] mb-4">八大 Domain 能力圖</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border-default)" />
          <PolarAngleAxis
            dataKey="domain"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          />
          <Radar
            name="能力值"
            dataKey="value"
            stroke="var(--gold)"
            fill="var(--gold)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
