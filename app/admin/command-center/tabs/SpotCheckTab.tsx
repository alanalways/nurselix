"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Shuffle, Flag, Eye, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface Q {
  id: string;
  stem: string;
  stemZh?: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  optionE?: string;
  correctAnswer: string;
  correctAnswers?: string[];
  explanationZh?: string;
  domain?: string;
  difficulty?: string;
  createdBy?: string;
}

export default function SpotCheckTab() {
  const [n, setN] = useState(20);
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flagged, setFlagged] = useState<Record<string, string>>({}); // id → note

  const sample = async () => {
    setLoading(true);
    setQuestions([]);
    setIdx(0);
    setShowAnswer(false);
    try {
      const params = new URLSearchParams();
      params.set("n", String(n));
      if (domain) params.set("domain", domain);
      if (difficulty) params.set("difficulty", difficulty);
      if (createdBy) params.set("createdBy", createdBy);
      const r = await fetch(`/api/admin/questions/sample?${params}`, { cache: "no-store" });
      const j = await r.json();
      setQuestions(j.sample || []);
    } finally { setLoading(false); }
  };

  const flag = (id: string, note?: string) => setFlagged(prev => ({ ...prev, [id]: note || "flagged" }));
  const unflag = (id: string) => setFlagged(prev => { const n = { ...prev }; delete n[id]; return n; });

  const exportFlagged = () => {
    const flaggedQs = questions.filter(q => flagged[q.id]);
    const csv = ["id,stem,domain,difficulty,note", ...flaggedQs.map(q => `${q.id},"${q.stem.replace(/"/g, '""').slice(0,100)}",${q.domain || ""},${q.difficulty || ""},"${flagged[q.id]}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `spot-check-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const q = questions[idx];

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="font-semibold">抽樣設定</div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm flex items-center gap-1">
            樣本數
            <select value={n} onChange={e => setN(Number(e.target.value))} className="border rounded px-2 py-1">
              <option value={10}>10</option><option value={20}>20</option>
              <option value={50}>50</option><option value={100}>100</option>
            </select>
          </label>
          <input type="text" placeholder="domain" value={domain} onChange={e => setDomain(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-40" />
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">所有難度</option>
            <option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option>
          </select>
          <input type="text" placeholder="createdBy" value={createdBy} onChange={e => setCreatedBy(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-40" />
          <button onClick={sample} disabled={loading}
            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1 text-sm disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Shuffle size={14} />} 抽樣
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-gray-500 bg-white border rounded-lg p-8 text-center">
          設定條件後按「抽樣」開始
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">{idx + 1} / {questions.length}</div>
            <div className="flex gap-2">
              <button onClick={() => { setIdx(Math.max(0, idx - 1)); setShowAnswer(false); }} disabled={idx === 0}
                className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={14} /></button>
              <button onClick={() => { setIdx(Math.min(questions.length - 1, idx + 1)); setShowAnswer(false); }} disabled={idx === questions.length - 1}
                className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight size={14} /></button>
            </div>
          </div>

          {q && (
            <>
              <div className="flex flex-wrap gap-2">
                {q.domain && <Badge>{q.domain}</Badge>}
                {q.difficulty && <Badge>{q.difficulty}</Badge>}
                <span className="text-xs text-gray-500">{q.id.slice(0, 8)}</span>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">題幹</div>
                <div className="text-sm">{q.stem}</div>
                {q.stemZh && <div className="text-sm text-gray-600 mt-1">{q.stemZh}</div>}
              </div>
              <div className="space-y-1">
                {[["A", q.optionA], ["B", q.optionB], ["C", q.optionC], ["D", q.optionD], ...(q.optionE ? [["E", q.optionE]] : [])].map(([k, v]) => (
                  <div key={k} className={`text-sm p-2 rounded border ${showAnswer && q.correctAnswer.includes(k as string) ? "bg-emerald-50 border-emerald-300" : "bg-gray-50"}`}>
                    <span className="font-semibold mr-2">{k}.</span> {v}
                  </div>
                ))}
              </div>
              {showAnswer ? (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                  <div className="font-semibold">正確答案：{q.correctAnswer}</div>
                  {q.explanationZh && <div className="mt-2 text-gray-700 whitespace-pre-wrap">{q.explanationZh}</div>}
                </div>
              ) : (
                <button onClick={() => setShowAnswer(true)} className="text-sm text-blue-600 hover:underline">顯示答案與解析</button>
              )}
              <div className="flex items-center gap-2 pt-2 border-t">
                {flagged[q.id] ? (
                  <button onClick={() => unflag(q.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm flex items-center gap-1">
                    <Flag size={14} fill="currentColor" /> 已標記（取消）
                  </button>
                ) : (
                  <button onClick={() => {
                    const note = prompt("為何標記？") || "flagged";
                    flag(q.id, note);
                  }} className="px-3 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50 text-sm flex items-center gap-1">
                    <Flag size={14} /> 標記為可疑
                  </button>
                )}
                <Link href={`/admin/questions/${q.id}`} target="_blank"
                  className="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-sm">
                  <Eye size={14} /> 編輯
                </Link>
                <span className="ml-auto text-xs text-gray-500">已標記 {Object.keys(flagged).length} 題</span>
                {Object.keys(flagged).length > 0 && (
                  <button onClick={exportFlagged} className="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1 text-sm">
                    <Download size={14} /> 匯出 CSV
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
