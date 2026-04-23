"use client";

import { useEffect, useRef, useState } from "react";
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
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  // Keep onExpire ref up to date without re-running the interval effect.
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  // Single interval for the lifetime of the component; ticks independently of
  // remaining/onExpire changes so we don't churn the timer every second.
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 0) return 0;
        const next = r - 1;
        if (next <= 0 && !firedRef.current) {
          firedRef.current = true;
          onExpireRef.current?.();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
