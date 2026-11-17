"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { SymbolGlyph } from "@/components/symbols/SymbolGlyph";
import { getSymbol } from "@/lib/game/symbols";
import type { Board as BoardCells, PlayerId, Players } from "@/lib/game/types";
import styles from "./Board.module.css";

type Props = {
  board: BoardCells;
  players: Players;
  winningLine: readonly number[] | null;
  /** Whether the local user may place a symbol right now. */
  interactive: boolean;
  onSelect: (index: number) => void;
  /** Cell waiting for server confirmation (online mode). */
  pendingCell?: { index: number; player: PlayerId } | null;
  /** Player whose symbol to preview on hover. */
  previewPlayer?: PlayerId;
  /** Draw outcome: gently shake the board. */
  isDraw?: boolean;
};

const TONE = { player1: "p1", player2: "p2" } as const;

/**
 * 3×3 grid of buttons. Supports mouse/touch and full keyboard play:
 * arrow keys move between cells (roving tabindex), Enter/Space plays.
 */
export function Board({
  board,
  players,
  winningLine,
  interactive,
  onSelect,
  pendingCell,
  previewPlayer,
  isDraw,
}: Props) {
  const [focusIndex, setFocusIndex] = useState(4);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function moveFocus(event: KeyboardEvent, index: number) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const targets: Record<string, number> = {
      ArrowUp: ((row + 2) % 3) * 3 + col,
      ArrowDown: ((row + 1) % 3) * 3 + col,
      ArrowLeft: row * 3 + ((col + 2) % 3),
      ArrowRight: row * 3 + ((col + 1) % 3),
    };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setFocusIndex(next);
    cellRefs.current[next]?.focus();
  }

  return (
    <div className={`${styles.wrap} ${isDraw ? styles.draw : ""}`}>
      <div role="grid" aria-label="Game board" className={styles.board}>
        {[0, 1, 2].map((row) => (
          <div role="row" key={row} className={styles.row}>
            {[0, 1, 2].map((col) => {
              const index = row * 3 + col;
              const owner = board[index] ?? (pendingCell?.index === index ? pendingCell.player : null);
              const isPending = !board[index] && pendingCell?.index === index;
              const isWinning = winningLine?.includes(index) ?? false;
              const canPlay = interactive && owner === null;
              const ownerLabel = owner
                ? `${possessive(players[owner].name)} ${getSymbol(players[owner].symbol).label.toLowerCase()}`
                : "empty";

              return (
                <div role="gridcell" key={col} className={styles.gridcell}>
                  <button
                    ref={(el) => {
                      cellRefs.current[index] = el;
                    }}
                    type="button"
                    className={[
                      styles.cell,
                      canPlay && styles.playable,
                      isWinning && styles.winning,
                      winningLine && !isWinning && styles.faded,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    tabIndex={focusIndex === index ? 0 : -1}
                    aria-disabled={!canPlay}
                    aria-label={`Row ${row + 1}, column ${col + 1}: ${ownerLabel}${isWinning ? ", winning cell" : ""}`}
                    data-cell={index}
                    onFocus={() => setFocusIndex(index)}
                    onKeyDown={(e) => moveFocus(e, index)}
                    onClick={() => canPlay && onSelect(index)}
                  >
                    {owner ? (
                      <SymbolGlyph
                        symbol={players[owner].symbol}
                        tone={TONE[owner]}
                        size="board"
                        animate
                        className={isPending ? styles.pending : undefined}
                      />
                    ) : (
                      canPlay &&
                      previewPlayer && (
                        <SymbolGlyph
                          symbol={players[previewPlayer].symbol}
                          tone={TONE[previewPlayer]}
                          size="board"
                          className={styles.ghost}
                        />
                      )
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {winningLine && <WinningStroke line={winningLine} />}
    </div>
  );
}

/** "Ana" → "Ana's", "Chris" → "Chris'", "You" → "your". */
export function possessive(name: string): string {
  if (name.toLowerCase() === "you") return "your";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

/** A line drawn through the three winning cells. */
function WinningStroke({ line }: { line: readonly number[] }) {
  const center = (i: number) => ({ x: (i % 3) * 100 + 50, y: Math.floor(i / 3) * 100 + 50 });
  const a = center(line[0]);
  const b = center(line[2]);
  // Extend the stroke slightly beyond the outer cell centres.
  const dx = (b.x - a.x) * 0.17;
  const dy = (b.y - a.y) * 0.17;
  return (
    <svg className={styles.stroke} viewBox="0 0 300 300" aria-hidden="true">
      <line x1={a.x - dx} y1={a.y - dy} x2={b.x + dx} y2={b.y + dy} pathLength={1} />
    </svg>
  );
}
