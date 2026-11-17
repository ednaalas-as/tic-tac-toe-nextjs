import type { ReactNode } from "react";
import { SymbolGlyph } from "@/components/symbols/SymbolGlyph";
import type { PlayerProfile } from "@/lib/game/types";

/** "<symbol> Text" — the symbol is decorative; the text carries the meaning. */
export function StatusLine({ player, children }: { player?: PlayerProfile; children: ReactNode }) {
  return (
    <>
      {player && (
        <SymbolGlyph symbol={player.symbol} tone={player.id === "player1" ? "p1" : "p2"} size="md" />
      )}
      <span>{children}</span>
    </>
  );
}
