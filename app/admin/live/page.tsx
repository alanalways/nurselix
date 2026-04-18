"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, Users, CheckCircle2, AlertCircle, Loader2, RefreshCw, Pause, Play,
  TrendingUp, Flame, Target, MessageSquare, Flag, Clock, UserPlus,
} from "lucide-react";
import Badge from "@/components/ui/Badge";

interface LiveData {
  serverTime: string;
  online: { now: number; last15m: number; last1h: number };
  activity: {
    answersLastHour: number;
    answersToday: number;
    correctToday: number;
    accuracyToday: number | null;
    newUsersToday: number;
  };
  activeSessions: {
    id: string;
    mode: string;
    theta: number;
    totalQuestions: number;
    correctCount: number;
    startedAt: string;
    isPaused: boolean;
    ageSec: number;
    user: { name: string | null; email: string; plan: string };
  }[];
  sessionModeCounts: Record<string, number>;
  planMix: Record<string, number>;
  topUsersToday: {
    userId: string;
    name: string | null;
    email: string | null;
    plan: string | null;
    answers: number;
    correct: number;
  }[];
  domainToday: {
    domain: string;
    n: number;
    correct: number;
    accuracy: number | null;
  }[];
  queues: { pendingReports: number; pendingFeedback: number };
}

const REFRESH_MS = 15_000;

