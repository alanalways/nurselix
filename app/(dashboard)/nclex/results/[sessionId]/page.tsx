"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Share2, RotateCcw, Home, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import ResultCard from "@/components/nclex/ResultCard";
import Modal from "@/components/ui/Modal";

const mockDomainStats = [
  { domain: "Management of Care", correct: 8, total: 10 },
  { domain: "Pharmacological", correct: 5, total: 9 },
  { domain: "Physiological Adaptation", correct: 7, total: 9 },
  { domain: "Safety & Infection Control", correct: 6, total: 8 },
  { domain: "Basic Care & Comfort", correct: 5, total: 7 },
];

export default function ResultsPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedbackDone, setFeedbackDone] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-3xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">考試結果</h1>

      <ResultCard
        mode="PRACTICE"
        totalQuestions={43}
        correctCount={31}
        totalTimeSec={2580}
        theta={0.82}
        passFail="PASS"
        domainStats={mockDomainStats}
      />

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="gold" onClick={() => router.push("/nclex")}>
          <Home size={16} /> 回到 NCLEX
        </Button>
        <Button variant="outline" onClick={() => router.push("/nclex/practice")}>
          <RotateCcw size={16} /> 再來一次
        </Button>
        <Button variant="ghost">
          <Share2 size={16} /> 分享成績
        </Button>
      </div>

      {/* Feedback Modal */}
      <Modal
        open={showFeedback && !feedbackDone}
        onClose={() => setShowFeedback(false)}
        title="考試體驗如何？"
        size="sm"
      >
        <div className="text-center space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">你的回饋幫助我們改善 Nurslix</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`text-3xl transition-transform hover:scale-125 ${
                  rating >= n ? "" : "opacity-30"
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
          <textarea
            placeholder="有任何建議嗎？（選填）"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--gold)] resize-none"
          />
          <Button
            fullWidth
            disabled={rating === 0}
            onClick={() => { setFeedbackDone(true); setShowFeedback(false); }}
          >
            送出回饋
          </Button>
          <button
            onClick={() => setShowFeedback(false)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            跳過
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
