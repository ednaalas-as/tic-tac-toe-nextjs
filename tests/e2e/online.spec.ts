import { expect, test, type Browser, type Page } from "@playwright/test";
import { cell, collectConsoleErrors, play, status } from "./helpers";

/**
 * Online multiplayer across two *independent* browser contexts (separate
 * storage = separate anonymous players), against the real Supabase backend.
 */

async function newPlayer(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  return { context, page, errors: collectConsoleErrors(page) };
}

async function createRoom(page: Page, name: string, symbol: string): Promise<string> {
  await page.goto("/online");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("radiogroup").getByRole("radio", { name: symbol, exact: true }).click();
  await page.getByRole("button", { name: "Create private room" }).click();
  await expect(page.getByRole("heading", { name: "Your room is ready" })).toBeVisible();
  await expect(page.getByText("Waiting for an opponent…")).toBeVisible();
  const code = (await page.locator("section[aria-label='Room code'] p").nth(1).textContent())!.trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  return code;
}

async function joinRoom(page: Page, code: string, name: string, symbol: string) {
  await page.goto(`/online/${code}`); // invitation link
  await expect(page.getByRole("heading", { name: "You're invited" })).toBeVisible();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("radiogroup").getByRole("radio", { name: symbol, exact: true }).click();
  await page.getByRole("button", { name: "Join game" }).click();
}

test.describe.configure({ mode: "serial" });

test("full online match: invite, sync, turn rules, win, rematch, reconnect, leave", async ({ browser, baseURL }) => {
  const host = await newPlayer(browser, baseURL);
  const guest = await newPlayer(browser, baseURL);

  const code = await createRoom(host.page, "Ana", "Heart");

  // Copy invite link works.
  await host.page.getByRole("button", { name: "Copy invite link" }).click();
  await expect(host.page.getByRole("button", { name: "Link copied ✓" })).toBeVisible();

  // Guest sees the host's identity, and the host's symbol is unavailable.
  await guest.page.goto(`/online/${code}`);
  await expect(guest.page.getByText("Ana", { exact: true })).toBeVisible();
  await expect(guest.page.getByRole("radio", { name: /Heart \(taken by Ana\)/ })).toHaveAttribute("aria-disabled", "true");
  await joinRoom(guest.page, code, "Ben", "Star");

  // Both land in the game without refreshing.
  await expect(status(host.page)).toContainText("Your turn");
  await expect(status(guest.page)).toContainText("Ana's turn");
  await expect(guest.page.getByText("Online", { exact: true })).toBeVisible();

  // Guest can't move on the host's turn.
  await expect(cell(guest.page, 0)).toHaveAttribute("aria-disabled", "true");

  // Real-time sync of moves.
  await play(host.page, 0);
  await expect(cell(guest.page, 0)).toHaveAccessibleName(/Ana's heart/);
  await expect(status(guest.page)).toContainText("Your turn");
  await play(guest.page, 3);
  await expect(cell(host.page, 3)).toHaveAccessibleName(/Ben's star/);
  await play(host.page, 1);
  await play(guest.page, 4);
  await play(host.page, 2);

  await expect(status(host.page)).toContainText("You win!");
  await expect(status(guest.page)).toContainText("Ana wins");
  await expect(cell(guest.page, 2)).toHaveAccessibleName(/winning cell/);

  // Rematch handshake.
  await guest.page.getByRole("button", { name: "Request rematch" }).click();
  await expect(guest.page.getByText(/Waiting for Ana to accept/)).toBeVisible();
  await expect(host.page.getByText(/Ben wants a rematch/)).toBeVisible();
  await host.page.getByRole("button", { name: "Accept" }).click();

  // Round 2: Ben starts, scores kept.
  await expect(status(guest.page)).toContainText("Your turn");
  await expect(host.page.getByText(/Round 2/)).toBeVisible();
  await expect(host.page.getByRole("group", { name: /^Ana, playing Heart, 1 win/ })).toBeVisible();
  await play(guest.page, 4);
  await expect(cell(host.page, 4)).toHaveAccessibleName(/Ben's star/);

  // Disconnect: guest closes the tab, host sees them go offline.
  await guest.page.close();
  await expect(host.page.getByText("Offline", { exact: true })).toBeVisible({ timeout: 30_000 });

  // Reconnect: same browser profile reopens the link and resumes the game.
  const guestAgain = await guest.context.newPage();
  await guestAgain.goto(`/online/${code}`);
  await expect(cell(guestAgain, 4)).toHaveAccessibleName(/Ben's star/);
  await expect(status(guestAgain)).toContainText("Ana's turn");
  await expect(host.page.getByText("Online", { exact: true })).toBeVisible({ timeout: 30_000 });

  // A third player can't get in.
  const intruder = await newPlayer(browser, baseURL);
  await intruder.page.goto(`/online/${code}`);
  await expect(intruder.page.getByRole("heading", { name: "This room is full" })).toBeVisible();

  // Leaving: host is told the opponent left.
  await guestAgain.getByRole("button", { name: "Leave room" }).click();
  await guestAgain.getByRole("dialog").getByRole("button", { name: "Leave room" }).click();
  await expect(guestAgain).toHaveURL(/\/online$/);
  await expect(host.page.getByRole("heading", { name: "Ben left the room" })).toBeVisible();

  expect(host.errors).toEqual([]);
  await Promise.all([host.context.close(), guest.context.close(), intruder.context.close()]);
});

test("unknown and malformed room codes are handled", async ({ page }) => {
  await page.goto("/online/ZZZZZZ");
  await expect(page.getByRole("heading", { name: "Room not found" })).toBeVisible();
  await page.goto("/online/bad");
  await expect(page.getByRole("heading", { name: "That code doesn't look right" })).toBeVisible();

  await page.goto("/online");
  await page.getByLabel("Room code").fill("abc");
  await page.getByRole("button", { name: "Find room" }).click();
  await expect(page.getByText(/Room codes are 6 letters/)).toBeVisible();
});
