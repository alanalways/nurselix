"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, Activity, TrendingUp, CheckCircle, AlertCircle, Loader2, Download, UserPlus, Database } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface OverviewData {
  users: { total: number; newThisWeek: number };
  questions: { total: number; approved: number; draft: number; archived: number };
  today: { dau: number; answers: number; answersYesterday: number };
  last7Days: { date: string; dau: number; questions: number }[];
}

interface ServiceStatus {
  services: {
    database: { healthy: boolean };
    redis: { healthy: boolean };
    minio: { healthy: boolean | null };
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [health, setHealth] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [testUserLoading, setTestUserLoading] = useState(false);
  const [testUserResult, setTestUserResult] = useState<string | null>(null);
  const [testUserEnabled, setTestUserEnabled] = useState<boolean | null>(null);
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [overviewRes, healthRes, testUserRes] = await Promise.all([
          fetch("/api/admin/overview", { cache: "no-store" }),
          fetch("/api/admin/agents", { cache: "no-store" }),
          fetch("/api/admin/seed-test-user", { cache: "no-store" }),
        ]);
        if (alive && testUserRes.ok) {
          const t = await testUserRes.json();
          setTestUserEnabled(t.enabled);
        }
        if (!overviewRes.ok) {
          setError(`載入失敗 (${overviewRes.status})`);
          return;
        }
        const overview = await overviewRes.json();
        const healthJson = healthRes.ok ? await healthRes.json() : null;
        if (alive) {
          setData(overview);
          setHealth(healthJson);
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "網路錯誤");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[var(--gold)]" />
        <p className="text-sm text-[var(--text-secondary)]">載入管理總覽...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-[rgba(231,76,60,0.10)] border border-[var(--error)] rounded-xl p-5 flex items-center gap-3">
          <AlertCircle className="text-[var(--error)]" />
          <p className="text-[var(--error)]">{error ?? "無資料"}</p>
        </div>
      </div>
    );
  }

  const answerTrendPct = data.today.answersYesterday > 0
    ? Math.round(((data.today.answers - data.today.answersYesterday) / data.today.answersYesterday) * 100)
    : null;

  const dbOk = health?.services.database.healthy ?? false;
  const redisOk = health?.services.redis.healthy ?? false;

  const chartData = data.last7Days.map((d) => ({
    date: new Date(d.date).toLocaleDateString("zh-TW", { weekday: "short" }),
    dau: d.dau,
    questions: d.questions,
  }));

  const handleSeed = async () => {
    if (seeding) return;
    if (!confirm("這將從 Google Drive 下載 14,500 題並匯入資料庫（APPROVED）。確定繼續？")) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const body = await res.json();
      if (res.ok) {
        setSeedResult(`✓ 匯入完成：${body.inserted} 題已匯入，${body.skipped} 跳過（共 ${body.total} 題）`);
        // Refresh stats
        const overview = await fetch("/api/admin/overview", { cache: "no-store" });
        if (overview.ok) setData(await overview.json());
      } else {
        setSeedResult(`✗ 失敗：${body.error ?? "未知錯誤"}`);
      }
    } catch (e: any) {
      setSeedResult(`✗ 網路錯誤：${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">管理總覽</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={testUserEnabled ? "gold" : "outline"}
            onClick={async () => {
              if (testUserLoading || testUserEnabled === null) return;
              const target = !testUserEnabled;
              const confirmMsg = target
                ? "啟用藍新審核測試帳號（abcd@nurslix.com / abcdefghi / FREE）？"
                : "停用藍新測試帳號（登入將被拒絕）？";
              if (!confirm(confirmMsg)) return;
              setTestUserLoading(true); setTestUserResult(null);
              try {
                const res = await fetch("/api/admin/seed-test-user", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ enabled: target }),
                });
                const body = await res.json();
                if (res.ok) {
                  setTestUserEnabled(body.enabled);
                  setTestUserResult(body.message);
                } else {
                  setTestUserResult(`✗ 失敗：${body.error ?? "未知錯誤"}`);
                }
              } catch (e: any) {
                setTestUserResult(`✗ 網路錯誤：${e.message}`);
              } finally {
                setTestUserLoading(false);
              }
            }}
            disabled={testUserLoading || testUserEnabled === null}
          >
            {testUserLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {testUserEnabled === null
              ? "載入中..."
              : testUserEnabled
              ? "停用藍新測試帳號"
              : "啟用藍新測試帳號"}
          </Button>
          <Button size="sm" variant="outline" onClick={async () => {
            if (migrateLoading) return;
            if (!confirm("執行 DB migration（建立 LearnerProfile / SessionDiagnosis / HermesJob / AppSetting 表）？安全可重複執行。")) return;
            setMigrateLoading(true); setMigrateResult(null);
            try {
              const res = await fetch("/api/admin/migrate", { method: "POST" });
              const body = await res.json();
              if (res.ok) {
                setMigrateResult(`✓ DB migration 完成：${body.results.map((r: any) => r.file).join(", ")}`);
              } else {
                const fails = (body.results ?? []).filter((r: any) => !r.ok).map((r: any) => `${r.file}: ${r.error}`).join("; ");
                setMigrateResult(`✗ 失敗：${fails || body.error}`);
              }
            } catch (e: any) {
              setMigrateResult(`✗ 網路錯誤：${e.message}`);
            } finally {
              setMigrateLoading(false);
            }
          }} disabled={migrateLoading}>
            {migrateLoading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            {migrateLoading ? "執行中..." : "執行 DB Migration"}
          </Button>
          {data && data.questions.approved === 0 && (
            <Button size="sm" variant="gold" onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {seeding ? "匯入中（需 1-3 分鐘）..." : "一鍵匯入 14,500 題"}
            </Button>
          )}
        </div>
      </div>
      {seedResult && (
        <div className={`px-4 py-2 rounded-lg text-sm ${seedResult.startsWith("✓") ? "bg-[rgba(46,204,113,0.12)] text-[var(--success)]" : "bg-[rgba(231,76,60,0.12)] text-[var(--error)]"}`}>
          {seedResult}
        </div>
      )}
      {testUserResult && (
        <div className={`px-4 py-2 rounded-lg text-sm ${testUserResult.startsWith("✓") ? "bg-[rgba(46,204,113,0.12)] text-[var(--success)]" : "bg-[rgba(231,76,60,0.12)] text-[var(--error)]"}`}>
          {testUserResult}
        </div>
      )}
      {migrateResult && (
        <div className={`px-4 py-2 rounded-lg text-sm ${migrateResult.startsWith("✓") ? "bg-[rgba(46,204,113,0.12)] text-[var(--success)]" : "bg-[rgba(231,76,60,0.12)] text-[var(--error)]"}`}>
          {migrateResult}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users, label: "總用戶數", value: data.users.total.toLocaleString(),
            sub: `+${data.users.newThisWeek} 本週`,
            color: "text-[var(--blue)]", bg: "bg-[var(--blue-dim)]",
          },
          {
            icon: BookOpen, label: "題庫總數", value: data.questions.total.toLocaleString(),
            sub: `${data.questions.draft} 待審核 · ${data.questions.approved} 已核`,
            color: "text-[var(--gold)]", bg: "bg-[var(--gold-dim)]",
          },
          {
            icon: Activity, label: "今日 DAU", value: data.today.dau.toLocaleString(),
            sub: answerTrendPct !== null ? `${answerTrendPct >= 0 ? "↑" : "↓"}${Math.abs(answerTrendPct)}% vs 昨日` : "—",
            color: "text-[var(--success)]", bg: "bg-[rgba(46,204,113,0.15)]",
          },
          {
            icon: TrendingUp, label: "今日答題", value: data.today.answers.toLocaleString(),
            sub: data.today.dau > 0 ? `平均 ${(data.today.answers / data.today.dau).toFixed(1)} 題/人` : "—",
            color: "text-[var(--warning)]", bg: "bg-[rgba(243,156,18,0.15)]",
          },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">近 7 天 DAU / 答題數</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                labelStyle={{ color: "var(--text-primary)" }}
              />
              <Line yAxisId="left" type="monotone" dataKey="dau" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} name="DAU" />
              <Line yAxisId="right" type="monotone" dataKey="questions" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} name="答題數" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">服務狀態</h3>
          <div className="space-y-3">
            {[
              { name: "PostgreSQL", ok: dbOk },
              { name: "Redis", ok: redisOk },
              { name: "API Server", ok: true },
              { name: "MinIO", ok: health?.services.minio.healthy },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {s.ok === null
                    ? <AlertCircle size={14} className="text-[var(--text-muted)]" />
                    : s.ok
                      ? <CheckCircle size={14} className="text-[var(--success)]" />
                      : <AlertCircle size={14} className="text-[var(--error)]" />}
                  <span className="text-sm text-[var(--text-secondary)]">{s.name}</span>
                </div>
                <Badge variant={s.ok === null ? "muted" : s.ok ? "success" : "error"} className="text-[10px]">
                  {s.ok === null ? "N/A" : s.ok ? "正常" : "異常"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">題庫狀態</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatusCard label="已審核（APPROVED）" value={data.questions.approved} color="success" />
          <StatusCard label="草稿（DRAFT）" value={data.questions.draft} color="warning" />
          <StatusCard label="封存（ARCHIVED）" value={data.questions.archived} color="muted" />
        </div>
      </div>
    </motion.div>
  );
}

function StatusCard({ label, value, color }: { label: string; value: number; color: "success" | "warning" | "muted" }) {
  const colorMap = {
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    muted: "text-[var(--text-muted)]",
  };
  return (
    <div className="bg-[var(--bg-elevated)] rounded-lg p-4 text-center">
      <div className={`text-2xl font-bold font-mono ${colorMap[color]}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
    </div>
  );
}
