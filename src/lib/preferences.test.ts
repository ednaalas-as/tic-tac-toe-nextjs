import { describe, expect, it } from "vitest";
import { cleanName, parseComputerPrefs, parseLocalPrefs, parseSettings } from "./preferences";

describe("stored preference parsing", () => {
  it("trims, collapses whitespace and caps names", () => {
    expect(cleanName("  Ana   Maria ", "x")).toBe("Ana Maria");
    expect(cleanName("   ", "Player 1")).toBe("Player 1");
    expect(cleanName("a".repeat(40), "x")).toHaveLength(20);
    expect(cleanName(42, "fallback")).toBe("fallback");
  });

  it("falls back to defaults for corrupted data", () => {
    expect(parseComputerPrefs("garbage")).toMatchObject({ difficulty: "medium", firstMove: "human", symbol: "x" });
    expect(parseComputerPrefs({ difficulty: "impossible", symbol: "unicorn" })).toMatchObject({
      difficulty: "medium",
      symbol: "x",
    });
    expect(parseSettings(null)).toEqual({ sound: true, theme: "system" });
  });

  it("keeps names exactly as typed so inputs can be cleared or contain spaces", () => {
    expect(parseComputerPrefs({ name: "" }).name).toBe("");
    expect(parseLocalPrefs({ player1: { name: "Ana " } }).player1.name).toBe("Ana ");
  });

  it("repairs stored local players that share a symbol", () => {
    const prefs = parseLocalPrefs({
      player1: { name: "Ana", symbol: "heart" },
      player2: { name: "Ben", symbol: "heart" },
    });
    expect(prefs.player1.symbol).toBe("heart");
    expect(prefs.player2.symbol).not.toBe("heart");
  });
});
