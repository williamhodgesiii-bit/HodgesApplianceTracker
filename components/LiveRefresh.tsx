"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the page fresh when several people are using the app at once. Every
 * `intervalMs` (and whenever the tab regains focus) it re-fetches the server
 * data via router.refresh(). Because all pages are dynamic, one person's edits
 * show up for everyone else within a few seconds.
 *
 * router.refresh() only updates server-rendered data — local client state like
 * an in-progress inline edit or the dashboard filters stays put, so a refresh
 * never interrupts what someone is typing.
 */
export function LiveRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const timer = setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}
