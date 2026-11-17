import { getSymbol } from "@/lib/game/symbols";
import styles from "./SymbolGlyph.module.css";

type Props = {
  symbol: string;
  /** Seat colour for the classic X / O strokes. */
  tone?: "p1" | "p2" | "ink";
  size?: "sm" | "md" | "lg" | "board";
  /** Animate the strokes being drawn (board placement). */
  animate?: boolean;
  className?: string;
};

/**
 * Renders a symbol by id. X and O are drawn as SVG strokes so they look
 * crisp and on-brand; every other symbol is an emoji.
 * Decorative by default (aria-hidden): surrounding UI provides the label.
 */
export function SymbolGlyph({ symbol, tone = "ink", size = "md", animate = false, className }: Props) {
  const classes = [styles.glyph, styles[size], styles[tone], animate && styles.animate, className]
    .filter(Boolean)
    .join(" ");

  if (symbol === "x") {
    return (
      <svg className={classes} viewBox="0 0 100 100" aria-hidden="true">
        <path className={styles.stroke} d="M24 24 L76 76" pathLength={1} />
        <path className={`${styles.stroke} ${styles.second}`} d="M76 24 L24 76" pathLength={1} />
      </svg>
    );
  }
  if (symbol === "o") {
    return (
      <svg className={classes} viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.stroke} cx="50" cy="50" r="27" pathLength={1} />
      </svg>
    );
  }
  return (
    <span className={`${classes} ${styles.emoji}`} aria-hidden="true">
      {getSymbol(symbol).glyph}
    </span>
  );
}
