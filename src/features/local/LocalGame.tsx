"use client";

import { useState } from "react";
import { GameScreen } from "@/components/game/GameScreen";
import { StatusLine } from "@/components/game/StatusLine";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocalMatch } from "@/hooks/useLocalMatch";
import type { Players } from "@/lib/game/types";

type Props = {
  players: Players;
  onEditPlayers: () => void;
};

export function LocalGame({ players, onEditPlayers }: Props) {
  const match = useLocalMatch({ mode: "local", players, startingPlayer: "player1" });
  const { game } = match;
  const [confirmReset, setConfirmReset] = useState(false);
  const movesMade = game.board.some((c) => c !== null);

  let status;
  if (game.outcome === "draw") status = <StatusLine>It&apos;s a draw</StatusLine>;
  else if (game.outcome) status = <StatusLine player={players[game.outcome]}>{players[game.outcome].name} wins!</StatusLine>;
  else status = <StatusLine player={players[game.currentPlayer]}>{players[game.currentPlayer].name}&apos;s turn</StatusLine>;

  return (
    <>
      <GameScreen
        title="Local match"
        subtitle="Pass the device between turns"
        backHref="/"
        backLabel="All modes"
        players={players}
        game={game}
        score={match.score}
        status={status}
        interactive={game.outcome === null}
        onCellSelect={match.play}
        previewPlayer={game.currentPlayer}
        banner={
          game.outcome && (
            <Button onClick={match.nextRound} autoFocus>
              Rematch
            </Button>
          )
        }
        actions={
          <>
            {!game.outcome && (
              <Button variant="secondary" onClick={match.restartRound} disabled={!movesMade}>
                Restart round
              </Button>
            )}
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              Reset scores
            </Button>
            <Button variant="ghost" onClick={onEditPlayers}>
              Edit players
            </Button>
          </>
        }
        aside={<HistoryPanel mode="local" />}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset scores?"
        message="Both scores go back to zero and a fresh board starts. Session history is kept."
        confirmLabel="Reset scores"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          match.resetScores();
          setConfirmReset(false);
        }}
      />
    </>
  );
}
