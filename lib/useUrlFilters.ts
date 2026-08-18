"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

/**
 * Two-way sync between a set of URL query-param "filters" and instantly
 * responsive local state.
 *
 * Pushing a fresh URL on every input change (the page is `force-dynamic`) made
 * the report/appliance filters flicker: the controlled inputs were bound
 * straight to the URL, so they only updated after a full server round-trip —
 * appearing to freeze — and rapid changes raced, so the numbers toggled
 * between the old and new results. This hook fixes both:
 *
 *   - local state updates synchronously, so the inputs never feel frozen;
 *   - a ref merges rapid successive edits, so none are dropped (no toggling);
 *   - navigation runs inside a transition using `replace` (no history spam), so
 *     the most recent change always wins and `isPending` can show progress;
 *   - the URL stays the source of truth for the server render, and external
 *     navigation (back/forward, shared links) resyncs the inputs.
 *
 * `keys` must be a stable (module-level) array of the param names to manage.
 */
export function useUrlFilters<K extends string>(
  keys: readonly K[]
): {
  values: Record<K, string>;
  setFilter: (key: K, value: string) => void;
  isPending: boolean;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const readFromUrl = useCallback((): Record<K, string> => {
    const out = {} as Record<K, string>;
    for (const k of keys) out[k] = searchParams.get(k) ?? "";
    return out;
  }, [keys, searchParams]);

  const [values, setValues] = useState<Record<K, string>>(readFromUrl);

  // Always-current snapshot so rapid successive edits merge correctly.
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // The query string we last pushed ourselves; the resync effect ignores it so
  // it never echoes our own change back over a newer local edit.
  const lastPushedRef = useRef<string | null>(null);
  const currentQs = searchParams.toString();

  useEffect(() => {
    if (lastPushedRef.current === currentQs) return; // our own change — skip
    setValues(readFromUrl());
  }, [currentQs, readFromUrl]);

  const setFilter = useCallback(
    (key: K, value: string) => {
      const next = { ...valuesRef.current, [key]: value };
      valuesRef.current = next;
      setValues(next);

      // Preserve any unrelated params; overwrite the ones we manage from the
      // freshest merged state (not a possibly-stale searchParams snapshot).
      const params = new URLSearchParams(window.location.search);
      for (const k of keys) {
        if (next[k]) params.set(k, next[k]);
        else params.delete(k);
      }
      const qs = params.toString();
      lastPushedRef.current = qs;
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [keys, pathname, router]
  );

  return { values, setFilter, isPending };
}
