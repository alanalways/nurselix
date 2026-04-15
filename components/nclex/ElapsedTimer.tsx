"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface ElapsedTimerProps {
  startSec?: number;
  className?: string;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ElapsedTimer({ startSec = 0, className }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(startSec);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`flex items-center gap-1.5 font-mono text-[var(--gold)] text-sm ${className}`}>
      <Timer size={14} />
      <span>{formatTime(elapsed)}</span>
    </div>
  );
}
