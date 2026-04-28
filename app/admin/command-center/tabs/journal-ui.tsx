"use client";
/**
 * Shared journal-style UI primitives for the command-center tabs.
 * Editorial magazine aesthetic: cream paper + phosphor green + serif italic.
 * Color tokens live in --j-* CSS variables (globals.css). All themes work.
 */
import { cn } from "@/lib/utils/cn";

/** Top-of-section masthead line — uppercase mono label + decorative rule */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "flex items-baseline gap-3 text-[10px] tracking-[0.2em] uppercase",
      "text-[var(--j-phosphor)]",
      className,
    )}
      style={{ fontFamily: "var(--font-mono)" }}>
      <span>—</span>
      <span>{children}</span>
    </div>
  );
}

/** Big editorial italic title (Instrument Serif) */
export function DisplayTitle({ children, size = "lg", className, italic = true }: {
  children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl"; className?: string; italic?: boolean;
}) {
  const sizeMap = { sm: "text-xl", md: "text-2xl", lg: "text-3xl md:text-4xl", xl: "text-4xl md:text-5xl" };
  return (
    <h1 className={cn(sizeMap[size], italic && "italic", "tracking-tight text-[var(--j-ink)]", className)}
      style={{ fontFamily: "var(--font-display)", fontWeight: 400, letterSpacing: "-0.01em" }}>
      {children}
    </h1>
  );
}

/** Editorial body text (Noto Serif TC for Chinese) */
export function ReaderText({ children, className, dim = false }: { children: React.ReactNode; className?: string; dim?: boolean }) {
  return (
    <p className={cn(dim ? "text-[var(--j-ink-dim)]" : "text-[var(--j-ink)]", "leading-relaxed", className)}
      style={{ fontFamily: "var(--font-zh)" }}>
      {children}
    </p>
  );
}

/** Mono metadata caption (running heads, dates, IDs) */
export function MetaText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] tracking-[0.15em] uppercase text-[var(--j-ink-dim)]", className)}
      style={{ fontFamily: "var(--font-mono)" }}>
      {children}
    </span>
  );
}

/** Top horizontal rule divider, optionally with masthead text */
export function MastheadRule({ left, right, double = false }: { left?: React.ReactNode; right?: React.ReactNode; double?: boolean }) {
  return (
    <div className={cn(
      "py-3 flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-[var(--j-ink-dim)]",
      double ? "border-y-2 border-[var(--j-line-strong)]" : "border-y border-[var(--j-line)]",
    )}
      style={{ fontFamily: "var(--font-mono)" }}>
      <span>{left}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

/** Bordered card with editorial chrome */
export function PaperCard({ children, className, inset = false, dark = false }: {
  children: React.ReactNode; className?: string; inset?: boolean; dark?: boolean;
}) {
  if (dark) {
    return (
      <div className={cn(
        "bg-[var(--j-ink)] text-[var(--j-bg)] p-6 rounded-none",
        className
      )}>
        {children}
      </div>
    );
  }
  return (
    <div className={cn(
      inset ? "bg-[var(--j-bg-inset)]" : "bg-[var(--j-bg-card)]",
      "border border-[var(--j-line)]",
      className,
    )}>
      {children}
    </div>
  );
}

/** Row that highlights phosphor on hover (mimics the design's j-row pattern) */
export function JournalRow({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={cn(
        "py-3 border-b border-[var(--j-line)]/60 transition-colors",
        "hover:bg-[var(--j-phosphor-soft)]",
        onClick && "cursor-pointer",
        className,
      )}>
      {children}
    </div>
  );
}

/** Primary editorial CTA — outline + phosphor on hover */
export function JournalCta({ children, onClick, primary = false, className, disabled, type, ...rest }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean; className?: string;
  disabled?: boolean; type?: "button" | "submit"; [k: string]: any;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type ?? "button"}
      className={cn(
        "px-5 py-2.5 text-sm tracking-wide italic",
        "border transition-all duration-300 disabled:opacity-40",
        primary
          ? "bg-[var(--j-ink)] text-[var(--j-bg)] border-[var(--j-ink)] hover:bg-[var(--j-phosphor)] hover:border-[var(--j-phosphor)]"
          : "bg-transparent text-[var(--j-ink)] border-[var(--j-line-strong)] hover:border-[var(--j-phosphor)] hover:text-[var(--j-phosphor)]",
        "hover:-translate-y-px active:translate-y-0",
        className,
      )}
      style={{ fontFamily: "var(--font-display)" }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Inline pill-style tag (used for status/category) */
export function Pill({ children, tone = "neutral", className }: {
  children: React.ReactNode;
  tone?: "neutral" | "phosphor" | "warning" | "danger" | "muted";
  className?: string;
}) {
  const toneMap: Record<string, string> = {
    neutral:  "border-[var(--j-line-strong)] text-[var(--j-ink)] bg-transparent",
    phosphor: "border-[var(--j-phosphor-line)] text-[var(--j-phosphor)] bg-[var(--j-phosphor-soft)]",
    warning:  "border-[#c77a28]/40 text-[#c77a28] bg-[#c77a28]/8",
    danger:   "border-[var(--j-red)]/40 text-[var(--j-red)] bg-[var(--j-red)]/8",
    muted:    "border-[var(--j-line)] text-[var(--j-ink-muted)] bg-transparent",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase border",
      toneMap[tone],
      className,
    )} style={{ fontFamily: "var(--font-mono)" }}>
      {children}
    </span>
  );
}

/** Big italic number (theta-style display) */
export function StatNumber({ value, unit, className }: { value: React.ReactNode; unit?: string; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="italic tracking-tight text-[var(--j-ink)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.25rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </span>
      {unit && (
        <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--j-ink-dim)]" style={{ fontFamily: "var(--font-mono)" }}>
          {unit}
        </span>
      )}
    </div>
  );
}

/** Highlighter mark, like the design's <mark> */
export function Marker({ children }: { children: React.ReactNode }) {
  return <span className="px-1" style={{ background: "var(--j-marker)", color: "var(--j-ink)" }}>{children}</span>;
}

export const FONT_DISPLAY = { fontFamily: "var(--font-display)" };
export const FONT_ZH      = { fontFamily: "var(--font-zh)" };
export const FONT_MONO    = { fontFamily: "var(--font-mono)" };
