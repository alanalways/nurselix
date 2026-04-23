"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * JournalFX — three linked effects:
 *
 *   1. Loading screen on first app mount (serif wordmark, ink rule filling)
 *   2. Typewriter on the landing hero `<h1 data-j-typewriter>`
 *   3. Ink-splash transition between routes (a dark blot grows from the user's
 *      last pointer position and fades; the next page fades in underneath)
 *
 * CAT / exam routes suppress the splash so answering remains snappy.
 */

const TRANSITION_SUPPRESS_PATHS = [
  "/nclex/cat",
  "/nclex/practice",
  "/nclex/mock",
  "/nclex/mini-cat",
  "/nclex/assessment",
  "/nclex/tutor",
  "/nclex/error-challenge",
];

export default function JournalFX() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const bootedRef = useRef(false);
  const transitioningRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Remember the last pointer so ink starts from the user's click
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    }
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, []);

  // Ink-splash route transition — fires when pathname changes
  useEffect(() => {
    if (previousPath.current === null) {
      previousPath.current = pathname;
      return;
    }
    if (previousPath.current === pathname) return;
    const to = pathname;
    const from = previousPath.current;
    previousPath.current = pathname;

    const suppressed = TRANSITION_SUPPRESS_PATHS.some((p) => to.startsWith(p) || from.startsWith(p));
    if (suppressed || transitioningRef.current) return;

    runInkSplash(pointerRef.current);
    transitioningRef.current = true;
    setTimeout(() => { transitioningRef.current = false; }, 720);

    // Typewriter runs only on the landing
    if (to === "/" || to === "/journal") {
      setTimeout(runTypewriter, 420);
    }
  }, [pathname]);

  return null;
}

// ── Ink-splash overlay ────────────────────────────────────────────────
function runInkSplash(origin: { x: number; y: number }) {
  if (typeof document === "undefined") return;
  const overlay = document.createElement("div");
  overlay.id = "j-ink-overlay";
  const x = origin.x || window.innerWidth / 2;
  const y = origin.y || window.innerHeight * 0.4;
  overlay.style.setProperty("--ink-x", x + "px");
  overlay.style.setProperty("--ink-y", y + "px");
  const blot = document.createElement("div");
  blot.className = "blot";
  overlay.appendChild(blot);
  document.body.appendChild(overlay);

  // Ink-in the next page element once React renders it
  let attempts = 0;
  const watch = setInterval(() => {
    const page = document.querySelector(".j-page");
    if (page && !page.classList.contains("j-ink-in")) {
      page.classList.add("j-ink-in");
      clearInterval(watch);
    } else if (++attempts > 15) {
      clearInterval(watch);
    }
  }, 24);

  setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
    document.querySelectorAll(".j-ink-in").forEach((n) => n.classList.remove("j-ink-in"));
  }, 720);
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
