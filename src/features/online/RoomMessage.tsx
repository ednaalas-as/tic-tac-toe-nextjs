import { SetupShell } from "@/components/layout/SetupShell";
import { Button, LinkButton } from "@/components/ui/Button";
import styles from "./RoomMessage.module.css";

type Reason =
  | "loading"
  | "invalid"
  | "not_found"
  | "expired"
  | "closed"
  | "full"
  | "error"
  | "unconfigured";

const COPY: Record<Reason, { title: string; body: string }> = {
  loading: { title: "Opening room…", body: "Connecting you to the game." },
  invalid: { title: "That code doesn't look right", body: "Room codes are 6 letters and numbers, like K7Q2MX." },
  not_found: { title: "Room not found", body: "Double-check the code, or ask your friend to send a new invite." },
  expired: { title: "This room has expired", body: "Rooms close after an hour without activity. Start a new one — it only takes a second." },
  closed: { title: "This room was closed", body: "The host left before the game started." },
  full: { title: "This room is full", body: "Two players are already in this game." },
  error: { title: "Can't reach the game server", body: "Check your internet connection and try again." },
  unconfigured: { title: "Online play isn't set up", body: "This deployment has no Supabase configuration. The other modes still work." },
};

export function RoomMessage({ reason, onRetry }: { reason: Reason; onRetry?: () => void }) {
  const { title, body } = COPY[reason];
  return (
    <SetupShell title={title} intro={body}>
      {reason === "loading" ? (
        <div className={styles.loader} role="status" aria-label="Loading">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className={styles.actions}>
          {reason === "error" && onRetry && <Button onClick={onRetry}>Try again</Button>}
          <LinkButton href="/online" variant={reason === "error" ? "secondary" : "primary"}>
            Go to online lobby
          </LinkButton>
          <LinkButton href="/" variant="ghost">
            All modes
          </LinkButton>
        </div>
      )}
    </SetupShell>
  );
}
