import { test, expect, type Page } from "@playwright/test";

// Sign up a fresh throwaway account (auto-logs-in when "Confirm email" is off).
async function signUp(page: Page): Promise<void> {
  const email = `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: /create one/i }).click();
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("e2e-test-pw-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "New board" })).toBeVisible({ timeout: 20_000 });
}

// Owner path: sign up, create a board, add a card, move it across a lane, delete it.
test("create a board, add a card, move it, delete it", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "New board" }).click();
  await expect(page).toHaveURL(/\/board\/[0-9a-f-]{36}/i);

  // No name gate now — the signed-in owner is a member, so the board loads with its lanes.
  const todo = page.getByTestId("list-to-do");
  await todo.getByPlaceholder("Add a card").fill("Write tests");
  await todo.getByRole("button", { name: "Add" }).click();

  const card = page.getByTestId("card").filter({ hasText: "Write tests" });
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Move card right" }).click();
  await expect(page.getByTestId("list-in-progress").getByText("Write tests")).toBeVisible();

  await page
    .getByTestId("card")
    .filter({ hasText: "Write tests" })
    .getByRole("button", { name: "Delete card" })
    .click();
  await expect(page.getByText("Write tests")).toHaveCount(0);
});
