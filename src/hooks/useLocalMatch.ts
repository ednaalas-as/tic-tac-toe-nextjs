"use client";

import { useCallback, useReducer, useState } from "react";
import { useApp } from "@/context/AppProviders";
import { makeMove } from "@/lib/game/engine";
import { createMatch, matchReducer, totalGames } from "@/lib/game/match";
import type { GameMode, PlayerId, Players } from "@/lib/game/types";
import { useSound } from "./useSound";

type Options = {
  mode: Exclude<GameMode, "online">;
  players: Players;
  startingPlayer: PlayerId;
  /** Extra history context, e.g. "Hard". */
  detail?: string;
  /** Which seat "you" are, to pick the win/lose sound in vs-computer mode. */
  localPlayer?: PlayerId;
};

/**
 * Runs a match on this device (local and vs-computer modes): the reducer
 * holds the game, and finished rounds are written to session history.
 */
export function useLocalMatch({ mode, players, startingPlayer, detail, localPlayer }: Options) {
  const [state, dispatch] = useReducer(matchReducer, undefined, () =>
    createMatch(players, startingPlayer),
  );
  const [matchId] = useState(() => Math.random().toString(36).slice(2));
  const { recordResult } = useApp();
  const playSound = useSound();

  const play = useCallback(
    (index: number) => {
      const next = makeMove(state.game, index);
      if (next === state.game) return; // illegal: ignore
      dispatch({ type: "move", index });
      playSound("move", state.game.currentPlayer);

      if (next.outcome) {
        const won = next.outcome !== "draw";
        playSound(!won ? "draw" : localPlayer && next.outcome !== localPlayer ? "lose" : "win");
        recordResult({
          id: `${mode}-${matchId}-${totalGames(state.score) + 1}`,
          mode,
          finishedAt: Date.now(),
          outcome: next.outcome,
          detail,
          players: {
            player1: { name: state.players.player1.name, symbol: state.players.player1.symbol },
            player2: { name: state.players.player2.name, symbol: state.players.player2.symbol },
          },
        });
      }
    },
    [state, mode, matchId, detail, localPlayer, playSound, recordResult],
  );

  return {
    ...state,
    play,
    nextRound: useCallback(() => dispatch({ type: "next-round" }), []),
    restartRound: useCallback(() => dispatch({ type: "restart-round" }), []),
    resetScores: useCallback(() => dispatch({ type: "reset-scores" }), []),
  };
}
