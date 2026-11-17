import { SetupShell } from "@/components/layout/SetupShell";
import { PlayerCard } from "@/components/players/PlayerCard";
import { LinkButton } from "@/components/ui/Button";
import { otherPlayer } from "@/lib/game/engine";
import type { PlayerId } from "@/lib/game/types";
import type { RoomRow } from "./api";
import { roomToPlayers, roomToScore } from "./room";
import styles from "./OpponentLeft.module.css";

export function OpponentLeft({ room, me }: { room: RoomRow; me: PlayerId }) {
  const players = roomToPlayers(room);
  const score = roomToScore(room);
  const them = otherPlayer(me);

  return (
    <SetupShell
      title={`${players[them].name} left the room`}
      intro="This room is closed. Here's how the match ended."
    >
      <div className={styles.scores}>
        {(["player1", "player2"] as const).map((id) => (
          <PlayerCard
            key={id}
            player={players[id]}
            score={score[id]}
            isTurn={false}
            isWinner={false}
            tag={id === me ? "You" : "Left"}
          />
        ))}
      </div>
      <p className={styles.draws}>
        {score.draws} {score.draws === 1 ? "draw" : "draws"} · {room.round} {room.round === 1 ? "round" : "rounds"}
      </p>
      <div className={styles.actions}>
        <LinkButton href="/online">Start a new room</LinkButton>
        <LinkButton href="/" variant="ghost">
          All modes
        </LinkButton>
      </div>
    </SetupShell>
  );
}
