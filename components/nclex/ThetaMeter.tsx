"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ChevronDown } from "lucide-react";

interface ThetaMeterProps {
  theta: number;
  se: number;
}

function thetaLabel(theta: number) {
  if (theta > 1.5)  return { label: "優秀",     color: "text-[var(--blue)]" };
  if (theta > 0.5)  return { label: "良好",     color: "text-[var(--success)]" };
  if (theta > -0.5) return { label: "及格邊緣", color: "text-[var(--warning)]" };
  return              { label: "需加強", color: "text-[var(--error)]" };
}

export default function ThetaMeter({ theta, se }: ThetaMeterProps) {
  const [expanded, setExpanded] = useState(false);
  const { label, color } = thetaLabel(theta);
  const distToPass = (0.00 - theta).toFixed(2);
  const passingTheta = 0.00;

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm"
      >
        <TrendingUp size={14} className="text-[var(--gold)]" />
        <span className={`font-semibold ${color}`}>{label}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
        <ChevronDown
          size={12}
          className={`text-[var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-8 z-20 w-56 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-4 shadow-xl"
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">當前能力</span>
                <span className={`font-semibold ${color}`}>{label} (θ = {theta.toFixed(2)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">通過標準</span>
                <span className="text-[var(--text-primary)]">θ = {passingTheta.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">距離通過</span>
                <span className={theta >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}>
                  {theta >= 0 ? "已達標準" : `${distToPass} logits`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">測量精度 (SE)</span>
                <span className="font-mono text-[var(--text-secondary)]">{se.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] w-full text-center"
            >
              收起
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
