"use client";

import { motion } from "framer-motion";

const mockFeedbacks = [
  { id: "f1", rating: 5, comment: "非常好用！解析很詳細，台美差異的提示超有幫助", user: "user1@example.com", mode: "Tutor", createdAt: "2026/01/14 14:23" },
  { id: "f2", rating: 4, comment: "題目品質很好，建議增加更多 SATA 題型", user: "user2@example.com", mode: "Practice", createdAt: "2026/01/14 11:05" },
  { id: "f3", rating: 3, comment: "載入速度有點慢，其他都很好", user: "user3@example.com", mode: "CAT", createdAt: "2026/01/13 20:17" },
  { id: "f4", rating: 5, comment: "雷達圖很清楚，能看到自己哪個 Domain 最弱", user: "user4@example.com", mode: "CAT", createdAt: "2026/01/13 16:42" },
  { id: "f5", rating: 2, comment: "希望能有 iOS app", user: "user5@example.com", mode: "Mock", createdAt: "2026/01/12 09:31" },
];

const avgRating = (mockFeedbacks.reduce((s, f) => s + f.rating, 0) / mockFeedbacks.length).toFixed(1);

export default function AdminFeedbackPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">用戶回饋</h1>
        <div className="text-right">
          <div className="text-3xl font-bold text-[var(--gold)]">⭐ {avgRating}</div>
          <div className="text-xs text-[var(--text-muted)]">平均評分（{mockFeedbacks.length}則）</div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">評分分布</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((r) => {
            const count = mockFeedbacks.filter(f => f.rating === r).length;
            const pct = (count / mockFeedbacks.length) * 100;
            return (
              <div key={r} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] w-6">{r}★</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--gold)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)] w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {mockFeedbacks.map((f) => (
          <div key={f.id} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[var(--gold)] text-sm mb-0.5">{"⭐".repeat(f.rating)}</div>
                <div className="text-xs text-[var(--text-muted)]">{f.user} · {f.mode} 模式</div>
              </div>
              <span className="text-xs text-[var(--text-muted)]">{f.createdAt}</span>
            </div>
            {f.comment && (
              <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] rounded-lg p-3 mt-2">
                "{f.comment}"
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
