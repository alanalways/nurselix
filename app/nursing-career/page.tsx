"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp, Clock, DollarSign, AlertCircle, CheckCircle2,
  BookOpen, Heart, Globe, ArrowRight, Brain, Sparkles
} from "lucide-react";
import { NurslixIconSquare } from "@/components/ui/NurslixIcon";
import Button from "@/components/ui/Button";

export default function NursingCareerPage() {
  const [activeTab, setActiveTab] = useState<"salary" | "environment" | "nclex" | "comparison">("salary");

  // Salary ranges are approximations compiled from public sources (BLS OES,
  // state nursing boards, job-posting aggregators). Real packages vary by
  // hospital, shift differential, union status, and overtime.
  const salaryData = [
    { state: "加州 (California)", newGrad: "$80–100K", mid: "$110–140K", senior: "$140–180K", index: "全美最高之一" },
    { state: "紐約 (New York)", newGrad: "$70–90K", mid: "$95–120K", senior: "$120–160K", index: "高" },
    { state: "麻州 (Massachusetts)", newGrad: "$75–90K", mid: "$95–115K", senior: "$120–150K", index: "高" },
    { state: "德州 (Texas)", newGrad: "$60–75K", mid: "$80–95K", senior: "$95–125K", index: "中偏高" },
    { state: "佛州 (Florida)", newGrad: "$55–70K", mid: "$70–90K", senior: "$90–115K", index: "中" },
    { state: "全美中位數", newGrad: "$65–80K", mid: "$80–100K", senior: "$100–130K", index: "參考值" },
  ];

  // Approximate annual RN salary ranges by specialty, US-wide.
  // Ranges span new-grad → senior levels; certifications (CCRN, CEN, OCN 等)
  // often add 5–15% premium. Travel / contract roles far exceed staff rates.
  const specialtySalaryData = [
    { specialty: "加護病房 RN (ICU / CVICU / MICU)", range: "$85K–130K", premium: "+10–15%", note: "CCRN 認證、夜班、高患者敏銳度加乘" },
    { specialty: "急診 RN (ER / Trauma)", range: "$80K–120K", premium: "+8–12%", note: "CEN / TCRN 認證；危險津貼普遍" },
    { specialty: "手術室 RN (OR / PACU)", range: "$80K–110K", premium: "+5–10%", note: "CNOR / Perioperative 101 訓練後薪資上行" },
    { specialty: "內外科 RN (Med-Surg)", range: "$70K–95K", premium: "—", note: "新手最常見起點；CMSRN 可小幅加薪" },
    { specialty: "婦產 / 產房 RN (L&D / Mother-Baby)", range: "$75K–105K", premium: "+5%", note: "RNC-OB 認證；夜班與 on-call 常見" },
    { specialty: "兒科 / PICU RN", range: "$75K–110K", premium: "+5–10%", note: "CPN / CCRN-Pediatric 加成；兒童醫院較競爭" },
    { specialty: "精神科 RN (Psych / Mental Health)", range: "$75K–100K", premium: "—", note: "危險津貼與 acuity 津貼依機構而定" },
    { specialty: "腫瘤科 RN (Oncology)", range: "$80K–110K", premium: "+5–10%", note: "OCN 認證；化療給藥技能為門檻" },
    { specialty: "心導管 / 電生理 RN (Cath Lab / EP)", range: "$90K–125K", premium: "+10%", note: "on-call 與程序津貼較高" },
    { specialty: "洗腎 RN (Dialysis)", range: "$75K–100K", premium: "—", note: "班表規律；CDN / CNN 認證加成" },
    { specialty: "居家照護 RN (Home Health)", range: "$70K–95K", premium: "—", note: "按訪視計酬者收入浮動；通常較少夜班" },
    { specialty: "長照 / 安寧 RN (LTC / Hospice)", range: "$65K–90K", premium: "—", note: "CHPN 認證可加成；入行門檻較低" },
    { specialty: "學校護理師 (School Nurse)", range: "$50K–75K", premium: "—", note: "薪資較低但班表規律、暑假不上班" },
    { specialty: "差旅護理師 (Travel Nurse)", range: "$90K–180K+", premium: "依合約", note: "13 週合約制；住宿津貼常另計，變動大" },
    { specialty: "開業護理師 (Nurse Practitioner, NP)", range: "$110K–150K", premium: "—", note: "需 MSN / DNP；家醫、精神、急重症等次專長" },
  ];

  // Note: removed bogus "satisfaction %" — those are fabricated and not
  // sourced from any survey. We describe pace/intensity qualitatively instead.
  const environmentData = [
    {
      type: "急診室 (ER)",
      shift: "12 小時輪班，含夜班與週末",
      workload: "高強度、患者流量大、急救情境頻繁",
      pace: "極快",
      notes: "適合反應快、抗壓性強者；夜班 / 危險津貼較高"
    },
    {
      type: "加護病房 (ICU)",
      shift: "12 小時輪班（日 / 夜輪替）",
      workload: "高難度、高技術門檻；患者比例約 1:1–1:2",
      pace: "高",
      notes: "薪資較高，需具備重症照護能力；常見科別包含 MICU、SICU、CVICU"
    },
    {
      type: "一般內外科病房 (Med-Surg)",
      shift: "8 或 12 小時輪班",
      workload: "中等；患者比例約 1:4–1:6（依州法與醫院）",
      pace: "中",
      notes: "新人最常見的起點，能廣泛接觸各類疾病"
    },
    {
      type: "手術室 (OR / PACU)",
      shift: "多為日班，週末多採 on-call 制",
      workload: "中至高，需高度專注與團隊配合",
      pace: "中",
      notes: "班表相對規律，較少夜班；需通過 perioperative 訓練"
    },
    {
      type: "居家照護 (Home Health)",
      shift: "日班為主，按訪視排程",
      workload: "中；獨立作業，須自行管理時間",
      pace: "低至中",
      notes: "工作生活平衡較佳；需自備交通與良好溝通能力"
    },
  ];

  const nclexInfo = [
    { item: "考試報名費", value: "US$200", note: "NCSBN 公告，需另付執照申請費" },
    { item: "建議準備時間", value: "3–6 個月", note: "依英語能力與每日投入時數" },
    { item: "首次受試通過率", value: "約 80–90%", note: "美國本國畢業生整體區間（NCSBN 統計）" },
    { item: "國際畢業生通過率", value: "約 45–55%", note: "整體；個人差異大，與英語能力關聯高" },
    { item: "州執照申請費", value: "US$100–300", note: "各州差異大，部分州另需 CGFNS 認證" },
    { item: "執照更新周期", value: "每 2–3 年", note: "各州規定不同，多需 CE 學分" },
  ];

  // Approximate comparison — figures vary widely by hospital, region, year and
  // contract type. Use as orientation only.
  const comparisonData = [
    { aspect: "初階年薪（折算 USD）", tw: "約 US$22–32K", us: "約 US$65–80K", advantage: "🇺🇸 約高 2 倍" },
    { aspect: "資深年薪（10 年以上）", tw: "約 US$35–55K", us: "約 US$100–140K", advantage: "🇺🇸 約高 2–3 倍" },
    { aspect: "標準輪班", tw: "8–12 小時，常見加班", us: "8 或 12 小時，加班需另計", advantage: "🇺🇸 較規律" },
    { aspect: "護病比", tw: "急性病房常見 1:8–1:12", us: "1:4–1:6（加州 ICU 法定 1:2）", advantage: "🇺🇸 較低" },
    { aspect: "福利", tw: "勞健保 / 退休金", us: "醫療保險、401(k)、PTO、CE 補助", advantage: "🇺🇸 通常較完整" },
    { aspect: "升遷路徑", tw: "護理長 / 督導為主", us: "Charge / Educator / NP / CNS / 行政", advantage: "🇺🇸 路徑多元" },
    { aspect: "生活成本", tw: "相對低", us: "依城市差異極大", advantage: "視城市而定" },
    { aspect: "工作簽證", tw: "—", us: "多透過 EB-3 / H-1B（雇主贊助為主）", advantage: "需提早規劃" },
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

          <div className="flex items-start gap-2 text-sm text-[var(--text-muted)] max-w-3xl">
            <AlertCircle size={16} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
            <span>
              本頁資訊綜合自公開資料整理，數字皆為大致範圍，僅供參考。實際薪資、班表與工作條件因州別、醫院、年資、科別與市場狀況而異。決策前請以
              <a href="https://www.bls.gov/oes/current/oes291141.htm" target="_blank" rel="noopener noreferrer" className="text-[var(--gold)] underline mx-1">美國勞工統計局 (BLS)</a>
              、
              <a href="https://www.ncsbn.org/exams/exam-statistics-and-publications.page" target="_blank" rel="noopener noreferrer" className="text-[var(--gold)] underline mx-1">NCSBN 官方統計</a>
              與目標雇主之最新公告為準。
            </span>
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
                { label: "BLS 預估職位成長", value: "約 6% (10 年)", note: "高於全美職業平均" },
                { label: "整體缺口", value: "顯著", note: "多家機構預估未來十年將短缺數十萬名護理師" },
                { label: "工作型態", value: "彈性多元", note: "醫院、診所、居家、學校、travel nurse 皆有" },
              ].map((stat, i) => (
                <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
                  <div className="text-sm text-[var(--text-muted)] mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold text-[var(--gold)] mb-1">{stat.value}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{stat.note}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-[var(--text-muted)] italic">
              ※ 以上薪資為公開資料整理之大致範圍，未涵蓋夜班 / 假日 / 加班等津貼。實際 offer 請以雇主合約為準。
            </div>

            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2 mt-10">
                <Heart size={20} className="text-[var(--gold)]" />
                各科別 RN 年薪差異（全美概況）
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                同樣是 RN，不同科別的薪資落差可達 2–3 倍。認證（CCRN、CEN、OCN 等）、夜班 / 假日津貼與 on-call 都會再往上疊加。
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-primary)]">科別</th>
                    <th className="text-center py-3 px-4 font-semibold text-[var(--text-secondary)]">年薪範圍</th>
                    <th className="text-center py-3 px-4 font-semibold text-[var(--text-secondary)]">認證加成</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)] hidden md:table-cell">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {specialtySalaryData.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{row.specialty}</td>
                      <td className="py-3 px-4 text-center text-[var(--gold)] font-semibold whitespace-nowrap">{row.range}</td>
                      <td className="py-3 px-4 text-center text-[var(--text-secondary)] text-sm whitespace-nowrap">{row.premium}</td>
                      <td className="py-3 px-4 text-xs text-[var(--text-muted)] hidden md:table-cell">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-[var(--text-muted)] italic">
              ※ 科別薪資整理自 BLS OES、醫院官方招募頁、Nurse.org / Indeed 等公開來源的概略範圍，未計入差旅 / 簽約金 / 股權等一次性給付。差旅護理師（Travel）收入波動極大，表列僅供參考。
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
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{dept.type}</h3>
                    <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)] flex-shrink-0">
                      節奏：{dept.pace}
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
                        <span className="text-[var(--text-secondary)]">工作內容：</span>
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
              <p className="text-[var(--text-secondary)] mb-2">
                以下為一般性對比，幫助你建立全貌。
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                ※ 數字為公開資料整理之大致範圍，個人實際結果差異甚大；本對比不構成財務、法律或就業建議。
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
              <div className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
                美國 RN 平均薪資水準約為台灣的 2–3 倍
              </div>
              <p className="text-[var(--text-secondary)] mb-6 text-sm">
                以上為公開資料整理之大致範圍，不構成就業或財務建議。實際結果依個人條件、雇主、地區與市場狀況而異。
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
                { icon: Brain, text: "IRT 三參數電腦適應測驗（CAT），擬真 NCLEX 體驗" },
                { icon: BookOpen, text: "25,000+ 題庫，涵蓋八大 NCLEX-RN 領域" },
                { icon: CheckCircle2, text: "SATA / SBA / 案例題型完整支援" },
                { icon: Sparkles, text: "Hermes AI 學習分析，找出弱點對症下藥" },
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
