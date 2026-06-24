"use client";

import { useEffect, useRef } from "react";
import { doSignOut } from "@/app/(authed)/sign-out-action";

// Keep in sync with SESSION_MAX_AGE_SECONDS in lib/auth.ts.
const IDLE_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 hours
const CHECK_INTERVAL_MS = 60 * 1000; // re-check once a minute
const STORAGE_KEY = "appliance-last-active";
const WRITE_THROTTLE_MS = 5000;

/**
 * Signs the user out after 12 hours with no real interaction. Activity is shared
 * across tabs via localStorage, so working in one tab keeps the others alive, and
 * a tab restored after the limit logs out immediately. This is the "inactivity"
 * half of the timeout; the NextAuth session maxAge is the server-side backstop
 * for when the browser was closed entirely.
 */
export function IdleLogout() {
  const lastActiveRef = useRef<number>(Date.now());
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const readStored = (): number => {
      const v = Number(localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(v) && v > 0 ? v : 0;
    };

    // Start from whatever the most recently active tab recorded.
    lastActiveRef.current = readStored() || Date.now();

    let lastWrite = 0;
    const markActive = () => {
      const now = Date.now();
      lastActiveRef.current = now;
      if (now - lastWrite > WRITE_THROTTLE_MS) {
        lastWrite = now;
        localStorage.setItem(STORAGE_KEY, String(now));
      }
    };

    const logout = () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      localStorage.removeItem(STORAGE_KEY);
      void doSignOut();
    };

    const check = () => {
      const last = Math.max(lastActiveRef.current, readStored());
      lastActiveRef.current = last;
      if (Date.now() - last >= IDLE_LIMIT_MS) logout();
    };

    // A tab reopened after the limit should bounce straight to login.
    check();

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ] as const;
    activityEvents.forEach((e) =>
      window.addEventListener(e, markActive, { passive: true })
    );

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        markActive();
        check();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        lastActiveRef.current = Math.max(
          lastActiveRef.current,
          Number(e.newValue)
        );
      }
    };
    window.addEventListener("storage", onStorage);

    const timer = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      activityEvents.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
      clearInterval(timer);
    };
  }, []);

  return null;
}
