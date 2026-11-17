import { SymbolGlyph } from "@/components/symbols/SymbolGlyph";
import { describeOutcome, type HistoryEntry } from "@/lib/game/history";
import styles from "./HistoryList.module.css";

const MODE_LABEL = { computer: "vs Computer", local: "Local", online: "Online" } as const;

type Props = {
  entries: readonly HistoryEntry[];
  emptyMessage?: string;
  showMode?: boolean;
};

export function HistoryList({ entries, emptyMessage = "No finished games yet.", showMode = true }: Props) {
  if (entries.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }
  return (
    <ol className={styles.list}>
      {entries.map((entry) => {
        const time = new Date(entry.finishedAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
        return (
          <li key={entry.id} className={styles.item}>
            <span className={styles.players}>
              {(["player1", "player2"] as const).map((id) => (
                <span
                  key={id}
                  className={`${styles.player} ${entry.outcome === id ? styles.won : ""}`}
                >
                  <SymbolGlyph
                    symbol={entry.players[id].symbol}
                    tone={id === "player1" ? "p1" : "p2"}
                    size="sm"
                  />
                  <span className={styles.name}>{entry.players[id].name}</span>
                </span>
              ))}
            </span>
            <span className={styles.result}>
              <strong>{describeOutcome(entry)}</strong>
              <span className={styles.meta}>
                {showMode && MODE_LABEL[entry.mode]}
                {entry.detail && ` · ${entry.detail}`}
                {" · "}
                <time dateTime={new Date(entry.finishedAt).toISOString()}>{time}</time>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
