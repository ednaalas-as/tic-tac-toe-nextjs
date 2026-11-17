import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getSymbol, isValidSymbol, resolveSymbol, SYMBOL_CATEGORIES, SYMBOLS } from "./symbols";

describe("symbol library", () => {
  it("has unique ids and includes every required kind of symbol", () => {
    const ids = SYMBOLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const required of ["x", "o", "heart", "star", "flower", "moon", "sun", "diamond", "crown", "bolt", "smile", "clover"]) {
      expect(ids).toContain(required);
    }
  });

  it("puts every symbol in a listed category", () => {
    for (const s of SYMBOLS) expect(SYMBOL_CATEGORIES).toContain(s.category);
  });

  it("matches the allow-list enforced by the database", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    const block = sql.match(/is_valid_symbol[\s\S]*?array\[([\s\S]*?)\]/);
    expect(block).not.toBeNull();
    const dbIds = [...block![1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    expect(dbIds).toEqual(SYMBOLS.map((s) => s.id).sort());
  });
});

describe("resolveSymbol", () => {
  it("keeps a valid, free preference", () => {
    expect(resolveSymbol("heart", "star")).toBe("heart");
  });

  it("never returns the taken symbol", () => {
    expect(resolveSymbol("star", "star", ["o"])).toBe("o");
    expect(resolveSymbol("star", "star")).not.toBe("star");
  });

  it("ignores unknown ids", () => {
    expect(isValidSymbol("unicorn")).toBe(false);
    expect(resolveSymbol("unicorn", undefined, ["moon"])).toBe("moon");
    expect(getSymbol("unicorn").id).toBe("x");
  });
});
