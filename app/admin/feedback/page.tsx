"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare, Loader2 } from "lucide-react";

interface FeedbackData {
  rows: Array<{
    id: string;
    userId: string | null;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { email: string; name: string | null } | null;
  }>;
  avgRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}

export default function AdminFeedbackPage() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/feedback", { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } catch { /* network error */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!data) return <div className="p-6 text-[var(--error)]">載入失敗</div>;

  const renderStars = (n: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < n ? "text-[var(--gold)] fill-[var(--gold)]" : "text-[var(--text-muted)]"}
        />
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-5"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">用戶回饋</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-2">平均評分</div>
          <div className="text-4xl font-bold font-mono text-[var(--gold)]">
            {data.avgRating.toFixed(1)}
          </div>
          <div className="mt-2 flex justify-center">{renderStars(Math.round(data.avgRating))}</div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-2">總評價數</div>
          <div className="text-4xl font-bold font-mono text-[var(--blue)]">{data.totalCount}</div>
          <MessageSquare size={18} className="text-[var(--blue)] mx-auto mt-2" />
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <div className="text-xs text-[var(--text-muted)] mb-3">評分分布</div>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data.distribution[star] ?? 0;
            const pct = data.totalCount > 0 ? Math.round((count / data.totalCount) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-0.5 w-8">
                  <span className="text-xs text-[var(--text-muted)]">{star}</span>
                  <Star size={10} className="text-[var(--gold)] fill-[var(--gold)]" />
                </div>
                <div className="flex-1 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--gold)]" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-mono text-[var(--text-muted)] w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {data.rows.length === 0 ? (
        <div className="py-12 text-center text-[var(--text-muted)] text-sm">還沒有用戶回饋</div>
      ) : (
        <div className="space-y-3">
          {data.rows.map((f) => (
            <div key={f.id} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {renderStars(f.rating)}
                  <span className="text-xs text-[var(--text-muted)]">
                    {f.user?.email ?? "（匿名）"}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(f.createdAt).toLocaleString("zh-TW")}
                </span>
              </div>
              {f.comment && (
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {f.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
