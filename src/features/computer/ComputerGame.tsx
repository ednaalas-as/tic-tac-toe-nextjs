"use client";

import { useEffect, useState } from "react";
import { GameScreen } from "@/components/game/GameScreen";
import { StatusLine } from "@/components/game/StatusLine";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocalMatch } from "@/hooks/useLocalMatch";
import { chooseComputerMove, DIFFICULTY_INFO } from "@/lib/game/ai";
import type { ComputerConfig } from "./config";

/** How long the computer "thinks" before moving, in ms. */
const THINK_TIME = { easy: 450, medium: 600, hard: 750 } as const;

type Props = {
  config: ComputerConfig;
  subtitle: string;
  onEditSetup: () => void;
};

export function ComputerGame({ config, subtitle, onEditSetup }: Props) {
  const { players, difficulty } = config;
  const match = useLocalMatch({
    mode: "computer",
    players,
    startingPlayer: config.firstMove === "human" ? "player1" : "player2",
    detail: DIFFICULTY_INFO[difficulty].label,
    localPlayer: "player1",
  });
  const { game, play } = match;
  const [confirmReset, setConfirmReset] = useState(false);

  const computerTurn = game.outcome === null && game.currentPlayer === "player2";

  // Let the computer move after a short, natural-feeling pause.
  useEffect(() => {
    if (!computerTurn) return;
    const timer = window.setTimeout(() => {
      play(chooseComputerMove(game.board, "player2", difficulty));
    }, THINK_TIME[difficulty]);
    return () => window.clearTimeout(timer);
  }, [computerTurn, game.board, difficulty, play]);

  const human = players.player1;
  const computer = players.player2;
  const movesMade = game.board.some((c) => c !== null);

  let status;
  if (game.outcome === "player1") status = <StatusLine player={human}>You win!</StatusLine>;
  else if (game.outcome === "player2") status = <StatusLine player={computer}>{computer.name} wins</StatusLine>;
  else if (game.outcome === "draw") status = <StatusLine>It&apos;s a draw</StatusLine>;
  else if (computerTurn) status = <StatusLine player={computer}>{computer.name} is thinking…</StatusLine>;
  else status = <StatusLine player={human}>Your move</StatusLine>;

  return (
    <>
      <GameScreen
        title="vs Computer"
        subtitle={subtitle}
        backHref="/"
        backLabel="All modes"
        players={players}
        game={game}
        score={match.score}
        status={status}
        interactive={!computerTurn && game.outcome === null}
        onCellSelect={play}
        previewPlayer="player1"
        decorations={{
          player1: { tag: "You" },
          player2: {
            tag: `Computer · ${DIFFICULTY_INFO[difficulty].label}`,
            activity: computerTurn ? "Thinking" : undefined,
          },
        }}
        banner={
          game.outcome && (
            <Button onClick={match.nextRound} autoFocus>
              Play again
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
            <Button variant="ghost" onClick={onEditSetup}>
              Change setup
            </Button>
          </>
        }
        aside={<HistoryPanel mode="computer" />}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset scores?"
        message="This clears the scoreboard for this match and starts a fresh board. Your history stays."
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
