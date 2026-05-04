"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import HermesPanel from "./HermesPanel";

export default function HermesBubble() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Ask Hermes"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-[var(--j-phosphor)] text-[var(--j-bg)] flex items-center justify-center shadow-lg hover:scale-105 transition"
      >
        <Sparkles size={20} />
      </button>
      <HermesPanel
        open={open}
        onClose={() => setOpen(false)}
        attachQuestionContext={false}
      />
    </>
  );
}
