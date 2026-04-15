"use client";

import { cn } from "@/lib/utils/cn";

function generateMockData() {
  const data: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().split("T")[0],
      count: Math.random() > 0.3 ? Math.floor(Math.random() * 25) : 0,
    });
  }
  return data;
}

const mockData = generateMockData();

function getColor(count: number) {
  if (count === 0) return "bg-[var(--bg-elevated)]";
  if (count < 5) return "bg-[var(--gold-dim)] border border-[var(--gold)]";
  if (count < 15) return "bg-[var(--gold)] opacity-60";
  return "bg-[var(--gold)]";
}

export default function HeatMap() {
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < mockData.length; i += 7) {
    weeks.push(mockData.slice(i, i + 7));
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
      <h3 className="font-semibold text-[var(--text-primary)] mb-4">學習熱力圖（最近 90 天）</h3>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} 題`}
                className={cn("w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125", getColor(day.count))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
        <span>少</span>
        <div className="flex gap-1">
          {[0, 3, 8, 15, 25].map((v) => (
            <div key={v} className={cn("w-3 h-3 rounded-sm", getColor(v))} />
          ))}
        </div>
        <span>多</span>
      </div>
    </div>
  );
}
