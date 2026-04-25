"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  /** Question ID — the player resolves the latest asset via /api/audio/by-question */
  questionId?: string;
  /** Or pass a ready-made src directly. */
  src?: string;
  /** Hint shown above the controls (e.g. "Conversation · 2 speakers") */
  label?: string;
  /** Whether to allow speed control (default: true) */
  allowSpeed?: boolean;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioPlayer({ questionId, src, label, allowSpeed = true }: AudioPlayerProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(src ?? null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Resolve audio URL via the questionId metadata endpoint
  useEffect(() => {
    if (src) { setResolvedSrc(src); return; }
    if (!questionId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/audio/by-question/${questionId}`, { cache: "no-store" });
        if (!res.ok) {
          if (alive) setError(res.status === 404 ? "尚無音檔" : `載入失敗 (${res.status})`);
          return;
        }
        const body = await res.json() as { audioUrl: string; durationSec?: number };
        if (alive) {
          setResolvedSrc(body.audioUrl);
          if (body.durationSec) setDuration(body.durationSec);
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "網路錯誤");
      }
    })();
    return () => { alive = false; };
  }, [src, questionId]);

  // Re-apply playback rate whenever speed changes or audio reloads
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, resolvedSrc]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch((e) => setError(String(e)));
    else a.pause();
  }

  function restart() {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch((e) => setError(String(e)));
  }

  if (error) {
    return (
      <div className="rounded-lg border p-3 text-sm text-[var(--text-muted)]"
           style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}>
        <Volume2 size={14} className="inline mr-2" />
        {error}
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div className="rounded-lg border p-3 text-sm text-[var(--text-muted)] animate-pulse"
           style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}>
        音檔載入中…
      </div>
    );
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      className="rounded-lg border p-3 space-y-2"
      style={{ borderColor: "var(--j-line)", background: "var(--j-bg-card)" }}
    >
      {label && (
        <div className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1.5">
          <Volume2 size={12} /> {label}
        </div>
      )}
      <audio
        ref={audioRef}
        src={resolvedSrc}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={playing ? "暫停" : "播放"}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition"
          style={{
            background: "var(--j-phosphor)",
            color: "var(--j-bg)",
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <button
          onClick={restart}
          aria-label="重播"
          className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 transition hover:border-[var(--gold)]"
          style={{ borderColor: "var(--j-line)", color: "var(--text-secondary)" }}
        >
          <RotateCcw size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-overlay)" }}>
            <div
              className="h-full transition-all"
              style={{ width: `${pct}%`, background: "var(--j-phosphor)" }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] font-mono text-[var(--text-muted)]">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {allowSpeed && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded transition"
                style={{
                  background: speed === s ? "var(--gold-dim)" : "transparent",
                  color: speed === s ? "var(--gold)" : "var(--text-muted)",
                  border: `1px solid ${speed === s ? "var(--gold)" : "transparent"}`,
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
