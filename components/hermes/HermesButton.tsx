"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import HermesPanel from "./HermesPanel";

interface Props {
  /** The current question id (so context can be attached). */
  questionId: string;
  /** When the user just answered wrong, set this to highlight the button. */
  wrongAnswer?: { selected: string; correct: string };
}

export default function HermesButton({ questionId, wrongAnswer }: Props) {
  const [open, setOpen] = useState(false);
  const draft = wrongAnswer
    ? `為什麼這題不能選 ${wrongAnswer.selected}，正確答案是 ${wrongAnswer.correct}？`
    : undefined;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs italic border transition ${
          wrongAnswer
            ? "border-[var(--j-red)] text-[var(--j-red)] animate-pulse"
            : "border-[var(--j-phosphor-line)] text-[var(--j-phosphor)] hover:bg-[var(--j-phosphor-soft)]"
        }`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        <MessageCircle size={12} />
        {wrongAnswer ? "為什麼錯了？問 Hermes" : "還有疑問？問 Hermes"}
      </button>
      <HermesPanel
        open={open}
        onClose={() => setOpen(false)}
        initialDraft={draft}
        questionId={questionId}
        attachQuestionContext
      />
    </>
  );
}
