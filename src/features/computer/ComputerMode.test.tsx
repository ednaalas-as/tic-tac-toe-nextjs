import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithApp } from "@/test/render";
import { ComputerMode } from "./ComputerMode";

function cells() {
  return screen.getAllByRole("button", { name: /^Row \d, column \d:/ });
}

describe("Player vs Computer", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("lets the computer reply automatically and blocks input while it thinks", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithApp(<ComputerMode />);

    await user.click(screen.getByText("Hard"));
    expect(screen.getByText(/best you can do is draw/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start game" }));

    expect(screen.getByRole("status")).toHaveTextContent("Your move");
    await user.click(cells()[0]);
    expect(screen.getByRole("status")).toHaveTextContent("Atlas is thinking");

    // While the computer is thinking, the human can't play.
    const free = cells().filter((c) => c.getAttribute("aria-disabled") === "true" && /empty/.test(c.getAttribute("aria-label")!));
    expect(free.length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    // Hard answers a corner opening with the center.
    expect(cells()[4]).toHaveAccessibleName(/Atlas' robot/);
    expect(screen.getByRole("status")).toHaveTextContent("Your move");
  });

  it("lets the computer open when chosen, and avoids the human's symbol", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithApp(<ComputerMode />);

    const picker = screen.getByRole("radiogroup");
    await user.click(within(picker).getByRole("radio", { name: "Robot" }));
    await user.click(screen.getByRole("radio", { name: "Gizmo" }));
    await user.click(screen.getByRole("button", { name: "Start game" }));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    const taken = cells().filter((c) => /Gizmo/.test(c.getAttribute("aria-label")!));
    expect(taken).toHaveLength(1);
    // Human picked the robot, so the computer must use something else.
    expect(taken[0].getAttribute("aria-label")).not.toMatch(/robot/);
  });
});
