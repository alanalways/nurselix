"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import ExamShell from "./ExamShell";
import type { SessionMode } from "@/types";

interface StarterProps {
  mode: SessionMode;
  title: string;
  module?: "NCLEX" | "TOEIC" | "IELTS";
  /** Options forwarded to POST /api/nclex/session */
  targetCount?: number;
  timeLimitSec?: number;
  domainFilter?: string[];
  difficultyFilter?: ("EASY" | "MEDIUM" | "HARD")[];

  /** Forwarded to <ExamShell/> */
  showTheta?: boolean;
  showCountdown?: boolean;
  countdownSec?: number;
  showExplanationAfterAnswer?: boolean;
}

interface CreatedSession {
  sessionId: string;
  targetCount: number | null;
  timeLimitSec: number | null;
}

export default function SessionStarter({
  mode,
  title,
  module: qModule,
  targetCount,
  timeLimitSec,
  domainFilter,
  difficultyFilter,
  showTheta,
  showCountdown,
  countdownSec,
  showExplanationAfterAnswer,
}: StarterProps) {
  const router = useRouter();
  const [session, setSession] = useState<CreatedSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiredPlan, setRequiredPlan] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let alive = true;
    async function go() {
      setStarting(true);
      setError(null);
      try {
        const res = await fetch("/api/nclex/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            module: qModule,
            targetCount,
            timeLimitSec,
            domainFilter,
            difficultyFilter,
          }),
        });
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setError(body.error ?? `HTTP ${res.status}`);
          setRequiredPlan(body.required ?? null);
          return;
        }
        setSession({
          sessionId: body.sessionId,
          targetCount: body.targetCount ?? null,
          timeLimitSec: body.timeLimitSec ?? null,
        });
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "網路錯誤");
      } finally {
        if (alive) setStarting(false);
      }
    }
    go();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (starting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
        <p className="text-[var(--text-secondary)]">正在建立考試...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--warning)]/15 flex items-center justify-center">
          {requiredPlan ? <Lock size={24} className="text-[var(--warning)]" /> : <AlertCircle size={24} className="text-[var(--error)]" />}
        </div>
        <p className="font-semibold text-[var(--text-primary)] text-center">{error}</p>
        {requiredPlan && (
          <p className="text-sm text-[var(--text-secondary)] text-center max-w-md">
            此模式需要 <span className="font-semibold text-[var(--gold)]">{requiredPlan}</span> 或以上方案。升級後即可解鎖 CAT / Mock / Tutor 等完整功能。
          </p>
        )}
        <div className="flex gap-2">
          {requiredPlan && (
            <Button onClick={() => router.push("/pricing")}>查看方案</Button>
          )}
          <Button variant="ghost" onClick={() => router.push("/nclex")}>回 NCLEX 首頁</Button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <ExamShell
      sessionId={session.sessionId}
      mode={mode}
      title={title}
      targetCount={session.targetCount}
      showCountdown={showCountdown}
      countdownSec={countdownSec ?? session.timeLimitSec ?? undefined}
      showTheta={showTheta}
      showExplanationAfterAnswer={showExplanationAfterAnswer}
    />
  );
}
