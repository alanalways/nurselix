import Link from "next/link";

interface FooterProps {
  variant?: "full" | "compact";
}

export default function Footer({ variant = "full" }: FooterProps) {
  if (variant === "compact") {
    return (
      <footer className="text-center py-6 text-xs text-[var(--text-muted)]">
        © 2026 Nurslix ·{" "}
        <Link href="/terms" className="hover:text-[var(--gold)] underline">服務條款</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-[var(--gold)] underline">隱私權政策</Link>
      </footer>
    );
  }

  return (
    <footer className="border-t border-[var(--border-subtle)] mt-16 py-8 px-6 bg-[var(--bg-surface)]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-[var(--text-muted)]">
          © 2026 Nurslix. All rights reserved.
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/pricing" className="text-[var(--text-secondary)] hover:text-[var(--gold)]">
            方案
          </Link>
          <span className="text-[var(--text-muted)]">·</span>
          <Link href="/terms" className="text-[var(--text-secondary)] hover:text-[var(--gold)]">
            服務條款
          </Link>
          <span className="text-[var(--text-muted)]">·</span>
          <Link href="/privacy" className="text-[var(--text-secondary)] hover:text-[var(--gold)]">
            隱私權政策
          </Link>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto mt-4 text-xs text-[var(--text-muted)]">
        Nurslix 為獨立教育平台，與 NCSBN、NCLEX-RN® 無任何隸屬或授權關係。
        內容僅供練習參考，不構成醫療建議。
      </div>
    </footer>
  );
}
