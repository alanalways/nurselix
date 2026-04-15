"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CountdownTimerProps {
  totalSec: number;
  onExpire?: () => void;
  className?: string;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CountdownTimer({ totalSec, onExpire, className }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(totalSec);
  const isWarning = remaining < 1800; // < 30 min

  useEffect(() => {
    if (remaining <= 0) { onExpire?.(); return; }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire]);

  return (
    <div className={cn(
      "flex items-center gap-1.5 font-mono text-sm",
      isWarning ? "text-[var(--error)]" : "text-[var(--gold)]",
      className
    )}>
      <Clock size={14} className={isWarning ? "animate-pulse" : ""} />
      <span>{formatTime(remaining)}</span>
    </div>
  );
}
