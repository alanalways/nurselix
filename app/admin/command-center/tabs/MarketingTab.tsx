"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Megaphone, Check, X, Send, FileText, MessageSquare, Mail, BarChart3 } from "lucide-react";
import Badge from "@/components/ui/Badge";

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
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <div className="font-semibold mb-3 flex items-center gap-2"><Megaphone size={18} /> 手動產生內容（用 NIM agent）</div>
        <div className="flex flex-wrap gap-2">
          {[
            { task: "social_x", label: "X 社群貼文" },
            { task: "social_ig", label: "IG 貼文" },
            { task: "seo_article", label: "SEO 部落格" },
            { task: "analytics", label: "行銷分析" },
            { task: "email", label: "EDM 草稿" },
          ].map(({ task, label }) => (
            <button key={task} onClick={() => triggerRun(task)} disabled={running !== null}
              className="px-3 py-2 border rounded hover:bg-gray-50 text-sm disabled:opacity-50 flex items-center gap-1">
              {running === task ? <Loader2 className="animate-spin" size={14} /> : null}
              產生：{label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-3 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600">類型</span>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="all">全部</option>
          <option value="SEO_ARTICLE">SEO 文章</option>
          <option value="SOCIAL_POST">社群貼文</option>
          <option value="EMAIL">EDM</option>
          <option value="AD_COPY">廣告/分析</option>
        </select>
        <span className="text-sm text-gray-600 ml-2">狀態</span>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="draft">草稿</option>
          <option value="approved">已核准</option>
          <option value="published">已發布</option>
          <option value="archived">已封存</option>
          <option value="all">全部</option>
        </select>
        <button onClick={load} className="ml-auto px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> 重新整理
        </button>
      </div>

      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="grid gap-3">
          {items.length === 0 && <div className="text-gray-500 bg-white border rounded-lg p-8 text-center">尚無內容</div>}
          {items.map(it => {
            const Icon = TYPE_ICON[it.contentType] || FileText;
            return (
              <div key={it.id} id={it.id} className="border rounded-lg p-4 bg-white hover:shadow">
                <div className="flex items-start gap-3">
                  <Icon size={20} className="text-gray-500 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge>{it.contentType}</Badge>
                      {it.platform && <Badge>{it.platform}</Badge>}
                      <Badge>{it.status}</Badge>
                      {it.modelUsed && <span className="text-xs text-gray-500">{it.modelUsed}</span>}
                    </div>
                    <div className="font-semibold">{it.title || "(無標題)"}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(it.generatedAt).toLocaleString("zh-TW")}</div>
                    <div className="text-sm mt-2 text-gray-700 whitespace-pre-wrap line-clamp-3">
                      {it.body.slice(0, 300)}{it.body.length > 300 ? "..." : ""}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setOpenItem(it)} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">展開</button>
                    {it.status === "draft" && (
                      <>
                        <button onClick={() => updateStatus(it.id, "approved")}
                          className="text-sm px-2 py-1 border rounded text-emerald-600 hover:bg-emerald-50 flex items-center gap-1">
                          <Check size={12} /> 核准
                        </button>
                        <button onClick={() => updateStatus(it.id, "archived")}
                          className="text-sm px-2 py-1 border rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                          <X size={12} /> 封存
                        </button>
                      </>
                    )}
                    {it.status === "approved" && (
                      <button onClick={() => updateStatus(it.id, "published")}
                        className="text-sm px-2 py-1 border rounded text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                        <Send size={12} /> 發布
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpenItem(null)}>
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">{openItem.title}</h2>
              <button onClick={() => setOpenItem(null)}><X /></button>
            </div>
            <pre className="whitespace-pre-wrap text-sm">{openItem.body}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
