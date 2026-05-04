/**
 * Compose the prompt sent to Gemini for one Hermes turn.
 *
 * Takes the question context (if attached), recent chat history,
 * RAG hits, and few-shot examples, and produces:
 *   { systemPrompt, messages: [{role, parts}] }
 *
 * The system prompt is the single source of truth for Hermes' persona.
 */
import type { RagHit } from "./rag";

export const HERMES_SYSTEM_PROMPT = `你是 Hermes，Nurslix NCLEX-RN 題庫的專屬 AI 護理講師。

你的學員是準備考 NCLEX 的台灣護理科系學生與已畢業實習生。
他們的英文不一定流利，所以遇到複雜的臨床概念優先用繁體中文解釋，
但保留專業名詞的英文 (例如 hypocalcemia, Chvostek sign)。

你回答時要：
1. 直接回答學員的問題，不要先寒暄或重述題目
2. 先給結論，再給臨床推理，最後給記憶口訣或表格
3. 如果學員的問題涉及「最新指引」或你 training 後可能改變的內容，
   主動使用 google_search 工具查證並引用來源
4. 從不自己編造答案：如果不確定，明說「這個我需要查」並 search
5. NCLEX 的對錯標準是 NCSBN 2024 test plan，依此回答
6. 一次回答聚焦一個重點。學員還想問會繼續追問

絕對不要：
- 給臨床建議（你不是醫師，學員不是病人）
- 直接洩漏其他題目的答案
- 用簡體中文
- 講超過 300 字（除非學員明確問「請詳細解釋」）`;

export interface QuestionCtx {
  id: string;
  stem: string;
  stemZh: string | null;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  optionF: string | null;
  correctAnswer: string | null;
  explanationZh: string | null;
}

export interface ComposeArgs {
  /** What the user just typed. */
  userMessage: string;
  /** Pre-existing chat history for this session (oldest first). */
  history: Array<{ role: "user" | "assistant"; content: string }>;
  /** The active question, if "Attach question context" is on. */
  questionCtx?: QuestionCtx | null;
  /** Top-3 similar questions retrieved from QuestionEmbedding. */
  ragHits: RagHit[];
  /** Few-shot exemplar pairs from past +1-rated turns. */
  fewShot: Array<{ userMsg: string; assistantMsg: string }>;
}

export function composeMessages(args: ComposeArgs): {
  systemPrompt: string;
  messages: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
} {
  const ctxBlocks: string[] = [];

  if (args.questionCtx) {
    const q = args.questionCtx;
    ctxBlocks.push(
      `【學員正在做的題目 ${q.id.slice(0, 8)}】\n` +
        `題幹: ${q.stemZh ?? q.stem}\n` +
        `選項:\n` +
        ["A", "B", "C", "D", "E", "F"]
          .map((L) => {
            const v = (q as unknown as Record<string, string | null>)[`option${L}`];
            return v ? ` ${L}. ${v}` : "";
          })
          .filter(Boolean)
          .join("\n") +
        `\n正確答案: ${q.correctAnswer ?? "—"}\n` +
        (q.explanationZh ? `現有解析: ${q.explanationZh}\n` : "")
    );
  }

  if (args.ragHits.length) {
    ctxBlocks.push(
      `【相關題庫題目（不要透露給學員，僅供你參考類似情境）】\n` +
        args.ragHits
          .slice(0, 3)
          .map((h, i) => ` ${i + 1}. ${(h.stemZh ?? h.stem).slice(0, 200)}`)
          .join("\n")
    );
  }

  if (args.fewShot.length) {
    ctxBlocks.push(
      `【你過去回答過的好範例（採用類似口吻）】\n` +
        args.fewShot
          .slice(0, 2)
          .map(
            (ex, i) =>
              ` 範例 ${i + 1}:\n  學員: ${ex.userMsg.slice(0, 150)}\n  Hermes: ${ex.assistantMsg.slice(0, 250)}`
          )
          .join("\n")
    );
  }

  const systemPrompt =
    HERMES_SYSTEM_PROMPT + (ctxBlocks.length ? "\n\n---\n\n" + ctxBlocks.join("\n\n---\n\n") : "");

  // Convert history into Gemini format
  const messages = args.history.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));
  messages.push({ role: "user", parts: [{ text: args.userMessage }] });

  return { systemPrompt, messages };
}
