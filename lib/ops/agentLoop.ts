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
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import type { ChatGoogleGenerativeAI } from "@langchain/google-genai";

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
  llm: ChatGoogleGenerativeAI;
  // LangChain `DynamicStructuredTool`s carry schema generics that don't unify
  // across heterogeneous tool arrays, so we accept `unknown[]` at the boundary
  // and narrow internally.
  tools: readonly unknown[];
  systemPrompt: string;
  userPrompt: string;
  maxSteps?: number;
}): Promise<AgentLoopResult> {
  const { llm, tools, systemPrompt, userPrompt, maxSteps = 8 } = opts;
  const toolsTyped = tools as unknown as ToolLike[];
  // bindTools accepts the same array; cast once for the binding to sidestep
  // LangChain's union-of-generics input signature.
  const llmWithTools = llm.bindTools(tools as unknown as Parameters<typeof llm.bindTools>[0]);

  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ];

  const toolResults: Record<string, unknown[]> = {};
  let response = await llmWithTools.invoke(messages);

  for (let step = 0; step < maxSteps; step++) {
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

    response = await llmWithTools.invoke(messages);
  }

  return {
    summary: String(response.content ?? ""),
    toolResults,
  };
}
