"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Board } from "@/components/board/Board";
import { PlayerCard } from "@/components/players/PlayerCard";
import { totalGames } from "@/lib/game/match";
import type { GameState, PlayerId, Players, Score } from "@/lib/game/types";
import styles from "./GameScreen.module.css";

export type PlayerDecoration = {
  tag?: string;
  tagTone?: "neutral" | "warning";
  activity?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  players: Players;
  game: GameState;
  score: Score;
  status: ReactNode;
  interactive: boolean;
  onCellSelect: (index: number) => void;
  previewPlayer?: PlayerId;
  pendingCell?: { index: number; player: PlayerId } | null;
  decorations?: Partial<Record<PlayerId, PlayerDecoration>>;
  /** Result / rematch area shown under the board. */
  banner?: ReactNode;
  actions?: ReactNode;
  /** Secondary content, e.g. history. */
  aside?: ReactNode;
};

/**
 * The shared game layout used by all three modes. It is purely
 * presentational: each mode decides what is interactive and what to show.
 */
export function GameScreen({
  title,
  subtitle,
  backHref,
  backLabel,
  players,
  game,
  score,
  status,
  interactive,
  onCellSelect,
  previewPlayer,
  pendingCell,
  decorations = {},
  banner,
  actions,
  aside,
}: Props) {
  const total = totalGames(score);
  return (
    <div className={styles.screen}>
      <div className={styles.top}>
        <Link href={backHref} className={styles.back}>
          <span aria-hidden="true">←</span> {backLabel}
        </Link>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      <section className={styles.players} aria-label="Scoreboard">
        {(["player1", "player2"] as const).map((id) => (
          <PlayerCard
            key={id}
            player={players[id]}
            score={score[id]}
            isTurn={game.outcome === null && game.currentPlayer === id}
            isWinner={game.outcome === id}
            {...decorations[id]}
          />
        ))}
        <p className={styles.tally}>
          <span>
            <strong>{score.draws}</strong> {score.draws === 1 ? "draw" : "draws"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong>{total}</strong> {total === 1 ? "game" : "games"}
          </span>
        </p>
      </section>

      <div className={styles.status} role="status" aria-live="polite">
        {status}
      </div>

      <Board
        board={game.board}
        players={players}
        winningLine={game.winningLine}
        interactive={interactive}
        onSelect={onCellSelect}
        previewPlayer={previewPlayer}
        pendingCell={pendingCell}
        isDraw={game.outcome === "draw"}
      />

      {banner && <div className={styles.banner}>{banner}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
      {aside && <div className={styles.aside}>{aside}</div>}
    </div>
  );
}
