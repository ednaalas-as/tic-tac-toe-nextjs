import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Server-authority tests against the real Supabase project.
 * They talk to the database exactly like a (possibly malicious) browser
 * would: with the public key and an anonymous session.
 *
 * Run with: npm run test:integration   (needs .env.local)
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const enabled = Boolean(process.env.RUN_INTEGRATION && url && key);

function newClient() {
  return createClient<Database>(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signedIn() {
  const client = newClient();
  const { error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return client;
}

describe.runIf(enabled)("online rules are enforced by the database", () => {
  let host: Awaited<ReturnType<typeof signedIn>>;
  let guest: Awaited<ReturnType<typeof signedIn>>;
  let stranger: Awaited<ReturnType<typeof signedIn>>;
  let roomId: string;
  let code: string;

  beforeAll(async () => {
    [host, guest, stranger] = await Promise.all([signedIn(), signedIn(), signedIn()]);
    const { data, error } = await host.rpc("create_room", { p_name: "Ana", p_symbol: "heart" });
    if (error) throw error;
    roomId = data.id;
    code = data.code;
  });

  it("rejects calls without a session", async () => {
    const { error } = await newClient().rpc("create_room", { p_name: "x", p_symbol: "x" });
    expect(error?.message).toMatch(/permission denied/);
  });

  it("shows a limited preview to visitors and hides player ids", async () => {
    const { data } = await guest.rpc("get_room_preview", { p_code: code });
    expect(data).toMatchObject({ state: "open", host_name: "Ana", host_symbol: "heart", room_id: null });
    const missing = await guest.rpc("get_room_preview", { p_code: "ZZZZZZ" });
    expect(missing.data).toMatchObject({ state: "not_found" });
  });

  it("rejects a duplicate symbol, invalid symbol and empty name", async () => {
    expect((await guest.rpc("join_room", { p_code: code, p_name: "Ben", p_symbol: "heart" })).error?.message).toBe("symbol_taken");
    expect((await guest.rpc("join_room", { p_code: code, p_name: "Ben", p_symbol: "unicorn" })).error?.message).toBe("invalid_symbol");
    expect((await guest.rpc("join_room", { p_code: code, p_name: "   ", p_symbol: "star" })).error?.message).toBe("invalid_name");
  });

  it("lets the second player join, then refuses a third", async () => {
    const joined = await guest.rpc("join_room", { p_code: code, p_name: "Ben", p_symbol: "star" });
    expect(joined.data?.status).toBe("playing");
    const third = await stranger.rpc("join_room", { p_code: code, p_name: "Cy", p_symbol: "sun" });
    expect(third.error?.message).toBe("room_full");
  });

  it("hides the room from non-members and blocks direct writes", async () => {
    const read = await stranger.from("rooms").select("*").eq("id", roomId);
    expect(read.data).toEqual([]);
    const move = await stranger.rpc("make_move", { p_room_id: roomId, p_cell: 0 });
    expect(move.error?.message).toBe("not_a_player");
    const write = await host.from("rooms").update({ board: "111------" }).eq("id", roomId).select();
    expect(write.data ?? []).toEqual([]);
    const after = await host.from("rooms").select("board").eq("id", roomId).single();
    expect(after.data?.board).toBe("---------");
  });

  it("enforces turn order and rejects out-of-range cells", async () => {
    expect((await guest.rpc("make_move", { p_room_id: roomId, p_cell: 0 })).error?.message).toBe("not_your_turn");
    expect((await host.rpc("make_move", { p_room_id: roomId, p_cell: 9 })).error?.message).toBe("invalid_cell");
  });

  it("accepts only one of two simultaneous moves", async () => {
    const results = await Promise.all([
      host.rpc("make_move", { p_room_id: roomId, p_cell: 0 }),
      host.rpc("make_move", { p_room_id: roomId, p_cell: 1 }),
    ]);
    const ok = results.filter((r) => !r.error);
    expect(ok).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.message).toBe("not_your_turn");
  });

  it("rejects occupied cells, decides the winner, and locks the board", async () => {
    const { data: room } = await host.from("rooms").select("board").eq("id", roomId).single();
    const taken = room!.board.indexOf("1");
    expect((await guest.rpc("make_move", { p_room_id: roomId, p_cell: taken })).error?.message).toBe("cell_occupied");

    // Finish the top row for the host: guest plays 3 and 4.
    const hostCells = [0, 1, 2].filter((c) => c !== taken);
    await guest.rpc("make_move", { p_room_id: roomId, p_cell: 3 });
    await host.rpc("make_move", { p_room_id: roomId, p_cell: hostCells[0] });
    await guest.rpc("make_move", { p_room_id: roomId, p_cell: 4 });
    const final = await host.rpc("make_move", { p_room_id: roomId, p_cell: hostCells[1] });
    expect(final.data).toMatchObject({ status: "finished", outcome: "player1", player1_score: 1 });
    expect(final.data?.winning_line).toEqual([0, 1, 2]);

    expect((await guest.rpc("make_move", { p_room_id: roomId, p_cell: 8 })).error?.message).toBe("game_not_active");
  });

  it("starts a new round only after both players agree, keeping scores", async () => {
    const asked = await host.rpc("request_rematch", { p_room_id: roomId });
    expect(asked.data).toMatchObject({ status: "finished", rematch_requested_by: "player1" });
    // Asking twice does not start the round on its own.
    const again = await host.rpc("request_rematch", { p_room_id: roomId });
    expect(again.data?.status).toBe("finished");

    const accepted = await guest.rpc("request_rematch", { p_room_id: roomId });
    expect(accepted.data).toMatchObject({
      status: "playing",
      round: 2,
      board: "---------",
      current_turn: "player2",
      player1_score: 1,
    });
    const rounds = await guest.from("room_rounds").select("round,outcome").eq("room_id", roomId);
    expect(rounds.data).toEqual([{ round: 1, outcome: "player1" }]);
  });

  it("marks the room abandoned when a player leaves", async () => {
    const left = await guest.rpc("leave_room", { p_room_id: roomId });
    expect(left.data).toMatchObject({ status: "abandoned", left_by: "player2" });
    expect((await host.rpc("make_move", { p_room_id: roomId, p_cell: 5 })).error?.message).toBe("game_not_active");
  });
});
