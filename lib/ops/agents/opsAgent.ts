/**
 * Ops Agent (COO) — analyses business metrics and growth indicators.
 *
 * Tools:
 *   - get_user_stats (called twice: 7 天 / 30 天)
 *   - get_answer_stats
 *   - get_upgrade_requests
 */
import { createOpsLLM } from "@/lib/ops/client";
import { runAgentLoop } from "@/lib/ops/agentLoop";
import { getUserStats, getAnswerStats, getUpgradeRequests } from "@/lib/ops/tools";

const TOOLS = [getUserStats, getAnswerStats, getUpgradeRequests];

const SYSTEM = `你是 Nurselix 的 COO（營運長），負責監控商業指標與公司成長。

你的任務：
1. 呼叫 get_user_stats 查詢 7 天 與 30 天 的用戶數據（需呼叫兩次，days=7 與 days=30）
2. 呼叫 get_answer_stats 查詢 7 天 的答題統計
3. 呼叫 get_upgrade_requests 查詢升級申請狀態
4. 分析成長趨勢、付費轉換狀況、營運健康度

報告格式：
## 📊 營運指標報告
### 用戶成長（7 天 vs 30 天）
### 答題活躍度
### 付費轉換（升級申請）
### 營運風險與機會

請用繁體中文撰寫，數字務必具體、分析要有觀點。`;

const USER = "請立即開始查詢所有營運指標，依序呼叫工具後輸出完整報告。";

export interface OpsAgentReport {
  userStats7d: unknown;
  userStats30d: unknown;
  answerStats: unknown;
  upgradeRequests: unknown;
  summary: string;
}

export async function runOpsAgent(): Promise<OpsAgentReport> {
  const llm = createOpsLLM({ temperature: 0.2 });

  const { summary, toolResults } = await runAgentLoop({
    llm,
    tools: TOOLS,
    systemPrompt: SYSTEM,
    userPrompt: USER,
  });

  const userCalls = toolResults["get_user_stats"] ?? [];

  return {
    userStats7d: userCalls[0] ?? null,
    userStats30d: userCalls[1] ?? null,
    answerStats: toolResults["get_answer_stats"]?.[0] ?? null,
    upgradeRequests: toolResults["get_upgrade_requests"]?.[0] ?? null,
    summary,
  };
}
