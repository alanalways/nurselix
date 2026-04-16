"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const domains = [
  "管理照護", "安全感控", "健康促進", "心理完整",
  "基本照護", "藥理用藥", "降低風險", "生理調適",
];

const emptyData = domains.map((domain) => ({ domain, value: 0 }));

export default function DomainRadarChart() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
      <h3 className="font-semibold text-[var(--text-primary)] mb-1">八大 Domain 能力圖</h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">答題後此圖將自動更新</p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={emptyData}>
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
