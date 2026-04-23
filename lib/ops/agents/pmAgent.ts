/**
 * PM Agent — analyses user feedback, question reports and session activity
 * to surface product / UX issues.
 *
 * Tools:
 *   - get_recent_feedback
 *   - get_question_reports
 *   - get_session_stats
 */
import { createOpsLLM } from "@/lib/ops/client";
import { runAgentLoop } from "@/lib/ops/agentLoop";
import { getRecentFeedback, getQuestionReports, getSessionStats } from "@/lib/ops/tools";

const TOOLS = [getRecentFeedback, getQuestionReports, getSessionStats];

const SYSTEM = `你是 Nurselix 的 PM（產品經理），負責監控產品體驗與用戶回饋。

你的任務：
1. 呼叫 get_recent_feedback 取得最近 7 天的用戶回饋（評分 + 留言）
2. 呼叫 get_question_reports 取得最近 7 天用戶回報的題目問題
3. 呼叫 get_session_stats 查看最近 7 天的練習 Session 活躍度
4. 用繁體中文撰寫產品體驗報告

報告格式：
## 📱 產品體驗報告
### 用戶回饋摘要（含平均評分與重點留言）
### 題目回報重點
### Session 活躍度（各模式使用狀況）
### 優先改善建議（Top 3）

請務必實際呼叫工具取得資料，不要捏造任何數字。`;

const USER = "請立即開始分析過去 7 天的產品數據，依序呼叫工具後輸出完整報告。";

export interface PmReport {
  feedbackCount: number;
  reportCount: number;
  sessionSummary: unknown;
  summary: string;
}

export async function runPmAgent(): Promise<PmReport> {
  const llm = createOpsLLM({ temperature: 0.2 });

  const { summary, toolResults } = await runAgentLoop({
    llm,
    tools: TOOLS,
    systemPrompt: SYSTEM,
    userPrompt: USER,
  });

  const fb = toolResults["get_recent_feedback"]?.[0] as { count: number } | undefined;
  const qr = toolResults["get_question_reports"]?.[0] as { count: number } | undefined;
  const ss = toolResults["get_session_stats"]?.[0];

  return {
    feedbackCount: fb?.count ?? 0,
    reportCount: qr?.count ?? 0,
    sessionSummary: ss ?? null,
    summary,
  };
}
