"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp, MapPin, Clock, DollarSign, AlertCircle, CheckCircle2,
  BookOpen, Heart, Users, Globe, ArrowRight, Brain
} from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import Button from "@/components/ui/Button";

export default function NursingCareerPage() {
  const [activeTab, setActiveTab] = useState<"salary" | "environment" | "nclex" | "comparison">("salary");

  const salaryData = [
    { state: "加州 (California)", newGrad: "$75-85K", mid: "$95-110K", senior: "$130-160K", index: "全美最高" },
    { state: "紐約 (New York)", newGrad: "$65-75K", mid: "$85-100K", senior: "$120-150K", index: "高" },
    { state: "德州 (Texas)", newGrad: "$58-68K", mid: "$75-90K", senior: "$105-130K", index: "中偏高" },
    { state: "佛州 (Florida)", newGrad: "$55-65K", mid: "$70-85K", senior: "$100-125K", index: "中" },
    { state: "全美平均", newGrad: "$60-70K", mid: "$80-95K", senior: "$110-135K", index: "參考值" },
  ];

  const environmentData = [
    {
      type: "急診室 (ER)",
      shift: "24小時輪班制（通常 8-12 小時）",
      workload: "高壓、緊急情況多",
      satisfaction: "65%",
      notes: "刺激高報酬，但身心負荷大"
    },
    {
      type: "加護病房 (ICU)",
      shift: "12 小時輪班（日班/夜班交替）",
      workload: "極高難度、高責任感",
      satisfaction: "70%",
      notes: "薪資最高，但是最累的科室之一"
    },
    {
      type: "一般病房 (Medical-Surgical)",
      shift: "8-12 小時輪班",
      workload: "中等（多數患者症狀穩定）",
      satisfaction: "75%",
      notes: "新手友善，適合初級護理師"
    },
    {
      type: "手術室 (OR)",
      shift: "多為日班（7-15:30），周末通常不上班",
      workload: "中到高（需專注力）",
      satisfaction: "78%",
      notes: "規律班表，薪資中等偏高"
    },
    {
      type: "社區護理 (Home Health)",
      shift: "日班為主（8-17:00）",
      workload: "低到中（更多溝通與教學）",
      satisfaction: "82%",
      notes: "最平衡的工作環境，但患者接觸較少"
    },
  ];

  const nclexInfo = [
    { item: "考試費用", value: "$200", note: "2026 年報價" },
    { item: "準備時間", value: "3-6 個月", note: "取決於基礎與投入度" },
    { item: "通過率（全球考生）", value: "~85%", note: "第一次通過率" },
    { item: "台灣護理師通過率", value: "~90%", note: "通常高於平均" },
    { item: "執照費用（首年）", value: "$150-200", note: "各州略異" },
    { item: "執照更新周期", value: "2-3 年", note: "各州規定不同" },
  ];

  const comparisonData = [
    { aspect: "初階年薪", tw: "$25-35K USD", us: "$60-70K USD", advantage: "🇺🇸 US 高 2 倍" },
    { aspect: "資深年薪（10年）", tw: "$45-55K USD", us: "$110-135K USD", advantage: "🇺🇸 US 高 2-3 倍" },
    { aspect: "工作時數", tw: "12 小時輪班（台灣常超時）", us: "8-12 小時（法律保障）", advantage: "🇺🇸 US 更規律" },
    { aspect: "患者比例", tw: "1:12-15", us: "1:4-6", advantage: "🇺🇸 US 更安全" },
    { aspect: "福利", tw: "基本健保", us: "健保 + 401k + 簽証贊助", advantage: "🇺🇸 US 更優" },
    { aspect: "升職機會", tw: "有限（阿長制度）", us: "多元（臨床師、管理、專科）", advantage: "🇺🇸 US 多元" },
    { aspect: "生活成本", tw: "NT$2K/月", us: "$1.5-3K USD/月", advantage: "🟰 相當" },
    { aspect: "簽証", tw: "需 H-1B", us: "通常雇主贊助", advantage: "🇺🇸 有幫助" },
  ];

  const tabButtons = [
    { id: "salary", label: "💰 薪資概況", icon: DollarSign },
    { id: "environment", label: "🏥 工作環境", icon: Heart },
    { id: "nclex", label: "📋 NCLEX 準備", icon: BookOpen },
    { id: "comparison", label: "🇹🇼 vs 🇺🇸 對比", icon: Globe },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-base)] border-b border-[var(--border-subtle)]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center flex-shrink-0">
              <NurslixIconSquare size={28} className="text-[#080E1A]" />
            </div>
            <Link href="/" className="text-lg font-bold text-gradient-gold">Nurslix</Link>
          </div>

          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3 leading-tight">
            美國護理師職業指南
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-2xl">
            深入了解美國護理師的薪資、工作環境、執照要求，以及與台灣的差異。幫助你做出明智的職涯決定。
          </p>

          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <CheckCircle2 size={16} className="text-[var(--success)]" />
            <span>數據更新於 2026 年，基於美國護理師協會 (ANA) 與勞工統計局 (BLS)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto py-4">
            {tabButtons.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  activeTab === id
                    ? "bg-[var(--gold)] text-[#080E1A] font-semibold"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {activeTab === "salary" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <DollarSign className="text-[var(--gold)]" />
                美國護理師薪資水平
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                根據美國勞工統計局 (BLS 2024)，護理師是全美薪資最穩定、成長最快的行業之一。
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">州別</th>
                    <th className="text-center py-3 px-4 font-semibold text-[var(--text-secondary)]">新手護理師</th>
                    <th className="text-center py-3 px-4 font-semibold text-[var(--text-secondary)]">中級（5-10年）</th>
                    <th className="text-center py-3 px-4 font-semibold text-[var(--text-secondary)]">資深（10+年）</th>
                    <th className="text-center py-3 px-4 font-semibold text-[var(--text-primary)]">指數</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
                      <td className="py-4 px-4 font-medium text-[var(--text-primary)]">{row.state}</td>
                      <td className="py-4 px-4 text-center text-[var(--text-secondary)]">{row.newGrad}</td>
                      <td className="py-4 px-4 text-center text-[var(--text-secondary)]">{row.mid}</td>
                      <td className="py-4 px-4 text-center text-[var(--gold)] font-semibold">{row.senior}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          row.index.includes("最高") ? "bg-[var(--gold-dim)] text-[var(--gold)]"
                            : row.index.includes("高") ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                            : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                        }`}>
                          {row.index}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "年薪成長速度", value: "3-5% 年增", note: "全美經濟平均 2%" },
                { label: "需求量", value: "極高缺口", note: "2026 預計短缺 50 萬護理師" },
                { label: "工作安全性", value: "99%", note: "職位穩定，不易被裁員" },
              ].map((stat, i) => (
                <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
                  <div className="text-sm text-[var(--text-muted)] mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold text-[var(--gold)] mb-1">{stat.value}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{stat.note}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "environment" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Heart className="text-[var(--error)]" />
                工作環境與科室特色
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                美國護理師的工作環境因科室而異。以下是最常見科室的特點：
              </p>
            </div>

            <div className="space-y-4">
              {environmentData.map((dept, i) => (
                <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 hover:border-[var(--gold)] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{dept.type}</h3>
                    <div className="text-sm font-semibold px-3 py-1 rounded-lg bg-[var(--success)]/20 text-[var(--success)]">
                      滿意度 {dept.satisfaction}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-start gap-3">
                      <Clock size={16} className="text-[var(--gold)] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[var(--text-secondary)]">班表：</span>
                        <span className="text-[var(--text-primary)]">{dept.shift}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingUp size={16} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[var(--text-secondary)]">工作量：</span>
                        <span className="text-[var(--text-primary)]">{dept.workload}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-[var(--text-secondary)] pt-3 border-t border-[var(--border-subtle)]">
                    💡 {dept.notes}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[rgba(46,204,113,0.10)] border border-[var(--success)]/40 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-[var(--success)] flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">美國護理師的工作權益</h4>
                  <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                    <li>✓ <strong>法律保護班表：</strong> 聯邦法禁止強制加班，工會護理師享受額外保護</li>
                    <li>✓ <strong>患者比例規範：</strong> 加州法律規定 1:4 患者比例（最嚴格），其他州 1:6-8</li>
                    <li>✓ <strong>危險津貼：</strong> ICU、ER 等科室額外薪資加成</li>
                    <li>✓ <strong>帶薪假期：</strong> 平均 15-20 天帶薪休假 + 10-15 天病假</li>
                    <li>✓ <strong>專業發展：</strong> 雇主贊助高級執照、碩士課程</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "nclex" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <BookOpen className="text-[var(--blue)]" />
                NCLEX-RN 執照考試
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                NCLEX-RN 是進入美國護理師職業的必經之路。以下是考試與執照的基本信息：
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nclexInfo.map((info, i) => (
                <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
                  <div className="text-sm font-semibold text-[var(--gold)] mb-2">{info.item}</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{info.value}</div>
                  <div className="text-xs text-[var(--text-muted)]">{info.note}</div>
                </div>
              ))}
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">考試時間表（推薦）</h3>
              <div className="space-y-3 text-sm">
                {[
                  { month: "第 1-2 個月", task: "基礎複習 (護理基本原理、解剖學、藥理)" },
                  { month: "第 3-4 個月", task: "主題系統複習 (心臟科、呼吸科、內科等)" },
                  { month: "第 5 個月", task: "模擬考試、弱項加強" },
                  { month: "第 6 個月", task: "最後衝刺、報名考試、心理建設" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-[var(--border-subtle)] last:border-b-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--gold)] text-[#080E1A] flex items-center justify-center font-bold flex-shrink-0 text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{step.month}</div>
                      <div className="text-[var(--text-secondary)]">{step.task}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--blue-dim)] border border-[var(--blue)] rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-[var(--blue)] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">為什麼選擇 Nurslix？</h4>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    Nurslix 的 CAT（電腦適應測驗）模擬真實 NCLEX 考試邏輯，使用 IRT 三參數模型精準評估你的能力水準。配合 Hermes AI 分析，快速找出你的弱點，節省你寶貴的準備時間。
                  </p>
                  <Link href="/nclex">
                    <Button variant="outline" size="sm" className="border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blue-dim)]">
                      開始練習
                      <ArrowRight size={14} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "comparison" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Globe className="text-[var(--blue)]" />
                台灣 vs 美國 護理師職涯對比
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                看看出國工作能帶來的改變：
              </p>
            </div>

            <div className="space-y-3">
              {comparisonData.map((row, i) => (
                <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--gold)] transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-semibold text-[var(--text-primary)]">{row.aspect}</h3>
                    <span className="text-xl font-bold">{row.advantage}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">🇹🇼 台灣：</span>
                      <span className="text-[var(--text-secondary)] ml-2">{row.tw}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">🇺🇸 美國：</span>
                      <span className="text-[var(--text-secondary)] ml-2">{row.us}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[rgba(201,168,76,0.10)] border border-[var(--gold)]/40 rounded-xl p-6">
                <h3 className="font-semibold text-[var(--gold)] mb-4">✈️ 出國的優勢</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li>✓ 薪資 2-3 倍以上</li>
                  <li>✓ 工作權益法律保障</li>
                  <li>✓ 患者比例合理（安全）</li>
                  <li>✓ 升職與專業發展機會多</li>
                  <li>✓ 國際護理經驗加持</li>
                  <li>✓ 帶薪假期與工作生活平衡</li>
                </ul>
              </div>

              <div className="bg-[rgba(231,76,60,0.10)] border border-[var(--error)]/40 rounded-xl p-6">
                <h3 className="font-semibold text-[var(--error)] mb-4">⚠️ 需要準備的挑戰</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li>• 通過 NCLEX-RN 考試（難度較高）</li>
                  <li>• 申請工作簽證 (H-1B)</li>
                  <li>• 英語溝通與文化適應</li>
                  <li>• 離開家人、適應新環境</li>
                  <li>• 初期適應期薪資可能低於資深護理師</li>
                  <li>• 需要持續進修維持執照</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--bg-elevated)] border border-[var(--gold)] rounded-xl p-8 text-center">
              <div className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                平均薪資提升：200% 以上
              </div>
              <p className="text-[var(--text-secondary)] mb-6">
                10 年工作下來，美國護理師累計薪資可高出台灣 $500K+ USD
              </p>
              <Link href="/pricing">
                <Button variant="gold">
                  開始你的 NCLEX 備考之旅
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] mt-12">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                準備好考 NCLEX 了嗎？
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Nurslix 提供 IRT 自適應測驗、Hermes AI 分析與 25,000+ 高質量題庫。讓你有信心地踏上美國護理師之路。
              </p>
              <Link href="/">
                <Button variant="gold" className="group">
                  回到首頁
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {[
                { icon: Users, text: "已幫助 5,000+ 台灣護理師" },
                { icon: TrendingUp, text: "平均通過率 92%（vs 全球 85%）" },
                { icon: CheckCircle2, text: "25,479 題精選題庫" },
                { icon: Brain, text: "Hermes AI 智能學習分析" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <item.icon size={20} className="text-[var(--gold)]" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
