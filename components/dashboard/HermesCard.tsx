"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2, Loader2, Zap } from "lucide-react";

interface HermesProfile {
  insightSummary: string | null;
  nextActions: string[];
  sessionsAnalysed: number;
}

export default function HermesCard() {
  const [profile, setProfile] = useState<HermesProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          if (body.profile) {
            setProfile({
              insightSummary: body.profile.insightSummary ?? null,
              nextActions: Array.isArray(body.profile.nextActions) ? body.profile.nextActions : [],
              sessionsAnalysed: body.profile.sessionsAnalysed ?? 0,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 flex items-center justify-center min-h-[100px]">
        <Loader2 className="animate-spin text-[var(--gold)]" size={18} />
      </div>
    );
  }

  // No data yet — prompt to take first session
  if (!profile || profile.sessionsAnalysed === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-[var(--gold)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Hermes AI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">完成第一場測驗後，AI 會分析你的弱點並制定個人學習計劃。</p>
        <Link
          href="/nclex"
          className="text-xs text-[var(--gold)] hover:underline flex items-center gap-1"
        >
          開始練習 <ArrowRight size={11} />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--gold-dim)] to-[var(--bg-surface)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center">
            <Sparkles size={13} className="text-[#080E1A]" />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Hermes AI</span>
        </div>
        <Link href="/insights" className="text-xs text-[var(--gold)] hover:underline flex items-center gap-1">
          查看完整洞察 <ArrowRight size={11} />
        </Link>
      </div>

      {/* Insight summary */}
      {profile.insightSummary && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
          {profile.insightSummary}
        </p>
      )}

      {/* Next actions preview (max 3) */}
      {profile.nextActions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={12} className="text-[var(--gold)]" />
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">今日行動</span>
          </div>
          <ul className="space-y-1.5">
            {profile.nextActions.slice(0, 3).map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-primary)]">
                <CheckCircle2 size={13} className="text-[var(--gold)] flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
