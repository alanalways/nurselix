"use client";

import { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const DOMAIN_ZH: Record<string, string> = {
  "Management of Care": "管理照護",
  "Safety & Infection Control": "安全感控",
  "Health Promotion & Maintenance": "健康促進",
  "Psychosocial Integrity": "心理完整",
  "Basic Care & Comfort": "基本照護",
  "Pharmacological & Parenteral": "藥理用藥",
  "Reduction of Risk Potential": "降低風險",
  "Physiological Adaptation": "生理調適",
};

const ALL_DOMAINS = Object.keys(DOMAIN_ZH);

export default function DomainRadarChart() {
  const [data, setData] = useState(
    ALL_DOMAINS.map((en) => ({ domain: DOMAIN_ZH[en], value: 0 })),
  );
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (!body?.domainBreakdown) return;
        const breakdown = body.domainBreakdown as Array<{ domain: string; accuracy: number }>;
        const next = ALL_DOMAINS.map((en) => {
          const found = breakdown.find((d) => d.domain === en);
          return { domain: DOMAIN_ZH[en], value: found?.accuracy ?? 0 };
        });
        setData(next);
        setHasData(breakdown.length > 0);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
      <h3 className="font-semibold text-[var(--text-primary)] mb-1">八大 Domain 能力圖</h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        {hasData ? "近 30 天各 domain 正確率" : "答題後此圖將自動更新"}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border-default)" />
          <PolarAngleAxis
            dataKey="domain"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          />
          <Radar
            name="正確率 %"
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
