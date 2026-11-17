/**
 * The curated symbol library.
 *
 * Symbols are referenced everywhere by their stable `id`. The same list of
 * ids is enforced in the database (see `is_valid_symbol` in the Supabase
 * migration); a unit test keeps the two in sync.
 */

export type SymbolCategory = "Classic" | "Nature" | "Sky" | "Shapes" | "Friends" | "Treats";

export type GameSymbol = {
  readonly id: string;
  readonly label: string;
  /** Emoji glyph. The classic X and O are drawn as SVG instead. */
  readonly glyph: string;
  readonly category: SymbolCategory;
};

export const SYMBOLS: readonly GameSymbol[] = [
  { id: "x", label: "Cross", glyph: "✕", category: "Classic" },
  { id: "o", label: "Ring", glyph: "◯", category: "Classic" },

  { id: "heart", label: "Heart", glyph: "❤️", category: "Shapes" },
  { id: "diamond", label: "Diamond", glyph: "💎", category: "Shapes" },
  { id: "crown", label: "Crown", glyph: "👑", category: "Shapes" },
  { id: "bolt", label: "Lightning", glyph: "⚡", category: "Shapes" },
  { id: "fire", label: "Flame", glyph: "🔥", category: "Shapes" },

  { id: "star", label: "Star", glyph: "⭐", category: "Sky" },
  { id: "moon", label: "Moon", glyph: "🌙", category: "Sky" },
  { id: "sun", label: "Sun", glyph: "☀️", category: "Sky" },
  { id: "rainbow", label: "Rainbow", glyph: "🌈", category: "Sky" },
  { id: "snowflake", label: "Snowflake", glyph: "❄️", category: "Sky" },

  { id: "flower", label: "Blossom", glyph: "🌸", category: "Nature" },
  { id: "clover", label: "Clover", glyph: "🍀", category: "Nature" },
  { id: "sunflower", label: "Sunflower", glyph: "🌻", category: "Nature" },
  { id: "leaf", label: "Leaf", glyph: "🍁", category: "Nature" },
  { id: "cactus", label: "Cactus", glyph: "🌵", category: "Nature" },

  { id: "smile", label: "Smiley", glyph: "😊", category: "Friends" },
  { id: "cat", label: "Cat", glyph: "🐱", category: "Friends" },
  { id: "fox", label: "Fox", glyph: "🦊", category: "Friends" },
  { id: "frog", label: "Frog", glyph: "🐸", category: "Friends" },
  { id: "ghost", label: "Ghost", glyph: "👻", category: "Friends" },
  { id: "robot", label: "Robot", glyph: "🤖", category: "Friends" },

  { id: "cherry", label: "Cherries", glyph: "🍒", category: "Treats" },
  { id: "donut", label: "Donut", glyph: "🍩", category: "Treats" },
  { id: "pizza", label: "Pizza", glyph: "🍕", category: "Treats" },
  { id: "avocado", label: "Avocado", glyph: "🥑", category: "Treats" },
];

export const SYMBOL_CATEGORIES: readonly SymbolCategory[] = [
  "Classic",
  "Shapes",
  "Sky",
  "Nature",
  "Friends",
  "Treats",
];

const SYMBOLS_BY_ID = new Map(SYMBOLS.map((s) => [s.id, s]));

export const DEFAULT_SYMBOLS = { player1: "x", player2: "o" } as const;
export const COMPUTER_SYMBOL = "robot";

export function isValidSymbol(id: string): boolean {
  return SYMBOLS_BY_ID.has(id);
}

export function getSymbol(id: string): GameSymbol {
  return SYMBOLS_BY_ID.get(id) ?? SYMBOLS[0];
}

/**
 * Returns `preferred` if it is valid and not `taken`, otherwise the first
 * symbol from `fallbacks` (then the whole library) that is free.
 */
export function resolveSymbol(
  preferred: string | undefined,
  taken: string | undefined,
  fallbacks: readonly string[] = [],
): string {
  const candidates = [preferred, ...fallbacks, ...SYMBOLS.map((s) => s.id)];
  for (const id of candidates) {
    if (id && isValidSymbol(id) && id !== taken) return id;
  }
  return SYMBOLS[0].id;
}
