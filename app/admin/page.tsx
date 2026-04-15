"use client";

import { motion } from "framer-motion";
import { Users, BookOpen, Activity, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Badge from "@/components/ui/Badge";

const weeklyDAU = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 6 + i);
  return {
    date: d.toLocaleDateString("zh-TW", { weekday: "short" }),
    dau: Math.floor(Math.random() * 50) + 20,
    questions: Math.floor(Math.random() * 500) + 200,
  };
});

const serviceStatus = [
  { name: "PostgreSQL", status: "healthy", latency: "4ms" },
  { name: "Redis", status: "healthy", latency: "1ms" },
  { name: "MinIO", status: "healthy", latency: "12ms" },
  { name: "API Server", status: "healthy", latency: "45ms" },
];

const recentActivity = [
  { action: "新用戶註冊", detail: "user@example.com", time: "2 分鐘前" },
  { action: "新題目送審", detail: "Pharmacological #245", time: "15 分鐘前" },
  { action: "題目回報", detail: "Question #102 - 解析有誤", time: "1 小時前" },
  { action: "用戶回饋", detail: "⭐⭐⭐⭐⭐ 非常好用！", time: "2 小時前" },
];

export default function AdminDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">管理總覽</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "總用戶數", value: "1,247", sub: "+23 本週", color: "text-[var(--blue)]", bg: "bg-[var(--blue-dim)]" },
          { icon: BookOpen, label: "題庫總數", value: "847", sub: "23 待審核", color: "text-[var(--gold)]", bg: "bg-[var(--gold-dim)]" },
          { icon: Activity, label: "今日 DAU", value: "68", sub: "↑12% vs 昨日", color: "text-[var(--success)]", bg: "bg-[rgba(46,204,113,0.15)]" },
          { icon: TrendingUp, label: "今日答題", value: "2,341", sub: "平均 34.4 題/人", color: "text-[var(--warning)]", bg: "bg-[rgba(243,156,18,0.15)]" },
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
        {/* DAU Chart */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">近 7 天 DAU / 答題數</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyDAU}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8 }}
                labelStyle={{ color: "var(--text-primary)" }}
              />
              <Line yAxisId="left" type="monotone" dataKey="dau" stroke="var(--gold)" strokeWidth={2} dot={false} name="DAU" />
              <Line yAxisId="right" type="monotone" dataKey="questions" stroke="var(--blue)" strokeWidth={2} dot={false} name="答題數" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Service Health */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">服務狀態</h3>
          <div className="space-y-3">
            {serviceStatus.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-[var(--success)]" />
                  <span className="text-sm text-[var(--text-secondary)]">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-[10px]">正常</Badge>
                  <span className="text-xs font-mono text-[var(--text-muted)]">{s.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">最近活動</h3>
        <div className="space-y-3">
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
              <div>
                <span className="text-sm font-medium text-[var(--text-primary)]">{a.action}</span>
                <span className="text-sm text-[var(--text-muted)] ml-2">{a.detail}</span>
              </div>
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
