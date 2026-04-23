"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * JournalFX — two linked effects:
 *
 *   1. Loading screen on first app mount (serif wordmark, ink rule filling)
 *   2. Typewriter on the landing hero `<h1 data-j-typewriter>`
 *
 * The ink-splash route transition was removed because the full-screen blot
 * looked like a "flash" when users pressed navigation buttons.
 */

export default function JournalFX() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const bootedRef = useRef(false);

  // First-mount loader (runs once)
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    // Skip the loader on route changes after the first paint
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("nj.booted") === "1") return;

    const loader = document.createElement("div");
    loader.id = "j-loader";
    loader.innerHTML = `
      <div class="stamp">— Nurslix Journal · Vol.14 · Spring 2026 —</div>
      <div class="mark"><em>Nurslix</em><span class="bolt">⌁</span><em>Journal</em></div>
      <div class="rule"><i></i></div>
      <div class="meta">Pressing ink onto paper…</div>
    `;
    document.body.appendChild(loader);

    const bootHoldMs = 1700;
    const dismiss = () => {
      loader.classList.add("done");
      loader.style.opacity = "0";
      loader.style.pointerEvents = "none";
      setTimeout(() => { if (loader.parentNode) loader.remove(); }, 900);
      sessionStorage.setItem("nj.booted", "1");
      // Kick off the landing typewriter once the loader is gone
      setTimeout(runTypewriter, 220);
    };
    const t1 = setTimeout(dismiss, bootHoldMs);
    const hardSafety = setTimeout(() => { if (loader.parentNode) dismiss(); }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(hardSafety);
    };
  }, []);

  // Route-change effect — typewriter only. Ink-splash disabled per user
  // request: the full-screen blot was reading as a "flash" when users
  // pressed navigation buttons, so we no longer run it on route changes.
  useEffect(() => {
    if (previousPath.current === null) {
      previousPath.current = pathname;
      return;
    }
    if (previousPath.current === pathname) return;
    const to = pathname;
    previousPath.current = pathname;

    // Typewriter runs only on the landing
    if (to === "/" || to === "/journal") {
      setTimeout(runTypewriter, 220);
    }
  }, [pathname]);

  return null;
}

// ── Typewriter ────────────────────────────────────────────────────────
// Finds the first element with [data-j-typewriter] and reveals its text
// one character at a time with a subtle blur/fade. Works with inline
// spans, <br>, <span style=...> (the phosphor "art" tag) — anything.

function runTypewriter() {
  if (typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>("[data-j-typewriter]:not([data-j-typed])");
  if (!el) return;
  el.dataset.jTyped = "1";
  el.classList.add("j-typing");
  el.style.opacity = "1";

  const chars: HTMLSpanElement[] = [];
  const walk = (node: Node) => {
    const kids = Array.from(node.childNodes);
    for (const k of kids) {
      if (k.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        const text = k.nodeValue || "";
        for (let idx = 0; idx < text.length; idx++) {
          const ch = text[idx];
          const sp = document.createElement("span");
          sp.className = ch === " " || ch === " " ? "j-char space" : "j-char";
          sp.textContent = ch;
          frag.appendChild(sp);
          chars.push(sp);
        }
        k.parentNode?.replaceChild(frag, k);
      } else if (k.nodeType === Node.ELEMENT_NODE) {
        if ((k as HTMLElement).tagName === "BR") continue;
        walk(k);
      }
    }
  };
  walk(el);

  const caret = document.createElement("span");
  caret.className = "j-caret-mark";
  el.appendChild(caret);

  let i = 0;
  function tick() {
    if (i >= chars.length) {
      caret.style.transition = "opacity 0.4s ease";
      caret.style.opacity = "0";
      setTimeout(() => caret.remove(), 450);
      return;
    }
    const sp = chars[i];
    sp.classList.add("on");
    sp.after(caret);
    const ch = sp.textContent || "";
    let wait = 34;
    if (ch === " " || ch === " ") wait = 16;
    else if (/[,.;:·—]/.test(ch)) wait = 220;
    else if (/[A-Z]/.test(ch)) wait = 48;
    if (Math.random() < 0.06) wait += 80;
    i++;
    setTimeout(tick, wait);
  }
  setTimeout(tick, 200);
}
