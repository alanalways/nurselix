/** Shared types for command-center tabs */
export type TabKey =
  | "overview"
  | "quality"
  | "reports"
  | "spot-check"
  | "audit"
  | "marketing"
  | "agents"
  | "users"
  | "toeic"
  | "vocab"
  | "analytics";

export const TAB_LABELS: Record<TabKey, string> = {
  overview: "總覽",
  quality: "品質",
  reports: "回報",
  "spot-check": "抽查",
  audit: "審核",
  marketing: "行銷部",
  agents: "Agent 控制台",
  users: "使用者",
  toeic: "TOEIC",
  vocab: "詞庫",
  analytics: "數據",
};

export const TAB_DESCRIPTIONS: Record<TabKey, string> = {
  overview: "健康度儀表板與重要數據",
  quality: "QuestionQualityIssue 待處理項目",
  reports: "使用者回報與 SLA 追蹤",
  "spot-check": "隨機題目人工抽查",
  audit: "AI 內容審核佇列",
  marketing: "行銷部 — SEO / 社群 / EDM / 分析",
  agents: "Agent Teams 手動觸發與執行歷史",
  users: "讀者管理 — 訂閱方案、權限、活躍度",
  toeic: "TOEIC 題庫 — Part 1-7 題目與聽力 TTS",
  vocab: "單字詞庫 — 種子任務、單字 CRUD",
  analytics: "數據分析 — domain 錯誤率、活躍度、API 費用",
};
