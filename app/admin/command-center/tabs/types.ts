/** Shared types for command-center tabs */
export type TabKey =
  | "overview"
  | "quality"
  | "reports"
  | "spot-check"
  | "audit"
  | "marketing"
  | "agents";

export const TAB_LABELS: Record<TabKey, string> = {
  overview: "總覽",
  quality: "品質",
  reports: "回報",
  "spot-check": "抽查",
  audit: "審核",
  marketing: "行銷部",
  agents: "Agent 控制台",
};

export const TAB_DESCRIPTIONS: Record<TabKey, string> = {
  overview: "健康度儀表板與重要數據",
  quality: "QuestionQualityIssue 待處理項目",
  reports: "使用者回報與 SLA 追蹤",
  "spot-check": "隨機題目人工抽查",
  audit: "AI 內容審核佇列",
  marketing: "行銷部 — SEO / 社群 / EDM / 分析",
  agents: "Agent Teams 手動觸發與執行歷史",
};
