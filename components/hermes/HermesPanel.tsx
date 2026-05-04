"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, ExternalLink } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citedUrls?: { url: string; title?: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the first message body will be pre-filled. Cleared after send. */
  initialDraft?: string;
  /** When set, attaches question context. */
  questionId?: string;
  attachQuestionContext?: boolean;
}

export default function HermesPanel({
  open,
  onClose,
  initialDraft,
  questionId,
  attachQuestionContext = true,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialDraft ?? "");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialDraft) setInput(initialDraft);
  }, [initialDraft]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: msg },
      { role: "assistant", content: "" },
    ]);
    setInput("");

    try {
      const res = await fetch("/api/hermes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId, questionId, attachQuestionContext }),
      });
      if (res.status === 429) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: `（已達每小時提問上限，請稍後再試）`,
          };
          return copy;
        });
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          if (!ev.startsWith("data: ")) continue;
          let payload: {
            kind: string;
            text?: string;
            sessionId?: string;
            citedUrls?: { url: string; title?: string }[];
            message?: string;
          };
          try {
            payload = JSON.parse(ev.slice(6));
          } catch {
            continue;
          }
          if (payload.kind === "text" && payload.text) {
            const chunk = payload.text;
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = {
                role: "assistant",
                content: copy[copy.length - 1].content + chunk,
                citedUrls: copy[copy.length - 1].citedUrls,
              };
              return copy;
            });
          } else if (payload.kind === "done") {
            if (payload.sessionId) setSessionId(payload.sessionId);
            const cited = payload.citedUrls;
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = {
                role: "assistant",
                content: copy[copy.length - 1].content,
                citedUrls: cited,
              };
              return copy;
            });
          }
        }
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `（連線錯誤：${(e as Error).message?.slice(0, 80)}）`,
        };
        return copy;
      });
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[400px] flex flex-col bg-[var(--j-bg)] border-l-2 border-[var(--j-line-strong)] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--j-line)]">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] tracking-[0.2em] uppercase text-[var(--j-phosphor)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ● HERMES
          </span>
          <span
            className="italic text-[var(--j-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            NCLEX 助教
          </span>
        </div>
        <button onClick={onClose} className="text-[var(--j-ink-dim)] hover:text-[var(--j-ink)]">
          <X size={18} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div
            className="text-sm italic text-[var(--j-ink-dim)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            問我任何 NCLEX 相關問題，我會用繁體中文回答，必要時會 google 最新資料。
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-8" : "mr-8"}>
            <div
              className="text-[10px] uppercase tracking-wider text-[var(--j-ink-dim)] mb-1"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {m.role === "user" ? "你" : "Hermes"}
            </div>
            <div
              className={`text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "text-[var(--j-ink)] bg-[var(--j-bg-card)] p-2 border border-[var(--j-line)]"
                  : "text-[var(--j-ink)]"
              }`}
              style={{ fontFamily: "var(--font-zh)" }}
            >
              {m.content || (
                m.role === "assistant" && (
                  <span className="text-[var(--j-ink-dim)] italic">…</span>
                )
              )}
            </div>
            {m.citedUrls && m.citedUrls.length > 0 && (
              <div className="mt-2 space-y-1">
                {m.citedUrls.slice(0, 5).map((u, j) => (
                  <a
                    key={j}
                    href={u.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[var(--j-phosphor)] hover:underline"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    <ExternalLink size={10} /> {u.title || u.url}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--j-line)] px-3 py-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="哪裡不懂？問我..."
          rows={2}
          className="flex-1 bg-transparent text-sm text-[var(--j-ink)] border border-[var(--j-line)] focus:border-[var(--j-phosphor)] focus:outline-none p-2 resize-none"
          style={{ fontFamily: "var(--font-zh)" }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="px-3 py-2 border border-[var(--j-phosphor-line)] text-[var(--j-phosphor)] hover:bg-[var(--j-phosphor-soft)] disabled:opacity-30"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
