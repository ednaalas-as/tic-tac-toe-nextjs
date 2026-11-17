import { expect, test } from "@playwright/test";
import { cell, collectConsoleErrors, play, status } from "./helpers";

test("landing page shows the three modes and no horizontal overflow", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  const modes = page.getByRole("navigation", { name: "Game modes" });
  await expect(modes.getByRole("link")).toHaveCount(3);
  await expect(modes.getByRole("link", { name: /Player vs Computer/ })).toBeVisible();
  await expect(modes.getByRole("link", { name: /Local multiplayer/ })).toBeVisible();
  await expect(modes.getByRole("link", { name: /Online multiplayer/ })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("local multiplayer: custom players, win, score, rematch", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/play/local");

  const names = page.getByLabel("Name");
  await names.nth(0).fill("Ana");
  await names.nth(1).fill("Ben");
  const pickers = page.getByRole("radiogroup");
  await pickers.nth(0).getByRole("radio", { name: "Sun", exact: true }).click();
  await expect(pickers.nth(1).getByRole("radio", { name: /^Sun \(taken by Ana\)/ })).toHaveAttribute("aria-disabled", "true");
  await pickers.nth(1).getByRole("radio", { name: "Moon", exact: true }).click();
  await page.getByRole("button", { name: "Start game" }).click();

  await expect(status(page)).toContainText("Ana's turn");
  for (const i of [0, 3, 1, 4, 2]) await play(page, i);
  await expect(status(page)).toContainText("Ana wins!");
  await expect(cell(page, 0)).toHaveAccessibleName(/Ana's sun, winning cell/);
  await expect(page.getByRole("group", { name: /^Ana, playing Sun, 1 win/ })).toBeVisible();

  await page.getByRole("button", { name: "Rematch" }).click();
  await expect(status(page)).toContainText("Ben's turn");
  await play(page, 4);
  await expect(cell(page, 4)).toHaveAccessibleName(/Ben's moon/);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("vs computer (hard): the computer replies and the game always ends without a human win", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/play/computer");
  await page.getByLabel("Name").fill("Tess");
  await page.getByRole("radiogroup").getByRole("radio", { name: "Crown" }).click();
  await page.getByRole("radio", { name: "Hard", exact: true }).check();
  await page.getByRole("button", { name: "Start game" }).click();

  await expect(status(page)).toContainText("Your move");
  // Keep playing the first free cell until the round ends.
  for (let turn = 0; turn < 5; turn++) {
    const free = page.locator('[data-cell][aria-disabled="false"]');
    await expect(status(page)).toContainText(/Your move|wins|draw/);
    if ((await free.count()) === 0) break;
    await free.first().click();
    await expect(status(page)).not.toContainText("thinking", { timeout: 5000 });
  }
  await expect(status(page)).toContainText(/Atlas wins|draw/);
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();

  await page.getByRole("link", { name: /History/ }).click();
  await expect(page.getByRole("heading", { name: "Session history" })).toBeVisible();
  await expect(page.getByText(/Tess/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("keyboard: the board can be played with arrow keys and Enter", async ({ page }) => {
  await page.goto("/play/local");
  await page.getByRole("button", { name: "Start game" }).click();
  await cell(page, 4).focus();
  await page.keyboard.press("Enter");
  await expect(cell(page, 4)).toHaveAccessibleName(/Player 1's cross/);
  await page.keyboard.press("ArrowRight");
  await expect(cell(page, 5)).toBeFocused();
  await page.keyboard.press("Space");
  await expect(cell(page, 5)).toHaveAccessibleName(/Player 2's ring/);
});
