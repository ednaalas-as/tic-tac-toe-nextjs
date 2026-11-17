import Link from "next/link";
import { SymbolGlyph } from "@/components/symbols/SymbolGlyph";
import styles from "./page.module.css";

const MODES = [
  {
    href: "/play/computer",
    title: "Player vs Computer",
    description: "Three difficulty levels, from a gentle warm-up to an opponent that never loses.",
    symbols: ["heart", "robot"],
  },
  {
    href: "/play/local",
    title: "Local multiplayer",
    description: "Two players, one screen. Pick your symbols and pass the device. Works offline.",
    symbols: ["sun", "moon"],
  },
  {
    href: "/online",
    title: "Online multiplayer",
    description: "Create a private room, share the link, and play from anywhere in real time.",
    symbols: ["star", "flower"],
  },
] as const;

// A finished game drawn on the hero board: heart wins on the diagonal.
const HERO_BOARD = ["heart", "star", "", "", "heart", "star", "", "", "heart"];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Tic-tac-toe, three ways</p>
          <h1 className={styles.title}>
            Three in a row.
            <br />
            Your symbols, your rules.
          </h1>
          <p className={styles.lede}>
            Play the computer, a friend beside you, or someone across the world. Swap X and O for
            hearts, moons, foxes — whatever feels like you.
          </p>
        </div>
        <div className={styles.heroBoard} aria-hidden="true">
          {HERO_BOARD.map((symbol, i) => (
            <span key={i} className={`${styles.heroCell} ${[0, 4, 8].includes(i) ? styles.heroWin : ""}`}>
              {symbol && <SymbolGlyph symbol={symbol} size="lg" />}
            </span>
          ))}
        </div>
      </section>

      <nav aria-label="Game modes">
        <ul className={styles.modes}>
          {MODES.map((mode, index) => (
            <li key={mode.href}>
              <Link href={mode.href} className={styles.mode}>
                <span className={styles.number} aria-hidden="true">
                  0{index + 1}
                </span>
                <span className={styles.modeText}>
                  <span className={styles.modeTitle}>{mode.title}</span>
                  <span className={styles.modeDescription}>{mode.description}</span>
                </span>
                <span className={styles.modeSymbols} aria-hidden="true">
                  <SymbolGlyph symbol={mode.symbols[0]} size="md" />
                  <SymbolGlyph symbol={mode.symbols[1]} size="md" />
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
