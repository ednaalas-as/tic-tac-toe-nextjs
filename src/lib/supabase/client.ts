"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Browser Supabase client.
 *
 * Only the *publishable* key is used here; it is safe to expose. All
 * privileged logic lives in Postgres functions guarded by RLS — this app
 * needs no service-role key at all.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient<Database> | null = null;

export function isOnlineConfigured(): boolean {
  return Boolean(url && key);
}

export function getSupabase(): SupabaseClient<Database> {
  if (!url || !key) {
    throw new Error("Online play is not configured: missing Supabase environment variables.");
  }
  client ??= createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "triad:auth" },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}

let pendingSession: Promise<string> | null = null;

/**
 * Returns the current player's user id, signing in anonymously the first
 * time. The session is stored in localStorage, so refreshing the page or
 * reopening the tab keeps the same identity (which is how reconnecting works).
 */
export function ensurePlayerSession(): Promise<string> {
  pendingSession ??= (async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // Make sure the stored session is still valid on the server.
      const { data: userData, error } = await supabase.auth.getUser();
      if (!error && userData.user) return userData.user.id;
      await supabase.auth.signOut({ scope: "local" });
    }
    const { data: signIn, error } = await supabase.auth.signInAnonymously();
    if (error || !signIn.user) throw error ?? new Error("Could not start an online session.");
    return signIn.user.id;
  })().catch((error) => {
    pendingSession = null;
    throw error;
  });
  return pendingSession;
}