function formatAge(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h${Math.floor((sec % 3600) / 60)}m`;
}

const MODE_LABEL: Record<string, string> = {
  CAT: "CAT",
  PRACTICE: "練習",
  TUTOR: "Tutor",
  MOCK: "Mock",
  REVIEW: "錯題",
  ASSESSMENT: "診斷",
  MINI_CAT: "Mini",
  ERROR_CHALLENGE: "錯題挑戰",
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "muted",
  BASIC: "blue",
  PRO: "gold",
  ELITE: "success",
};

export default function AdminLivePage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOnce = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/live", { cache: "no-store" });
      if (!res.ok) {
        setError(`載入失敗 (${res.status})`);
        return;
      }
      const body = (await res.json()) as LiveData;
      setData(body);
      setError(null);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "網路錯誤");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOnce();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!paused) {
      timerRef.current = setInterval(fetchOnce, REFRESH_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  if (!data && !error) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[var(--gold)]" />
        <p className="text-sm text-[var(--text-secondary)]">載入即時監控...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-[rgba(231,76,60,0.10)] border border-[var(--error)] rounded-xl p-5 flex items-center gap-3">
          <AlertCircle className="text-[var(--error)]" />
          <p className="text-[var(--error)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalActive = Object.values(data.sessionModeCounts).reduce((a, b) => a + b, 0);
  const totalUsers = Object.values(data.planMix).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75 ${paused ? "" : "animate-ping"}`} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--success)]" />
            </span>
            即時運營監控
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            每 15 秒自動更新 ·{" "}
            {lastRefresh ? `上次更新：${lastRefresh.toLocaleTimeString("zh-TW")}` : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors"
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? "恢復自動更新" : "暫停自動更新"}
          </button>
          <button
            onClick={fetchOnce}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--gold)] text-[#080E1A] font-medium text-sm hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            立即重新整理
          </button>
        </div>
      </div>

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Users}
          label="目前在線（5 分鐘內）"
          value={data.online.now}
          accent="success"
          sub={`15 分鐘 ${data.online.last15m} · 1 小時 ${data.online.last1h}`}
        />
        <KpiCard
          icon={Activity}
          label="進行中作答"
          value={totalActive}
          accent="gold"
          sub={`過去 1 小時答題 ${data.activity.answersLastHour}`}
        />
        <KpiCard
          icon={TrendingUp}
          label="今日答題數"
          value={data.activity.answersToday}
          accent="blue"
          sub={
            data.activity.accuracyToday !== null
              ? `平均正確率 ${data.activity.accuracyToday}%`
              : "尚無資料"
          }
        />
        <KpiCard
          icon={UserPlus}
          label="今日新用戶"
          value={data.activity.newUsersToday}
          accent="warning"
          sub={`註冊用戶總數 ${totalUsers.toLocaleString()}`}
        />
        <KpiCard
          icon={CheckCircle2}
          label="今日答對"
          value={data.activity.correctToday}
          accent="success"
          sub={`vs 答題 ${data.activity.answersToday}`}
        />
      </div>

      {/* Queues alert */}
      {(data.queues.pendingReports > 0 || data.queues.pendingFeedback > 0) && (
        <div className="rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 flex items-center gap-3">
          <AlertCircle className="text-[var(--warning)] flex-shrink-0" size={18} />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-[var(--text-secondary)]">需要你處理：</span>
            {data.queues.pendingReports > 0 && (
              <a href="/admin/reports" className="inline-flex items-center gap-1.5 text-[var(--warning)] font-medium hover:underline">
                <Flag size={14} /> {data.queues.pendingReports} 筆題目回報
              </a>
            )}
            {data.queues.pendingFeedback > 0 && (
              <a href="/admin/feedback" className="inline-flex items-center gap-1.5 text-[var(--warning)] font-medium hover:underline">
                <MessageSquare size={14} /> {data.queues.pendingFeedback} 筆近 7 日回饋
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active sessions */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Activity size={16} className="text-[var(--gold)]" />
              進行中作答 Session
              <Badge variant="muted">{data.activeSessions.length}</Badge>
            </h3>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              {Object.entries(data.sessionModeCounts).map(([m, n]) => (
                <Badge key={m} variant="muted" className="text-[10px]">
                  {MODE_LABEL[m] ?? m} · {n}
                </Badge>
              ))}
            </div>
          </div>

          {data.activeSessions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              目前沒有進行中的作答 Session
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="font-medium py-2 pr-3">用戶</th>
                    <th className="font-medium py-2 pr-3">模式</th>
                    <th className="font-medium py-2 pr-3 text-right">題數</th>
                    <th className="font-medium py-2 pr-3 text-right">正確</th>
                    <th className="font-medium py-2 pr-3 text-right">θ</th>
                    <th className="font-medium py-2 pr-3 text-right">時長</th>
                    <th className="font-medium py-2 text-right">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeSessions.map((s) => {
                    const acc = s.totalQuestions > 0 ? Math.round((s.correctCount / s.totalQuestions) * 100) : 0;
                    return (
                      <tr key={s.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="text-[var(--text-primary)] truncate max-w-[180px]">
                                {s.user.name ?? s.user.email.split("@")[0]}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
                                {s.user.email}
                              </div>
                            </div>
                            <Badge variant={(PLAN_COLORS[s.user.plan] as any) ?? "muted"} className="text-[10px]">
                              {s.user.plan}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="muted" className="text-[10px]">
                            {MODE_LABEL[s.mode] ?? s.mode}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono">{s.totalQuestions}</td>
                        <td className="py-2 pr-3 text-right font-mono">
                          <span className={acc >= 70 ? "text-[var(--success)]" : acc >= 50 ? "text-[var(--warning)]" : "text-[var(--error)]"}>
                            {acc}%
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-[var(--text-secondary)]">
                          {s.theta.toFixed(2)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} />
                            {formatAge(s.ageSec)}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          {s.isPaused ? (
                            <Badge variant="warning" className="text-[10px]">暫停</Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">作答中</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Plan distribution + queues */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Target size={16} className="text-[var(--gold)]" />
              方案分佈
            </h3>
            <div className="space-y-2.5">
              {(["FREE", "BASIC", "PRO", "ELITE"] as const).map((plan) => {
                const n = data.planMix[plan] ?? 0;
                const pct = totalUsers > 0 ? (n / totalUsers) * 100 : 0;
                const colorMap: Record<string, string> = {
                  FREE: "var(--text-muted)",
                  BASIC: "var(--blue)",
                  PRO: "var(--gold)",
                  ELITE: "var(--success)",
                };
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--text-secondary)]">{plan}</span>
                      <span className="text-[var(--text-primary)] font-mono">
                        {n.toLocaleString()} <span className="text-[var(--text-muted)]">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: colorMap[plan] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-[var(--warning)]" />
              待處理隊列
            </h3>
            <div className="space-y-3">
              <a href="/admin/reports" className="flex items-center justify-between hover:bg-[var(--bg-elevated)] -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Flag size={14} /> 題目回報
                </div>
                <Badge variant={data.queues.pendingReports > 0 ? "warning" : "muted"}>
                  {data.queues.pendingReports}
                </Badge>
              </a>
              <a href="/admin/feedback" className="flex items-center justify-between hover:bg-[var(--bg-elevated)] -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <MessageSquare size={14} /> 近 7 日回饋
                </div>
                <Badge variant={data.queues.pendingFeedback > 0 ? "warning" : "muted"}>
                  {data.queues.pendingFeedback}
                </Badge>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top users today */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Flame size={16} className="text-[var(--warning)]" />
            今日活躍榜（Top 8）
          </h3>
          {data.topUsersToday.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">今日尚無作答記錄</p>
          ) : (
            <div className="space-y-2">
              {data.topUsersToday.map((u, i) => {
                const acc = u.answers > 0 ? Math.round((u.correct / u.answers) * 100) : 0;
                return (
                  <div key={u.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--gold-dim)] text-[var(--gold)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--text-primary)] truncate">
                        {u.name ?? u.email?.split("@")[0] ?? "—"}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{u.email}</div>
                    </div>
                    <Badge variant={(PLAN_COLORS[u.plan ?? "FREE"] as any) ?? "muted"} className="text-[10px]">
                      {u.plan}
                    </Badge>
                    <div className="text-right text-xs">
                      <div className="font-mono text-[var(--text-primary)]">{u.answers} 題</div>
                      <div className={`font-mono text-[10px] ${acc >= 70 ? "text-[var(--success)]" : acc >= 50 ? "text-[var(--warning)]" : "text-[var(--error)]"}`}>
                        {acc}% 正確
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Domain heatmap */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Target size={16} className="text-[var(--blue)]" />
            今日各 Domain 表現
          </h3>
          {data.domainToday.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">尚無作答資料</p>
          ) : (
            <div className="space-y-2">
              {data.domainToday.map((d) => (
                <div key={d.domain}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)] truncate flex-1 min-w-0">{d.domain}</span>
                    <span className="font-mono text-[var(--text-primary)] ml-2">
                      {d.n} 題 ·{" "}
                      <span className={
                        d.accuracy === null ? "text-[var(--text-muted)]"
                          : d.accuracy >= 70 ? "text-[var(--success)]"
                          : d.accuracy >= 50 ? "text-[var(--warning)]"
                          : "text-[var(--error)]"
                      }>
                        {d.accuracy === null ? "—" : `${d.accuracy}%`}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${d.accuracy ?? 0}%`,
                        background: d.accuracy === null ? "var(--text-muted)"
                          : d.accuracy >= 70 ? "var(--success)"
                          : d.accuracy >= 50 ? "var(--warning)"
                          : "var(--error)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
  accent: "success" | "gold" | "blue" | "warning";
}) {
  const colorMap = {
    success: "text-[var(--success)] bg-[rgba(46,204,113,0.15)]",
    gold: "text-[var(--gold)] bg-[var(--gold-dim)]",
    blue: "text-[var(--blue)] bg-[var(--blue-dim)]",
    warning: "text-[var(--warning)] bg-[rgba(243,156,18,0.15)]",
  }[accent];
  const valueColor = {
    success: "text-[var(--success)]",
    gold: "text-[var(--gold)]",
    blue: "text-[var(--blue)]",
    warning: "text-[var(--warning)]",
  }[accent];

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap}`}>
        <Icon size={18} />
      </div>
      <div className={`text-2xl font-bold font-mono ${valueColor}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
      {sub && <div className="text-xs text-[var(--text-secondary)] mt-1">{sub}</div>}
    </div>
  );
}
