"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface HeatmapDay {
  date: string;
  count: number;
  accuracy: number;
}

function getColor(count: number, max: number) {
  if (count === 0) return "bg-[var(--bg-elevated)]";
  const intensity = max > 0 ? count / max : 0;
  if (intensity > 0.75) return "bg-[var(--gold)]";
  if (intensity > 0.5) return "bg-[var(--gold)] opacity-75";
  if (intensity > 0.25) return "bg-[var(--gold)] opacity-50";
  return "bg-[var(--gold)] opacity-30";
}

export default function HeatMap() {
  const [days, setDays] = useState<HeatmapDay[]>([]);

  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.heatmap) setDays(d.heatmap); })
      .catch(() => setDays([]));
  }, []);

  // If /api/stats returned 30 days, pad to 90 for longer visual context (the other days show as 0)
  let padded = days;
  if (padded.length < 90) {
    const pad: HeatmapDay[] = [];
    const today = new Date();
    for (let i = 89 - padded.length; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i - padded.length);
      pad.push({ date: d.toISOString().split("T")[0], count: 0, accuracy: 0 });
    }
    padded = [...pad, ...padded];
  }

  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  const max = Math.max(1, ...padded.map((d) => d.count));

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
      <h3 className="font-semibold text-[var(--text-primary)] mb-4">學習熱力圖（最近 90 天）</h3>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} 題${day.count > 0 ? ` (${day.accuracy}%)` : ""}`}
                className={cn("w-3 h-3 rounded-sm", getColor(day.count, max))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
        <span>少</span>
        <div className="flex gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div key={v} className={cn("w-3 h-3 rounded-sm", getColor(v * max, max))} />
          ))}
        </div>
        <span>多</span>
      </div>
    </div>
  );
}
