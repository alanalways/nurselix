/**
 * Supervisor Agent (CEO) — receives the three sub-agent reports and
 * synthesises a single executive summary in Traditional Chinese.
 *
 * No tools; pure text synthesis.
 */
import { createOpsLLM } from "@/lib/ops/client";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { CtoReport } from "./ctoAgent";
import type { PmReport } from "./pmAgent";
import type { OpsAgentReport } from "./opsAgent";

const SYSTEM = `你是 Nurselix 的 CEO（執行長）。你剛收到三位直屬主管（CTO、PM、COO）的週報。

你的任務：整合三份報告，撰寫一份給自己看的執行長週報。

格式要求：
# Nurselix 週報 {date}

## 🚦 整體狀態
（一句話：公司本週整體狀況 — 綠燈／黃燈／紅燈，並說明理由）

## 🔑 本週最重要的 3 件事
1.
2.
3.

## 🔧 技術面（CTO 摘要）
## 📱 產品面（PM 摘要）
## 📊 營運面（COO 摘要）

## ⚡ 需要立即處理
（列出任何需要今天／本週處理的緊急事項）

## 下週重點方向
（1–3 條）

語言：繁體中文，簡潔有力，避免廢話。`;

export async function runSupervisorAgent(
  ctoReport: CtoReport,
  pmReport: PmReport,
  opsReport: OpsAgentReport
): Promise<string> {
  const llm = createOpsLLM({ temperature: 0.3 });

  const today = new Date().toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const userMsg = `以下是三位主管的報告：

=== CTO 報告 ===
${ctoReport.summary}

=== PM 報告 ===
${pmReport.summary}

=== COO 報告 ===
${opsReport.summary}

今天日期：${today}

請整合以上三份報告，撰寫執行長週報。`;

  const response = await llm.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(userMsg),
  ]);

  return String(response.content ?? "");
}
