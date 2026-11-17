import { SymbolGlyph } from "@/components/symbols/SymbolGlyph";
import { getSymbol } from "@/lib/game/symbols";
import type { PlayerProfile } from "@/lib/game/types";
import styles from "./PlayerCard.module.css";

type Props = {
  player: PlayerProfile;
  score: number;
  isTurn: boolean;
  isWinner: boolean;
  /** Short extra label, e.g. "You", "Hard", "Offline". */
  tag?: string;
  tagTone?: "neutral" | "warning";
  /** Optional status shown under the name, e.g. "Thinking…". */
  activity?: string;
};

export function PlayerCard({ player, score, isTurn, isWinner, tag, tagTone = "neutral", activity }: Props) {
  const tone = player.id === "player1" ? "p1" : "p2";
  return (
    <div
      className={[styles.card, styles[tone], isTurn && styles.turn, isWinner && styles.winner]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${player.name}, playing ${getSymbol(player.symbol).label}, ${score} ${
        score === 1 ? "win" : "wins"
      }${isTurn ? ", to move" : ""}${isWinner ? ", winner" : ""}`}
      role="group"
    >
      <span className={styles.avatar}>
        <SymbolGlyph symbol={player.symbol} tone={tone} size="md" />
      </span>
      <span className={styles.info}>
        <span className={styles.name}>{player.name}</span>
        <span className={styles.meta}>
          {tag && <span className={`${styles.tag} ${tagTone === "warning" ? styles.warning : ""}`}>{tag}</span>}
          {isTurn && !activity && <span className={styles.turnLabel}>To move</span>}
          {activity && <span className={styles.activity}>{activity}</span>}
          {isWinner && <span className={styles.turnLabel}>Winner</span>}
        </span>
      </span>
      <span className={styles.score} aria-hidden="true">
        {score}
      </span>
    </div>
  );
}
