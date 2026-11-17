import { expect, type Page } from "@playwright/test";

export function cell(page: Page, index: number) {
  return page.locator(`[data-cell="${index}"]`);
}

export async function play(page: Page, index: number) {
  await expect(cell(page, index)).toHaveAttribute("aria-disabled", "false");
  await cell(page, index).click();
}

export function status(page: Page) {
  return page.getByRole("status").filter({ hasNotText: /^$/ }).first();
}

/** Fails the test if the page logs any console errors. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}
