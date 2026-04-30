/**
 * CTO Agent — scans code quality and flags engineering risks.
 *
 * Tools:
 *   - run_type_check        (TypeScript)
 *   - run_lint_check        (ESLint via `next lint`)
 *   - get_error_queue_stats (questions students get wrong most often)
 */
import { createOpsLLM } from "@/lib/ops/client";
import { runAgentLoop } from "@/lib/ops/agentLoop";
import { runTypeCheck, runLintCheck, getErrorQueueStats } from "@/lib/ops/tools";

const TOOLS = [runTypeCheck, runLintCheck, getErrorQueueStats];

const SYSTEM = `你是 Nurselix 的 CTO（技術長），負責監控題庫品質與系統健康度。

你的任務：
1. 呼叫 run_type_check 取得開放品質 issue 與 critical 數量、agent 在過去 24h 的修補次數
2. 呼叫 run_lint_check 取得今日 QualityHealthReport（health score、最高的規則命中）
3. 呼叫 get_error_queue_stats 找出錯誤率最高的題目（代表內容或邏輯可能有問題）
4. 根據以上結果，用繁體中文撰寫系統技術健康報告

報告格式：
## 🔧 系統健康度報告
### 品質 issue 概況
### 今日 health score 與熱門規則
### 高錯誤率題目
### 技術債建議（如有）

請務必實際呼叫工具取得資料，不要捏造任何數字。`;

const USER = "請立即開始執行程式碼品質掃描，依序呼叫工具後輸出完整報告。";

export interface CtoReport {
  typeCheckOk: boolean;
  typeErrors: string[];
  lintOk: boolean;
  lintIssues: unknown[];
  highErrorQuestions: unknown[];
  summary: string;
}

export async function runCtoAgent(): Promise<CtoReport> {
  const llm = createOpsLLM({ temperature: 0.1 });

  const { summary, toolResults } = await runAgentLoop({
    llm,
    tools: TOOLS,
    systemPrompt: SYSTEM,
    userPrompt: USER,
  });

  const typeData = toolResults["run_type_check"]?.[0] as
    | { ok: boolean; errors: string[] }
    | undefined;
  const lintData = toolResults["run_lint_check"]?.[0] as
    | { ok: boolean; issues: unknown[] }
    | undefined;
  const errorQData = toolResults["get_error_queue_stats"]?.[0] as
    | { questions: unknown[] }
    | undefined;

  return {
    typeCheckOk: typeData?.ok ?? true,
    typeErrors: typeData?.errors ?? [],
    lintOk: lintData?.ok ?? true,
    lintIssues: lintData?.issues ?? [],
    highErrorQuestions: errorQData?.questions ?? [],
    summary,
  };
}
