/**
 * Shared agentic tool-calling loop.
 *
 * Given an LLM and a set of tools, this runs the standard loop:
 *   invoke → collect tool_calls → run tools → push results → invoke again
 * until the model stops requesting tools.
 *
 * Returns the final assistant content plus a map of tool name → result list
 * (kept in call order, so repeated calls to the same tool are preserved).
 */
import { HumanMessage, SystemMessage, ToolMessage, AIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// LangChain tools have parameterised types that don't resolve to a single
// callable signature. For a generic dispatcher we use a structural alias.
interface ToolLike {
  name: string;
  invoke: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentLoopResult {
  summary: string;
  toolResults: Record<string, unknown[]>;
}

export async function runAgentLoop(opts: {
  // Accepts any LangChain chat model that supports `bindTools` — both
  // ChatGoogleGenerativeAI and ChatOpenAI (for NVIDIA NIM) do.
  llm: BaseChatModel;
  // LangChain `DynamicStructuredTool`s carry schema generics that don't unify
  // across heterogeneous tool arrays, so we accept `unknown[]` at the boundary
  // and narrow internally.
  tools: readonly unknown[];
  systemPrompt: string;
  userPrompt: string;
  maxSteps?: number;
  // Hard wall-clock budget (ms). When exceeded, the loop returns the latest
  // assistant content even if more tool calls were requested. Defaults to
  // 90s — enough for 4-5 tool rounds at 60s/call avg, fits inside the 5-min
  // Zeabur HTTP budget when 4 agents run sequentially in cron-ops.
  budgetMs?: number;
}): Promise<AgentLoopResult> {
  const { llm, tools, systemPrompt, userPrompt, maxSteps = 6, budgetMs = 90_000 } = opts;
  const deadline = Date.now() + budgetMs;
  const toolsTyped = tools as unknown as ToolLike[];
  if (typeof llm.bindTools !== "function") {
    throw new Error("This chat model does not support tool binding.");
  }
  const llmWithTools = llm.bindTools(tools as never);

  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ];

  const toolResults: Record<string, unknown[]> = {};
  let response = (await llmWithTools.invoke(messages)) as AIMessage;

  for (let step = 0; step < maxSteps; step++) {
    if (Date.now() > deadline) {
      console.log(`[agentLoop] budget ${budgetMs}ms exceeded at step ${step}, stopping early`);
      break;
    }
    const calls = response.tool_calls;
    if (!calls || calls.length === 0) break;

    messages.push(response);

    for (const call of calls) {
      const t = toolsTyped.find((x) => x.name === call.name);
      const raw = t
        ? await t.invoke(call.args as Record<string, unknown>)
        : `Tool ${call.name} not found.`;
      const resultStr = typeof raw === "string" ? raw : JSON.stringify(raw);

      // Record parsed result for the caller (best-effort JSON parse).
      if (!toolResults[call.name]) toolResults[call.name] = [];
      try {
        toolResults[call.name].push(JSON.parse(resultStr));
      } catch {
        toolResults[call.name].push(resultStr);
      }

      messages.push(
        new ToolMessage({
          content: resultStr,
          tool_call_id: call.id ?? "",
          name: call.name,
        })
      );
    }

    response = (await llmWithTools.invoke(messages)) as AIMessage;
  }

  return {
    summary: String(response.content ?? ""),
    toolResults,
  };
}
