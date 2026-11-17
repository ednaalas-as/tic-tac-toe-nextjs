"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { SetupShell } from "@/components/layout/SetupShell";
import { PlayerFields } from "@/components/players/PlayerFields";
import { Button } from "@/components/ui/Button";
import { cleanName, DEFAULT_ONLINE_PREFS, parseOnlinePrefs } from "@/lib/preferences";
import { useStoredState } from "@/lib/storage";
import { isOnlineConfigured } from "@/lib/supabase/client";
import { createRoom, normalizeRoomCode, ROOM_CODE_PATTERN } from "./api";
import { RoomCodeInput } from "./RoomCodeInput";
import styles from "./OnlineLobby.module.css";

export function OnlineLobby() {
  const router = useRouter();
  const [prefs, setPrefs] = useStoredState("triad:online-profile", DEFAULT_ONLINE_PREFS, parseOnlinePrefs);
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const errorId = useId();

  if (!isOnlineConfigured()) {
    return (
      <SetupShell title="Online multiplayer" intro="Online play isn't configured on this deployment yet.">
        <p className={styles.note}>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to
          enable it. The other two modes work without it.
        </p>
      </SetupShell>
    );
  }

  async function handleCreate() {
    const name = cleanName(prefs.name, "");
    if (!name) {
      setError("Enter your name so your opponent knows who they're playing.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const room = await createRoom(name, prefs.symbol);
      router.push(`/online/${room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create a room.");
      setCreating(false);
    }
  }

  function handleJoin() {
    const normalized = normalizeRoomCode(code);
    if (!ROOM_CODE_PATTERN.test(normalized)) {
      setJoinError("Room codes are 6 letters and numbers, like K7Q2MX.");
      return;
    }
    setJoinError(null);
    router.push(`/online/${normalized}`);
  }

  return (
    <SetupShell
      wide
      title="Online multiplayer"
      intro="Create a private room and send the link to a friend, or enter a code you've been given. No account needed."
    >
      <div className={styles.columns}>
        <section className={styles.create} aria-labelledby="create-heading">
          <h2 id="create-heading" className="visually-hidden">
            Create a room
          </h2>
          <PlayerFields
            heading="You"
            tone="p1"
            name={prefs.name}
            onNameChange={(name) => setPrefs({ ...prefs, name })}
            symbol={prefs.symbol}
            onSymbolChange={(symbol) => setPrefs({ ...prefs, symbol })}
            namePlaceholder="Your name"
          />
          {error && (
            <p id={errorId} className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button block busy={creating} onClick={handleCreate}>
            {creating ? "Creating room…" : "Create private room"}
          </Button>
        </section>

        <section className={styles.join} aria-labelledby="join-heading">
          <h2 id="join-heading" className={styles.joinTitle}>
            Have a code?
          </h2>
          <p className={styles.note}>Enter the 6-character room code your friend shared.</p>
          <form
            className={styles.joinForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
            noValidate
          >
            <RoomCodeInput value={code} onChange={setCode} invalid={Boolean(joinError)} />
            {joinError && (
              <p className={styles.error} role="alert">
                {joinError}
              </p>
            )}
            <Button type="submit" variant="secondary" block>
              Find room
            </Button>
          </form>
          <p className={styles.tip}>
            Testing on one computer? Open the invite link in a private window or another browser, so it
            counts as a second player.
          </p>
        </section>
      </div>
    </SetupShell>
  );
}
