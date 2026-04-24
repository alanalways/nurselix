"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Nurslix Journal — editorial magazine cover landing.
 *
 * This is the public `/` page. Authenticated users see the same cover
 * and get a "Continue reading →" button that jumps to `/home` (their
 * Reader's Desk / dashboard). Everyone else sees "Begin reading →"
 * linking to /register.
 *
 * Ported from the Claude Design handoff (`journal-landing.jsx` +
 * `journal-landing-parts.jsx`). Navigation is wired to real routes
 * rather than the prototype's `onNavigate` state machine.
 */

type Props = {
  signedIn: boolean;
  displayName: string | null;
};

export default function JournalLanding({ signedIn, displayName }: Props) {
  return (
    <div className="j-page" style={{ background: "var(--j-bg)", color: "var(--j-ink)", minHeight: "100vh" }}>
      <JournalTopBar signedIn={signedIn} />
      <Masthead />
      <Hero signedIn={signedIn} displayName={displayName} />
      <PullQuoteStrip />
      <SampleQuestionSpread />
      <TableOfContents />
      <BigStats />
      <ReadersStrip />
      <BackCover signedIn={signedIn} />
      <JournalFooter />
    </div>
  );
}

/* ───────────────────────── TopBar ───────────────────────── */

function JournalTopBar({ signedIn }: { signedIn: boolean }) {
  const links = [
    { label: "Journal", href: "/" },
    { label: "Dashboard", href: signedIn ? "/home" : "/login" },
    { label: "Practice", href: signedIn ? "/nclex/cat" : "/login" },
    { label: "Review", href: signedIn ? "/review" : "/login" },
    { label: "Subscribe", href: "/pricing" },
    { label: "Settings", href: signedIn ? "/settings" : "/login" },
  ];
  return (
    <div
      style={{
        borderBottom: "1px solid var(--j-line)",
        padding: "14px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        position: "sticky",
        top: 0,
        background: "var(--j-bg)",
        zIndex: 20,
      }}
    >
      <div className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
        Vol. 14 · № 1 · Spring 2026
      </div>
      <nav style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="j-mono j-btn"
            style={{ color: "var(--j-ink-dim)" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
        NT$ 0 / This issue
      </div>
    </div>
  );
}

/* ───────────────────────── Masthead ───────────────────────── */

function Masthead() {
  return (
    <header style={{ padding: "48px 40px 24px", textAlign: "center" }}>
      <div className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
        — Nurslix Journal · № 14 —
      </div>
      <h1
        className="j-display"
        style={{
          fontSize: "clamp(56px, 10vw, 120px)",
          lineHeight: 0.95,
          margin: "8px 0 4px",
          letterSpacing: "-0.02em",
        }}
      >
        Nurslix<span style={{ color: "var(--j-phosphor)" }}>⌁</span>Journal
      </h1>
      <div
        className="j-zh"
        style={{ fontSize: 16, color: "var(--j-ink-dim)", marginTop: 4 }}
      >
        為台灣護理師而造的 NCLEX 備考讀本
      </div>
    </header>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero({ signedIn, displayName }: { signedIn: boolean; displayName: string | null }) {
  const router = useRouter();
  return (
    <section
      style={{
        padding: "32px 40px 64px",
        borderTop: "1px solid var(--j-line)",
        borderBottom: "1px solid var(--j-line)",
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 48,
        alignItems: "center",
      }}
      className="hero-grid"
    >
      <div>
        <div className="j-mono" style={{ color: "var(--j-ink-muted)", marginBottom: 18 }}>
          — Feature · Cover story —
        </div>
        <h2
          className="j-display"
          data-j-typewriter
          style={{
            fontSize: "clamp(44px, 7vw, 96px)",
            lineHeight: 1.02,
            fontStyle: "italic",
            margin: 0,
            opacity: 0,
          }}
        >
          The slow{" "}
          <span style={{ color: "var(--j-phosphor)" }}>art</span>
          <br />
          of passing NCLEX.
        </h2>
        <p
          className="j-zh"
          style={{
            marginTop: 28,
            fontSize: 17,
            lineHeight: 1.9,
            color: "var(--j-ink-dim)",
            maxWidth: 560,
          }}
        >
          一本 NCLEX-RN 的備考期刊。每題經過編輯審校、雙語註記、台美臨床差異對照。
          <br />
          Hermes AI · IRT 自適應 · SM-2 間隔複習。慢而確切的練習。
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 36 }}>
          <button
            onClick={() => router.push(signedIn ? "/home" : "/register")}
            className="j-btn j-mono"
            style={{
              padding: "14px 24px",
              background: "var(--j-ink)",
              color: "var(--j-bg)",
              border: "1px solid var(--j-ink)",
              cursor: "pointer",
            }}
          >
            {signedIn
              ? `Continue reading${displayName ? ` · ${displayName.split(" ")[0]}` : ""} →`
              : "Begin reading →"}
          </button>
          <button
            onClick={() => router.push("/pricing")}
            className="j-btn j-mono"
            style={{
              padding: "14px 24px",
              background: "transparent",
              color: "var(--j-ink)",
              border: "1px solid var(--j-line-strong)",
              cursor: "pointer",
            }}
          >
            View subscription →
          </button>
        </div>
      </div>
      <JournalLedger />
    </section>
  );
}

/* ───────────────────────── Ledger (little book visual) ───────────────────────── */

function JournalLedger() {
  return (
    <div
      style={{
        border: "1px solid var(--j-line-strong)",
        background: "var(--j-bg-card)",
        padding: 28,
        position: "relative",
      }}
    >
      <div
        className="j-mono"
        style={{ color: "var(--j-ink-muted)", marginBottom: 12 }}
      >
        — Today{"’"}s ledger —
      </div>
      <Row k="Plan" v="CAT · 15 題" />
      <Row k="Hermes" v="margin notes on" />
      <Row k="Review" v="12 flashcards due" />
      <Row k="Focus" v="Safety & Infection" />
      <div
        className="j-hand"
        style={{
          marginTop: 20,
          fontSize: 20,
          lineHeight: 1.4,
          color: "var(--j-hand)",
        }}
      >
        {`“Slow ink, clear mind.”`}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      className="j-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px dotted var(--j-line)",
        fontSize: 14,
      }}
    >
      <span className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
        {k}
      </span>
      <span className="j-zh">{v}</span>
    </div>
  );
}

/* ───────────────────────── Pull-quote strip ───────────────────────── */

function PullQuoteStrip() {
  const cols: { tag: string; quote: string; stat: string }[] = [
    {
      tag: "Adaptive",
      quote: "以 IRT 依你當下的能力出題,不多一題,也不少一題。",
      stat: "θ ≈ 1.2",
    },
    {
      tag: "Hermes AI",
      quote: "邊讀邊寫的旁註,把台美臨床差異、藥理細節補齊。",
      stat: "marginalia",
    },
    {
      tag: "SM-2",
      quote: "間隔複習會回收你曾卡住的題目,直到它不再卡住為止。",
      stat: "47 min / day",
    },
  ];
  return (
    <section
      style={{
        padding: "40px 40px",
        borderBottom: "1px solid var(--j-line)",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 40,
      }}
      className="pullquote-grid"
    >
      {cols.map((c, i) => (
        <div key={c.tag} style={{ borderLeft: i === 0 ? "none" : "1px solid var(--j-line)", paddingLeft: i === 0 ? 0 : 32 }}>
          <div className="j-mono" style={{ color: "var(--j-phosphor)" }}>
            ✦ {c.tag}
          </div>
          <p
            className="j-zh"
            style={{ fontSize: 17, lineHeight: 1.8, margin: "12px 0 16px" }}
          >
            {c.quote}
          </p>
          <div className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
            {c.stat}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ───────────────────────── Sample question spread ───────────────────────── */

function SampleQuestionSpread() {
  return (
    <section style={{ padding: "56px 40px", borderBottom: "1px solid var(--j-line)" }}>
      <div className="j-mono" style={{ color: "var(--j-ink-muted)", marginBottom: 10 }}>
        — Article № 14-03 · Page 42 —
      </div>
      <h3
        className="j-display"
        style={{
          fontSize: "clamp(28px, 4vw, 44px)",
          fontStyle: "italic",
          margin: "0 0 32px",
          maxWidth: 820,
          lineHeight: 1.1,
        }}
      >
        A 72-year-old with CHF, an SpO₂ of 88%, and the nurse{"’"}s first move.
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 48,
        }}
        className="sample-grid"
      >
        <div>
          <p className="j-zh" style={{ fontSize: 16, lineHeight: 1.95 }}>
            一位 72 歲男性因 <mark>充血性心衰竭急性發作</mark> 入院。
            下午 14:30,病人主訴呼吸困難加劇、無法平躺,SpO₂ 在 room air 上降至 88%,RR 28/min,HR 112 bpm,BP 164/92 mmHg。
            護理師進入病室,下一步應該最先做什麼?
          </p>
          <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
            {[
              "A. 立刻通知 on-call physician 並等待指示。",
              "B. 將床頭抬高至 high-Fowler's,給予鼻導管氧氣 4 L/min。",
              "C. 先取得 arterial blood gas,再決定處置。",
              "D. 給予 PRN furosemide 40 mg IV push。",
            ].map((o) => (
              <div
                key={o}
                className="j-zh"
                style={{
                  padding: "14px 18px",
                  border: "1px solid var(--j-line)",
                  fontSize: 15,
                  background: "var(--j-bg-card)",
                }}
              >
                {o}
              </div>
            ))}
          </div>
          <div
            className="j-mono"
            style={{ color: "var(--j-ink-muted)", marginTop: 20, fontSize: 11 }}
          >
            NGN · Select · Category: Physiological Adaptation
          </div>
        </div>

        <aside
          style={{
            borderLeft: "1px solid var(--j-line)",
            paddingLeft: 32,
            position: "relative",
          }}
        >
          <div className="j-mono" style={{ color: "var(--j-phosphor)" }}>
            ✦ Hermes · margin note
          </div>
          <p
            className="j-hand"
            style={{ fontSize: 22, lineHeight: 1.5, margin: "12px 0 20px" }}
          >
            {`"ABC 原則:先處理氣道與呼吸,再處理循環。B 是正解。"`}
          </p>
          <p
            className="j-zh"
            style={{
              fontSize: 14,
              lineHeight: 1.85,
              color: "var(--j-ink-dim)",
            }}
          >
            台灣急診常先開 ABG、病房先打 Lasix,但 NCLEX 嚴格遵循
            <mark> ABC priority</mark>。
            先抬床頭、給氧以改善氣體交換,再考慮藥物與檢查。
          </p>
        </aside>
      </div>
    </section>
  );
}

/* ───────────────────────── Table of contents ───────────────────────── */

function TableOfContents() {
  const rows = [
    { no: "01", title: "Adaptive CAT 自適應模擬考", page: "p. 08", href: "/nclex/cat" },
    { no: "02", title: "Daily Challenge 每日挑戰", page: "p. 14", href: "/daily-challenge" },
    { no: "03", title: "Hermes margin notes 旁註解析", page: "p. 22", href: "/nclex/tutor" },
    { no: "04", title: "SM-2 Flashcard review 間隔複習", page: "p. 36", href: "/review" },
    { no: "05", title: "Stats · Heatmap 能力雷達", page: "p. 48", href: "/stats" },
    { no: "06", title: "Subscription 訂閱 & 計劃", page: "p. 56", href: "/pricing" },
  ];
  return (
    <section style={{ padding: "56px 40px", borderBottom: "1px solid var(--j-line)" }}>
      <div className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
        — Contents —
      </div>
      <h3
        className="j-display"
        style={{
          fontSize: "clamp(32px, 5vw, 56px)",
          fontStyle: "italic",
          margin: "8px 0 32px",
        }}
      >
        In this issue
      </h3>
      <div>
        {rows.map((r) => (
          <Link
            key={r.no}
            href={r.href}
            className="j-row j-btn"
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr auto",
              alignItems: "baseline",
              padding: "18px 12px",
              borderTop: "1px solid var(--j-line)",
              gap: 16,
            }}
          >
            <span className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
              № {r.no}
            </span>
            <span className="j-zh" style={{ fontSize: 20 }}>
              {r.title}
            </span>
            <span className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
              {r.page}
            </span>
          </Link>
        ))}
        <div style={{ borderTop: "1px solid var(--j-line)" }} />
      </div>
    </section>
  );
}

/* ───────────────────────── Big stats ───────────────────────── */

function BigStats() {
  const stats: [string, string][] = [
    ["14,500", "題庫題數"],
    ["96%", "審校通過率"],
    ["2,481", "本季訂閱者"],
    ["47 min", "平均每日練習"],
  ];
  return (
    <section
      style={{
        padding: "64px 40px",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 24,
        borderBottom: "1px solid var(--j-line)",
      }}
      className="stats-grid"
    >
      {stats.map(([n, label], i) => (
        <div
          key={label}
          style={{
            borderLeft: i === 0 ? "none" : "1px solid var(--j-line)",
            paddingLeft: i === 0 ? 0 : 24,
          }}
        >
          <div
            className="j-display"
            style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1, fontStyle: "italic" }}
          >
            {n}
          </div>
          <div
            className="j-mono"
            style={{ color: "var(--j-ink-muted)", marginTop: 8 }}
          >
            {label}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ───────────────────────── Readers strip ───────────────────────── */

function ReadersStrip() {
  const cards = [
    {
      name: "R. Chen, RN",
      city: "Taipei · 2025 pass",
      quote: "Hermes 的旁註真的讓我看懂 ABC 原則為什麼會覆蓋台灣的常規處置。",
    },
    {
      name: "M. Lin, RN",
      city: "Kaohsiung · 2026 pass",
      quote: "間隔複習把我一直忘的藥理重點鎖住了。七週後我就沒再錯過同一題。",
    },
    {
      name: "T. Huang, BSN",
      city: "Taichung · in progress",
      quote: "每天 40 分鐘的 CAT,比讀大本教科書更能知道自己哪裡弱。",
    },
  ];
  return (
    <section
      style={{
        padding: "56px 40px",
        borderBottom: "1px solid var(--j-line)",
      }}
    >
      <div className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
        — Letters from readers —
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 32,
          marginTop: 24,
        }}
        className="readers-grid"
      >
        {cards.map((c) => (
          <div
            key={c.name}
            style={{
              border: "1px solid var(--j-line)",
              background: "var(--j-bg-card)",
              padding: 28,
            }}
          >
            <p
              className="j-zh"
              style={{ fontSize: 16, lineHeight: 1.85, margin: 0 }}
            >
              {`"${c.quote}"`}
            </p>
            <div
              style={{
                marginTop: 20,
                borderTop: "1px dotted var(--j-line)",
                paddingTop: 14,
              }}
            >
              <div className="j-display" style={{ fontStyle: "italic" }}>
                {c.name}
              </div>
              <div
                className="j-mono"
                style={{ color: "var(--j-ink-muted)", marginTop: 4 }}
              >
                {c.city}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Back cover CTA ───────────────────────── */

function BackCover({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      style={{
        padding: "96px 40px",
        textAlign: "center",
        borderBottom: "1px solid var(--j-line)",
      }}
    >
      <div className="j-mono" style={{ color: "var(--j-ink-muted)" }}>
        — Back cover —
      </div>
      <h2
        className="j-display"
        style={{
          fontSize: "clamp(48px, 9vw, 96px)",
          lineHeight: 1.02,
          fontStyle: "italic",
          margin: "16px auto 24px",
          maxWidth: 900,
          letterSpacing: "-0.01em",
        }}
      >
        A journal that reads you back.
      </h2>
      <p
        className="j-zh"
        style={{
          fontSize: 17,
          lineHeight: 1.85,
          color: "var(--j-ink-dim)",
          maxWidth: 560,
          margin: "0 auto 32px",
        }}
      >
        在這裡,你不是被題海淹沒,而是被編輯好的一本書陪著走完 NCLEX。
      </p>
      <Link
        href={signedIn ? "/home" : "/register"}
        className="j-btn j-mono"
        style={{
          display: "inline-block",
          padding: "16px 28px",
          background: "var(--j-ink)",
          color: "var(--j-bg)",
          border: "1px solid var(--j-ink)",
        }}
      >
        {signedIn ? "Continue reading →" : "Open this issue →"}
      </Link>
    </section>
  );
}

/* ───────────────────────── Footer ───────────────────────── */

function JournalFooter() {
  return (
    <footer
      style={{
        padding: "48px 40px 24px",
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1fr",
        gap: 40,
      }}
      className="footer-grid"
    >
      <div>
        <div className="j-display" style={{ fontStyle: "italic", fontSize: 28 }}>
          Nurslix<span style={{ color: "var(--j-phosphor)" }}>⌁</span>Journal
        </div>
        <p
          className="j-zh"
          style={{
            fontSize: 14,
            lineHeight: 1.85,
            color: "var(--j-ink-dim)",
            marginTop: 12,
            maxWidth: 360,
          }}
        >
          為台灣護理師而造的 NCLEX 備考讀本。Hermes AI 旁註 · IRT 自適應 · SM-2 間隔複習。
        </p>
      </div>
      <div>
        <div className="j-mono" style={{ color: "var(--j-ink-muted)", marginBottom: 10 }}>
          Sections
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          <li><Link href="/pricing" className="j-zh">訂閱方案</Link></li>
          <li><Link href="/us-nursing" className="j-zh">赴美護理</Link></li>
          <li><Link href="/nursing-career" className="j-zh">職涯資源</Link></li>
        </ul>
      </div>
      <div>
        <div className="j-mono" style={{ color: "var(--j-ink-muted)", marginBottom: 10 }}>
          Colophon
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          <li><Link href="/terms" className="j-zh">Terms</Link></li>
          <li><Link href="/privacy" className="j-zh">Privacy</Link></li>
          <li className="j-mono" style={{ color: "var(--j-ink-muted)", marginTop: 12 }}>
            © 2026 Nurslix
          </li>
        </ul>
      </div>
    </footer>
  );
}
