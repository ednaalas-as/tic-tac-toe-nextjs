"use client";

import { useCallback, useRef } from "react";
import { useApp } from "@/context/AppProviders";
import type { PlayerId } from "@/lib/game/types";

type Cue = "move" | "win" | "lose" | "draw";

/**
 * Short synthesized sound effects (Web Audio API): no audio files to ship,
 * and nothing plays unless the sound setting is on.
 */
export function useSound() {
  const { settings } = useApp();
  const contextRef = useRef<AudioContext | null>(null);

  return useCallback(
    (cue: Cue, player: PlayerId = "player1") => {
      if (!settings.sound || typeof window === "undefined" || !("AudioContext" in window)) return;
      try {
        contextRef.current ??= new AudioContext();
        const ctx = contextRef.current;
        const notes: Record<Cue, number[]> = {
          move: [player === "player1" ? 520 : 390],
          win: [523, 659, 784],
          lose: [392, 330, 262],
          draw: [440, 440],
        };
        notes[cue].forEach((frequency, i) => {
          const start = ctx.currentTime + i * 0.11;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.18);
        });
      } catch {
        // Audio is a nice-to-have; never let it break the game.
      }
    },
    [settings.sound],
  );
}
