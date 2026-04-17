/** Calculate Claude API cost in USD from token usage. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export function calcCostUsd(model: string, usage: TokenUsage): number {
  const { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens } = usage;
  if (model.includes("haiku")) {
    return (inputTokens / 1_000_000) * 1.00
         + (outputTokens / 1_000_000) * 5.00
         + (cacheReadTokens / 1_000_000) * 0.10
         + (cacheWriteTokens / 1_000_000) * 1.25;
  }
  if (model.includes("sonnet")) {
    return (inputTokens / 1_000_000) * 3.00
         + (outputTokens / 1_000_000) * 15.00
         + (cacheReadTokens / 1_000_000) * 0.30
         + (cacheWriteTokens / 1_000_000) * 3.75;
  }
  if (model.includes("opus")) {
    return (inputTokens / 1_000_000) * 15.00
         + (outputTokens / 1_000_000) * 75.00
         + (cacheReadTokens / 1_000_000) * 1.50
         + (cacheWriteTokens / 1_000_000) * 18.75;
  }
  return 0;
}
