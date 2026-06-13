import { test, expect } from "@playwright/test";

// Single-client CRUD: create a board, add a card, move it across a lane, delete it.
// Drives the explicit move buttons (not drag) so the assertions are deterministic.
test("create a board, add a card, move it, delete it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New board" }).click();
  await expect(page).toHaveURL(/\/board\/[0-9a-f-]{36}/i);

  // Guest name gate (fresh browser context → no stored name).
  await page.getByPlaceholder("Display name").fill("Tester");
  await page.getByRole("button", { name: "Join" }).click();

  // Add a card to the "To Do" lane.
  const todo = page.getByTestId("list-to-do");
  await todo.getByPlaceholder("Add a card").fill("Write tests");
  await todo.getByRole("button", { name: "Add" }).click();

  const card = page.getByTestId("card").filter({ hasText: "Write tests" });
  await expect(card).toBeVisible();

  // Move it one lane to the right → "In Progress".
  await card.getByRole("button", { name: "Move card right" }).click();
  await expect(
    page.getByTestId("list-in-progress").getByText("Write tests"),
  ).toBeVisible();

  // Delete it.
  await page
    .getByTestId("card")
    .filter({ hasText: "Write tests" })
    .getByRole("button", { name: "Delete card" })
    .click();
  await expect(page.getByText("Write tests")).toHaveCount(0);
});
