"use client";

import { useCallback, useEffect, useState } from "react";

/** Copy-to-clipboard with a short-lived "copied" confirmation. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setError(null);
      setCopied(label);
    } catch {
      setError("Couldn't access the clipboard. Select the text and copy it manually.");
    }
  }, []);

  return { copy, copied, error };
}
