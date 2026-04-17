/**
 * Master list of all Nurslix achievements.
 * Single source of truth used by both the seeder and the evaluator.
 */

export const ACHIEVEMENT_DEFS = [
  // Streak
  { key: "streak_3",          name: "三日連擊",      description: "連續答題 3 天",                    icon: "🔥" },
  { key: "streak_7",          name: "週榮譽",        description: "連續答題 7 天",                    icon: "🔥" },
  { key: "streak_30",         name: "月度之王",      description: "連續答題 30 天",                   icon: "👑" },
  { key: "streak_100",        name: "百日堅持",      description: "連續答題 100 天",                  icon: "👑" },

  // Cumulative answers
  { key: "first_hundred",     name: "百題達成",      description: "累計答題 100 題",                  icon: "🥇" },
  { key: "first_thousand",    name: "千題大師",      description: "累計答題 1,000 題",                icon: "🏆" },
  { key: "ten_thousand",      name: "萬題傳奇",      description: "累計答題 10,000 題",               icon: "🏆" },

  // Session-based
  { key: "first_session",     name: "踏出第一步",    description: "完成第一次練習",                   icon: "✨" },
  { key: "first_assessment",  name: "第一次評估",    description: "完成第一次 Assessment",            icon: "🧭" },
  { key: "first_cat_pass",    name: "CAT 通過",      description: "CAT 首次判定 PASS",                icon: "✨" },
  { key: "mock_perfect",      name: "Mock 高手",     description: "Mock 考試正確率 ≥ 90%",            icon: "🎯" },
  { key: "cat_master",        name: "CAT 常客",      description: "完成 10 次 CAT 測驗",              icon: "🧭" },
  { key: "perfectionist",     name: "完美主義",      description: "單次 10+ 題全對",                  icon: "⭐" },
  { key: "speed_star",        name: "飛快回答",      description: "平均答題 < 30 秒",                 icon: "⚡" },

  // Domain masters (80%+ accuracy in 30+ questions)
  { key: "pharma_master",     name: "藥理達人",      description: "Pharma 答對 80%+（30題）",         icon: "💊" },
  { key: "safety_master",     name: "安全守護",      description: "Safety 答對 80%+（30題）",         icon: "🚨" },
  { key: "management_master", name: "管理達人",      description: "Management 答對 80%+（30題）",     icon: "🛡️" },
  { key: "psychosocial_master", name: "心理專家",    description: "Psychosocial 答對 80%+（30題）",   icon: "🧠" },
  { key: "physiological_master", name: "生理大師",   description: "Physiological 答對 80%+（30題）",  icon: "❤️" },

  // Hermes AI / θ
  { key: "hermes_first",      name: "首次 AI 分析",  description: "收到第一份 Hermes 報告",           icon: "✨" },
  { key: "hermes_ten",        name: "AI 忠實用戶",   description: "累計 10 份 Hermes 分析",           icon: "🤖" },
  { key: "confidence_stable", name: "信心升級",      description: "信心水準升到 stable",              icon: "🚀" },
  { key: "confidence_high",   name: "高度信心",      description: "信心水準升到 high",                icon: "🌟" },
  { key: "theta_1",           name: "穩定及格",      description: "θ 達到 +1（通過機率高）",          icon: "📈" },
  { key: "theta_2",           name: "高手水準",      description: "θ 達到 +2（接近專家）",            icon: "🌟" },

  // Error book
  { key: "error_buster_50",   name: "錯題剋星",      description: "複習並答對 50 道錯題",             icon: "💪" },
] as const;

export type AchievementKey = typeof ACHIEVEMENT_DEFS[number]["key"];
