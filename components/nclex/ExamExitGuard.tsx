"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  /** False = exam already finished, don't block navigation. */
  active: boolean;
}

/**
 * Shows a dismissible reminder banner on active exam pages and hooks
 * beforeunload so the browser asks for confirmation when the user tries
 * to close / refresh the tab. If they still leave, the server-side cron
 * `/api/cron/finalize-abandoned-sessions` will auto-finalize the session
 * after 1 hour of inactivity so no one gets "stuck" with an open session.
 */
export default function ExamExitGuard({ active }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the returned string but still show a
      // generic confirm dialog when preventDefault is called.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  if (!active || dismissed) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-2 flex items-start gap-2 text-xs">
      <AlertTriangle size={14} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
      <div className="flex-1 text-[var(--text-secondary)] leading-relaxed">
        為了讓成績準確反映你的實力，請盡量一次完成這場考試。若中途離開超過 1 小時，系統會自動依目前進度結算。
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="關閉提醒"
        className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
