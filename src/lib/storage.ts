"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny persisted-state hook built on `useSyncExternalStore`.
 *
 * - The server (and the first client render) sees `fallback`, so hydration
 *   never mismatches; the stored value appears right after.
 * - All components using the same key stay in sync, including across tabs.
 * - Storage failures (private mode, quota, disabled storage) fall back to
 *   in-memory behaviour instead of crashing the game.
 */

type Area = "local" | "session";

const CHANGE_EVENT = "triad:storage";
const cache = new Map<string, { raw: string | null; value: unknown }>();
const memory = new Map<string, string>();

function getArea(area: Area): Storage | null {
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readRaw(area: Area, key: string): string | null {
  // The in-memory copy is only a fallback for when storage is unavailable.
  try {
    const storage = getArea(area);
    if (storage) return storage.getItem(key);
  } catch {
    // fall through
  }
  return memory.get(`${area}:${key}`) ?? null;
}

export function writeStored<T>(area: Area, key: string, value: T): void {
  const raw = JSON.stringify(value);
  memory.set(`${area}:${key}`, raw);
  try {
    getArea(area)?.setItem(key, raw);
  } catch {
    // Storage unavailable: the in-memory copy still works for this tab.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/**
 * @param fallback must be a stable reference (e.g. a module-level constant).
 * @param parse validates/normalises stored data; return `fallback` if invalid.
 */
export function useStoredState<T>(
  key: string,
  fallback: T,
  parse: (stored: unknown) => T = (stored) => stored as T,
  area: Area = "local",
): [T, (next: T | ((previous: T) => T)) => void] {
  const cacheKey = `${area}:${key}`;

  const getSnapshot = useCallback((): T => {
    const raw = readRaw(area, key);
    const cached = cache.get(cacheKey);
    if (cached && cached.raw === raw) return cached.value as T;

    let value = fallback;
    if (raw !== null) {
      try {
        value = parse(JSON.parse(raw));
      } catch {
        value = fallback;
      }
    }
    cache.set(cacheKey, { raw, value });
    return value;
  }, [area, key, cacheKey, fallback, parse]);

  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (previous: T) => T)(getSnapshot()) : next;
      writeStored(area, key, resolved);
    },
    [area, key, getSnapshot],
  );

  return [value, setValue];
}
