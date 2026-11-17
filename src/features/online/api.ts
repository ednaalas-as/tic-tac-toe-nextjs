"use client";

import { ensurePlayerSession, getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

export type RoomPreview =
  | { state: "not_found" | "expired" | "closed" | "full" }
  | { state: "open"; hostName: string; hostSymbol: string }
  | { state: "member"; roomId: string; hostName: string; hostSymbol: string };

/** Error codes raised by the Postgres functions, mapped to friendly text. */
const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Your online session expired. Please refresh the page.",
  room_not_found: "We couldn't find a room with that code.",
  room_expired: "This room has expired.",
  room_closed: "This room was closed.",
  room_full: "This room already has two players.",
  not_a_player: "You're not a player in this room.",
  symbol_taken: "Your opponent already picked that symbol. Please choose another.",
  invalid_symbol: "Please choose a symbol from the list.",
  invalid_name: "Please enter a name (up to 20 characters).",
  game_not_active: "This round is over.",
  not_your_turn: "Hold on — it's your opponent's turn.",
  cell_occupied: "That square is already taken.",
  invalid_cell: "That isn't a valid square.",
  rematch_unavailable: "A rematch can only be requested after a round ends.",
  no_rematch_request: "There's no rematch request to respond to.",
  symbol_locked: "You can change symbols between rounds.",
  could_not_create_room: "Couldn't create a room. Please try again.",
};

export class RoomError extends Error {
  constructor(public readonly code: string) {
    super(ERROR_MESSAGES[code] ?? "Something went wrong. Check your connection and try again.");
  }
}

function toRoomError(error: { message: string }): RoomError {
  return new RoomError(error.message in ERROR_MESSAGES ? error.message : "network");
}

export const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

async function call<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw toRoomError(error);
  if (data === null) throw new RoomError("network");
  return data;
}

export async function createRoom(name: string, symbol: string): Promise<RoomRow> {
  await ensurePlayerSession();
  return call(getSupabase().rpc("create_room", { p_name: name, p_symbol: symbol }));
}

export async function getRoomPreview(code: string): Promise<RoomPreview> {
  await ensurePlayerSession();
  const raw = (await call(getSupabase().rpc("get_room_preview", { p_code: code }))) as Record<string, string | null>;
  switch (raw.state) {
    case "open":
      return { state: "open", hostName: raw.host_name ?? "", hostSymbol: raw.host_symbol ?? "x" };
    case "member":
      return { state: "member", roomId: raw.room_id ?? "", hostName: raw.host_name ?? "", hostSymbol: raw.host_symbol ?? "x" };
    case "expired":
    case "closed":
    case "full":
      return { state: raw.state };
    default:
      return { state: "not_found" };
  }
}

export async function joinRoom(code: string, name: string, symbol: string): Promise<RoomRow> {
  await ensurePlayerSession();
  return call(getSupabase().rpc("join_room", { p_code: code, p_name: name, p_symbol: symbol }));
}

export async function fetchRoom(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await getSupabase().from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw toRoomError(error);
  return data;
}

export const makeMove = (roomId: string, cell: number) =>
  call(getSupabase().rpc("make_move", { p_room_id: roomId, p_cell: cell }));

export const requestRematch = (roomId: string) =>
  call(getSupabase().rpc("request_rematch", { p_room_id: roomId }));

export const declineRematch = (roomId: string) =>
  call(getSupabase().rpc("decline_rematch", { p_room_id: roomId }));

export const changeSymbol = (roomId: string, symbol: string) =>
  call(getSupabase().rpc("change_symbol", { p_room_id: roomId, p_symbol: symbol }));

export const leaveRoom = (roomId: string) =>
  call(getSupabase().rpc("leave_room", { p_room_id: roomId }));
