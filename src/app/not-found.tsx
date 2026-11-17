import { SetupShell } from "@/components/layout/SetupShell";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <SetupShell title="Page not found" intro="That square is empty. Let's get you back to the game.">
      <div>
        <LinkButton href="/">Choose a mode</LinkButton>
      </div>
    </SetupShell>
  );
}
