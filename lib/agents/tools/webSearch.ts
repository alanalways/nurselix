/**
 * webSearch — gives NIM-hosted agents the ability to read fresh web data.
 *
 * NIM models don't browse the internet. Without this tool, agents can only
 * reason over their training cutoff. We expose a single LangChain tool that
 * agents call when they need current information (drug warnings, NCLEX 2024
 * guideline updates, regulatory changes, news, etc.).
 *
 * Provider chain (auto-detected by env):
 *   1. Tavily (preferred) — TAVILY_API_KEY. LLM-optimised, returns
 *      ranked markdown summaries instead of raw HTML.
 *   2. Brave Search    — BRAVE_SEARCH_API_KEY. Free 2k/month.
 *   3. Serper.dev      — SERPER_API_KEY. Google results, free 2.5k/month.
 *   4. DuckDuckGo HTML — no key needed. Last-resort fallback; the result is
 *      lower quality and more likely to be rate-limited.
 *
 * To enable Tavily (recommended):
 *   1. tavily.com → get a key (1000 free queries / month)
 *   2. Add TAVILY_API_KEY=tvly-... to Zeabur env on the relevant service
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const TAVILY_KEY = process.env.TAVILY_API_KEY;
const BRAVE_KEY  = process.env.BRAVE_SEARCH_API_KEY;
const SERPER_KEY = process.env.SERPER_API_KEY;

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchResponse {
  ok: boolean;
  provider: "tavily" | "brave" | "serper" | "duckduckgo" | "none";
  query: string;
  answer?: string;            // Tavily-only: pre-synthesised summary
  results: SearchResult[];
  error?: string;
}

async function searchTavily(query: string, maxResults: number): Promise<SearchResponse> {
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: true,
      include_raw_content: false,
    }),
  });
  if (!r.ok) return { ok: false, provider: "tavily", query, results: [], error: `HTTP ${r.status}` };
  const j = await r.json();
  return {
    ok: true,
    provider: "tavily",
    query,
    answer: j.answer,
    results: (j.results || []).map((x: any) => ({ title: x.title, url: x.url, snippet: x.content })),
  };
}

async function searchBrave(query: string, maxResults: number): Promise<SearchResponse> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));
  const r = await fetch(url, {
    headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_KEY! },
  });
  if (!r.ok) return { ok: false, provider: "brave", query, results: [], error: `HTTP ${r.status}` };
  const j = await r.json();
  return {
    ok: true,
    provider: "brave",
    query,
    results: (j.web?.results || []).slice(0, maxResults).map((x: any) => ({
      title: x.title, url: x.url, snippet: x.description,
    })),
  };
}

async function searchSerper(query: string, maxResults: number): Promise<SearchResponse> {
  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": SERPER_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: maxResults }),
  });
  if (!r.ok) return { ok: false, provider: "serper", query, results: [], error: `HTTP ${r.status}` };
  const j = await r.json();
  return {
    ok: true,
    provider: "serper",
    query,
    results: (j.organic || []).slice(0, maxResults).map((x: any) => ({
      title: x.title, url: x.link, snippet: x.snippet,
    })),
  };
}

async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResponse> {
  // The HTML endpoint returns server-rendered results we scrape lightly.
  // Lower quality but no API key required.
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NurslixAgent/1.0)" },
  });
  if (!r.ok) return { ok: false, provider: "duckduckgo", query, results: [], error: `HTTP ${r.status}` };
  const html = await r.text();
  // crude regex parse — DDG html layout: <a class="result__a" href="...">title</a>
  // followed by <a class="result__snippet">snippet</a>
  const blocks = html.split(/<div\s+class="result\s+results_links/).slice(1, maxResults + 1);
  const results = blocks.map((b) => {
    const titleMatch = b.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)</);
    const snippetMatch = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const url = titleMatch?.[1] || "";
    const title = (titleMatch?.[2] || "").replace(/\s+/g, " ").trim();
    const snippet = (snippetMatch?.[1] || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
    return { title, url, snippet };
  }).filter((r) => r.title && r.url);
  return { ok: true, provider: "duckduckgo", query, results };
}

async function performSearch(query: string, maxResults: number): Promise<SearchResponse> {
  if (TAVILY_KEY) {
    const r = await searchTavily(query, maxResults);
    if (r.ok) return r;
    // fall through on failure
  }
  if (BRAVE_KEY) {
    const r = await searchBrave(query, maxResults);
    if (r.ok) return r;
  }
  if (SERPER_KEY) {
    const r = await searchSerper(query, maxResults);
    if (r.ok) return r;
  }
  // last resort
  return searchDuckDuckGo(query, maxResults);
}

/**
 * Format a SearchResponse into a compact markdown string the LLM can read.
 * Trims to roughly 2KB so it doesn't blow up the agent's context budget.
 */
function formatResults(r: SearchResponse): string {
  if (!r.ok) return `Search failed (${r.provider}): ${r.error}`;
  const lines: string[] = [];
  lines.push(`Search results for: "${r.query}" (via ${r.provider})`);
  if (r.answer) lines.push(`\n**Answer summary**: ${r.answer.slice(0, 500)}`);
  lines.push("");
  if (r.results.length === 0) {
    lines.push("(no results)");
  } else {
    for (let i = 0; i < r.results.length; i++) {
      const x = r.results[i];
      lines.push(`${i + 1}. **${x.title}**`);
      lines.push(`   ${x.url}`);
      lines.push(`   ${x.snippet.slice(0, 220)}`);
      lines.push("");
    }
  }
  return lines.join("\n").slice(0, 2200);
}

/**
 * The actual LangChain tool — bind this into agents that need internet access.
 * Example use:
 *   import { webSearch } from "@/lib/agents/tools/webSearch";
 *   const TOOLS = [...existingTools, webSearch];
 */
export const webSearch = tool(
  async ({ query, max_results }: { query: string; max_results?: number }) => {
    const n = Math.max(1, Math.min(10, max_results ?? 5));
    try {
      const r = await performSearch(query, n);
      return formatResults(r);
    } catch (e: any) {
      return `Search error: ${e?.message || e}`;
    }
  },
  {
    name: "web_search",
    description:
      "Search the public internet for fresh information. Use this when you need current data the model can't know from training (recent guidelines, drug warnings, NCLEX policy updates, news, etc.). Returns a markdown list of titles + URLs + snippets, plus an answer summary if the provider supports it.",
    schema: z.object({
      query: z.string().min(2).max(400).describe("The search query in natural language"),
      max_results: z.number().int().min(1).max(10).optional().describe("How many results to return (default 5)"),
    }),
  }
);

/** Quick provider-status check used by health probes. */
export function webSearchProviderStatus(): { active: string; configured: string[] } {
  const configured: string[] = [];
  if (TAVILY_KEY) configured.push("tavily");
  if (BRAVE_KEY) configured.push("brave");
  if (SERPER_KEY) configured.push("serper");
  configured.push("duckduckgo"); // always available
  return { active: configured[0], configured };
}
