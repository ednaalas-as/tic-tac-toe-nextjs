import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithApp } from "@/test/render";
import { LocalMode } from "./LocalMode";

function cell(row: number, col: number) {
  return screen.getByRole("button", { name: new RegExp(`^Row ${row}, column ${col}:`) });
}

async function startWithCustomPlayers(user: ReturnType<typeof userEvent.setup>) {
  const [name1, name2] = screen.getAllByLabelText("Name");
  await user.clear(name1);
  await user.type(name1, "Ana");
  await user.clear(name2);
  await user.type(name2, "Ben");

  const [p1, p2] = screen.getAllByRole("radiogroup");
  await user.click(within(p1).getByRole("radio", { name: "Heart" }));
  await user.click(within(p2).getByRole("radio", { name: "Star" }));
  await user.click(screen.getByRole("button", { name: "Start game" }));
}

describe("Local multiplayer", () => {
  it("prevents both players from picking the same symbol", async () => {
    const user = userEvent.setup();
    renderWithApp(<LocalMode />);
    const [p1, p2] = screen.getAllByRole("radiogroup");

    await user.click(within(p1).getByRole("radio", { name: "Heart" }));
    const takenHeart = within(p2).getByRole("radio", { name: /Heart \(taken by/ });
    expect(takenHeart).toHaveAttribute("aria-disabled", "true");

    await user.click(takenHeart);
    expect(takenHeart).toHaveAttribute("aria-checked", "false");
    expect(within(p1).getByRole("radio", { name: "Heart" })).toHaveAttribute("aria-checked", "true");

    // Changing player 1's symbol frees heart up again for player 2.
    await user.click(within(p1).getByRole("radio", { name: "Moon" }));
    expect(within(p2).getByRole("radio", { name: "Heart" })).not.toHaveAttribute("aria-disabled");
  });

  it("alternates turns, renders custom symbols and credits the right player", async () => {
    const user = userEvent.setup();
    renderWithApp(<LocalMode />);
    await startWithCustomPlayers(user);

    expect(screen.getByRole("status")).toHaveTextContent("Ana's turn");
    await user.click(cell(1, 1));
    expect(cell(1, 1)).toHaveAccessibleName("Row 1, column 1: Ana's heart");
    expect(screen.getByRole("status")).toHaveTextContent("Ben's turn");

    // Occupied cells can't be replayed.
    await user.click(cell(1, 1));
    expect(screen.getByRole("status")).toHaveTextContent("Ben's turn");

    await user.click(cell(2, 1)); // Ben
    await user.click(cell(1, 2)); // Ana
    await user.click(cell(2, 2)); // Ben
    await user.click(cell(1, 3)); // Ana wins the top row

    expect(screen.getByRole("status")).toHaveTextContent("Ana wins!");
    expect(screen.getByRole("group", { name: /^Ana, playing Heart, 1 win/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /^Ben, playing Star, 0 wins/ })).toBeInTheDocument();

    // No moves after the game ends.
    await user.click(cell(3, 3));
    expect(cell(3, 3)).toHaveAccessibleName("Row 3, column 3: empty");

    // Rematch: Ben starts round two, names and symbols are kept.
    await user.click(screen.getByRole("button", { name: "Rematch" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ben's turn");
    await user.click(cell(2, 2));
    expect(cell(2, 2)).toHaveAccessibleName("Row 2, column 2: Ben's star");
  });

  it("asks for confirmation before resetting scores", async () => {
    const user = userEvent.setup();
    renderWithApp(<LocalMode />);
    await startWithCustomPlayers(user);
    for (const [r, c] of [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]]) await user.click(cell(r, c));
    expect(screen.getByRole("group", { name: /^Ana.*1 win/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset scores" }));
    const dialog = screen.getByRole("dialog", { hidden: true });
    await user.click(within(dialog).getByRole("button", { name: "Cancel", hidden: true }));
    expect(screen.getByRole("group", { name: /^Ana.*1 win/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset scores" }));
    await user.click(within(dialog).getByRole("button", { name: "Reset scores", hidden: true }));
    expect(screen.getByRole("group", { name: /^Ana.*0 wins/ })).toBeInTheDocument();
  });

  it("remembers names and symbols for next time", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithApp(<LocalMode />);
    await startWithCustomPlayers(user);
    unmount();

    renderWithApp(<LocalMode />);
    const [name1, name2] = screen.getAllByLabelText("Name");
    expect(name1).toHaveValue("Ana");
    expect(name2).toHaveValue("Ben");
    const [p1] = screen.getAllByRole("radiogroup");
    expect(within(p1).getByRole("radio", { name: "Heart" })).toHaveAttribute("aria-checked", "true");
  });
});
