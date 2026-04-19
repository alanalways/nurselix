"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export default function PwaUpdateBanner() {
  const [show, setShow] = useState(false);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      setReg(registration);

      // A new SW is already waiting (e.g. page was reloaded after update)
      if (registration.waiting) {
        setShow(true);
      }

      // Listen for a new SW entering the "installed/waiting" state
      const onUpdateFound = () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setShow(true);
          }
        });
      };
      registration.addEventListener("updatefound", onUpdateFound);
      return () => registration.removeEventListener("updatefound", onUpdateFound);
    });

    // When the active SW changes, reload the page to load fresh assets
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const applyUpdate = () => {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--gold)] rounded-2xl px-4 py-3 shadow-2xl shadow-black/30 max-w-sm w-[calc(100vw-2rem)]">
      <RefreshCw size={16} className="text-[var(--gold)] shrink-0" />
      <p className="text-sm text-[var(--text-primary)] flex-1">有新版本可用</p>
      <button
        onClick={applyUpdate}
        className="text-xs font-semibold text-[var(--gold)] hover:underline shrink-0"
      >
        立即更新
      </button>
      <button
        onClick={() => setShow(false)}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
