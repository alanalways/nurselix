"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Check, X, Send, FileText, MessageSquare, Mail, BarChart3, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SectionLabel, MetaText, JournalCta, Pill, FONT_DISPLAY, FONT_ZH, FONT_MONO } from "./journal-ui";

interface Item {
  id: string;
  contentType: string;
  platform?: string;
  title?: string;
  body: string;
  status: string;
  modelUsed?: string;
  generatedAt: string;
  publishedUrl?: string;
}

const TYPE_ICON: Record<string, any> = {
  SEO_ARTICLE: FileText,
  SOCIAL_POST: MessageSquare,
  EMAIL: Mail,
  AD_COPY: BarChart3,
  LANDING_COPY: Megaphone,
};

const SELECT_CLS = "border border-[var(--j-line)] bg-transparent text-[var(--j-ink)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--j-phosphor)]";

export default function MarketingTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("draft");
  const [running, setRunning] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("contentType", filter);
      params.set("status", statusFilter);
      const res = await fetch(`/api/admin/marketing?${params}`, { cache: "no-store" });
      const j = await res.json();
      setItems(j.items || []);
    } finally { setLoading(false); }
  }, [filter, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const triggerRun = async (task: string) => {
    setRunning(task);
    try {
      const r = await fetch("/api/admin/marketing/run", {
        method: "POST",
        body: JSON.stringify({ task }),
        headers: { "Content-Type": "application/json" },
      });
      const j = await r.json();
      if (!r.ok) alert("產生失敗：" + (j.error || r.status));
      else await load();
    } finally { setRunning(null); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/marketing/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      headers: { "Content-Type": "application/json" },
    });
    await load();
  };

  return (
    <div className="space-y-6">
      {/* Generation row */}
      <div className="border-y border-[var(--j-line)] py-4">
        <SectionLabel className="mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--j-phosphor)]" /> Press · 手動產生內容（NIM agents）
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          {[
            { task: "social_x", label: "X post" },
            { task: "social_ig", label: "IG post" },
            { task: "seo_article", label: "SEO article" },
            { task: "analytics", label: "Analytics" },
            { task: "email", label: "EDM draft" },
          ].map(({ task, label }) => (
            <button key={task} onClick={() => triggerRun(task)} disabled={running !== null}
              className="px-3 py-2 text-sm italic border border-[var(--j-line)] text-[var(--j-ink-dim)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] disabled:opacity-50 transition flex items-center gap-1"
              style={FONT_DISPLAY}>
              {running === task ? <Loader2 className="animate-spin" size={13} /> : null}
              compose: {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>filter</span>
        <select value={filter} onChange={e => setFilter(e.target.value)} className={SELECT_CLS} style={FONT_MONO}>
          <option value="all">全部</option>
          <option value="SEO_ARTICLE">SEO 文章</option>
          <option value="SOCIAL_POST">社群貼文</option>
          <option value="EMAIL">EDM</option>
          <option value="AD_COPY">廣告/分析</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={SELECT_CLS} style={FONT_MONO}>
          <option value="draft">草稿</option>
          <option value="approved">已核准</option>
          <option value="published">已發布</option>
          <option value="archived">已封存</option>
          <option value="all">全部</option>
        </select>
        <button onClick={load} className="ml-auto text-sm text-[var(--j-ink-dim)] hover:text-[var(--j-phosphor)] flex items-center gap-1 transition" style={FONT_MONO}>
          <RefreshCw size={13} /> refresh
        </button>
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center gap-2 text-[var(--j-ink-dim)] py-4 italic" style={FONT_DISPLAY}>
          <Loader2 className="animate-spin text-[var(--j-phosphor)]" size={18} /> Reading the press proofs…
        </div>
      ) : items.length === 0 ? (
        <div className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-12 text-center italic text-[var(--j-ink-dim)]" style={FONT_DISPLAY}>
          — No drafts in the press room yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(it => {
            const Icon = TYPE_ICON[it.contentType] || FileText;
            return (
              <article key={it.id} id={it.id} className="border border-[var(--j-line)] bg-[var(--j-bg-card)] p-5 hover:border-[var(--j-phosphor)] transition">
                <div className="flex items-start gap-4">
                  <Icon size={20} className="text-[var(--j-ink-muted)] mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Pill>{it.contentType}</Pill>
                      {it.platform && <Pill tone="muted">{it.platform}</Pill>}
                      <Pill tone={it.status === "published" ? "phosphor" : it.status === "approved" ? "neutral" : "muted"}>{it.status}</Pill>
                      {it.modelUsed && <MetaText>{it.modelUsed}</MetaText>}
                    </div>
                    <div className="italic text-[var(--j-ink)] text-lg mb-1" style={FONT_DISPLAY}>{it.title || "(無標題)"}</div>
                    <MetaText className="block mb-2">{new Date(it.generatedAt).toLocaleString("zh-TW")}</MetaText>
                    <div className="text-sm text-[var(--j-ink-dim)] whitespace-pre-wrap line-clamp-3" style={FONT_ZH}>
                      {it.body.slice(0, 300)}{it.body.length > 300 ? "…" : ""}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => setOpenItem(it)}
                      className="px-3 py-1.5 text-xs italic text-[var(--j-ink-dim)] border border-[var(--j-line)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)] transition"
                      style={FONT_DISPLAY}>
                      read full
                    </button>
                    {it.status === "draft" && (
                      <>
                        <button onClick={() => updateStatus(it.id, "approved")}
                          className="px-3 py-1.5 text-xs italic text-[var(--j-phosphor)] border border-[var(--j-phosphor-line)] hover:bg-[var(--j-phosphor-soft)] flex items-center gap-1 transition"
                          style={FONT_DISPLAY}>
                          <Check size={12} /> approve
                        </button>
                        <button onClick={() => updateStatus(it.id, "archived")}
                          className="px-3 py-1.5 text-xs italic text-[var(--j-ink-muted)] border border-[var(--j-line)] hover:text-[var(--j-ink)] flex items-center gap-1 transition"
                          style={FONT_DISPLAY}>
                          <X size={12} /> archive
                        </button>
                      </>
                    )}
                    {it.status === "approved" && (
                      <button onClick={() => updateStatus(it.id, "published")}
                        className="px-3 py-1.5 text-xs italic text-[var(--j-ink)] border border-[var(--j-ink)] hover:bg-[var(--j-ink)] hover:text-[var(--j-bg)] flex items-center gap-1 transition"
                        style={FONT_DISPLAY}>
                        <Send size={12} /> publish
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Reading modal */}
      {openItem && (
        <div className="fixed inset-0 bg-[var(--j-ink)]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setOpenItem(null)}>
          <div className="bg-[var(--j-bg-card)] border border-[var(--j-line-strong)] p-8 max-w-3xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--j-line)]">
              <h2 className="italic text-2xl text-[var(--j-ink)]" style={FONT_DISPLAY}>{openItem.title}</h2>
              <button onClick={() => setOpenItem(null)} className="text-[var(--j-ink-dim)] hover:text-[var(--j-ink)]">
                <X size={20} />
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-[var(--j-ink)] leading-[1.8]" style={FONT_ZH}>{openItem.body}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
