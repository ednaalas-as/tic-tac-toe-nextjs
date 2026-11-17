import type { PlayerId } from "@/lib/game/types";

/** Must match the 60-second window in public.request_rematch(). */
export const REMATCH_TIMEOUT_MS = 60_000;

export type RematchState =
  | "none"
  | "sent"
  | "received"
  | "declined-by-them"
  | "declined-by-me"
  | "expired";

type RematchFields = {
  rematch_requested_by: string | null;
  rematch_requested_at: string | null;
  rematch_declined: boolean;
};

/** Derives what the rematch UI should show for `me` from the room row. */
export function getRematchState(room: RematchFields, me: PlayerId, now: number): RematchState {
  if (!room.rematch_requested_by || !room.rematch_requested_at) return "none";
  const mine = room.rematch_requested_by === me;
  if (room.rematch_declined) return mine ? "declined-by-them" : "declined-by-me";
  if (Date.parse(room.rematch_requested_at) + REMATCH_TIMEOUT_MS < now) return "expired";
  return mine ? "sent" : "received";
}
