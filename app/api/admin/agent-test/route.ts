/**
 * POST /api/admin/agent-test
 *
 * Quick smoke test for an agent + web_search combo. Lets you verify that
 * a NIM model can actually browse the internet via the webSearch tool.
 *
 * Body: { question: string, model?: string }
 *   question: what to ask the agent
 *   model:    NIM model id, defaults to OPS_MODEL env or the client default
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { runAgentLoop } from "@/lib/ops/agentLoop";
import { webSearch, webSearchProviderStatus } from "@/lib/agents/tools/webSearch";
import { OPS_MODEL } from "@/lib/ops/client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  question: z.string().min(2).max(500),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  let body: any = {};
  try { body = await req.json(); } catch {}
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { question, model } = parsed.data;
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NVIDIA_NIM_API_KEY not set" }, { status: 500 });

  const llm = new ChatOpenAI({
    model: model || OPS_MODEL,
    apiKey,
    configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
    temperature: 0.2,
    maxRetries: 0,
    timeout: 60_000,
  });

  const SYSTEM = `你是測試 agent。使用者問你問題時，如果需要查當下的網路資訊（最新指引、藥物警告、新聞、未來事件等），就呼叫 web_search 工具搜尋。如果問題本身不需要網路，直接回答。回答用繁體中文。`;

  const start = Date.now();
  try {
    const { summary, toolResults } = await runAgentLoop({
      llm,
      tools: [webSearch],
      systemPrompt: SYSTEM,
      userPrompt: question,
      maxSteps: 4,
      budgetMs: 90_000,
    });
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - start,
      model: model || OPS_MODEL,
      providerStatus: webSearchProviderStatus(),
      summary,
      toolCalls: toolResults.web_search ?? [],
      toolCallCount: (toolResults.web_search ?? []).length,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || String(e),
      durationMs: Date.now() - start,
    }, { status: 500 });
  }
}
