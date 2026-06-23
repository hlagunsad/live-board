import { test, expect, type Page } from "@playwright/test";

async function signUp(page: Page): Promise<void> {
  const email = `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: /create one/i }).click();
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("e2e-test-pw-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "New board" })).toBeVisible({ timeout: 20_000 });
}

// Headline: two members on one board (joined via invite) see each other's changes live.
test("a member who joins via invite sees changes live, with presence", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  // Alice signs up, creates a board, adds a card.
  await signUp(a);
  await a.getByRole("button", { name: "New board" }).click();
  await expect(a).toHaveURL(/\/board\/[0-9a-f-]{36}/i);
  const aTodo = a.getByTestId("list-to-do");
  await aTodo.getByPlaceholder("Add a card").fill("Realtime card");
  await aTodo.getByRole("button", { name: "Add" }).click();
  await expect(a.getByText("Realtime card")).toBeVisible();

  // The Invite button exposes the tokenized link for sharing.
  const invitePath = await a.getByRole("button", { name: "Invite" }).getAttribute("data-invite-url");
  expect(invitePath).toBeTruthy();

  // Bob signs up, then opens the invite link → joins as a member.
  await signUp(b);
  await b.goto(invitePath!);

  // Bob sees Alice's card and presence reports two members online.
  await expect(b.getByText("Realtime card")).toBeVisible({ timeout: 15_000 });
  await expect(b.getByTestId("online-count")).toHaveText(/2 online/, { timeout: 15_000 });

  // Alice moves the card → Bob reflects it over the realtime channel.
  await a
    .getByTestId("card")
    .filter({ hasText: "Realtime card" })
    .getByRole("button", { name: "Move card right" })
    .click();
  await expect
    .poll(() => b.getByTestId("list-in-progress").getByText("Realtime card").count(), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);

  await ctxA.close();
  await ctxB.close();
});

// Abuse case (broken access control): a signed-in non-member can't open a board
// they were never invited to.
test("a non-member cannot access a board", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await signUp(a);
  await a.getByRole("button", { name: "New board" }).click();
  await expect(a).toHaveURL(/\/board\/[0-9a-f-]{36}/i);
  const boardUrl = a.url(); // the bare board URL — no invite token

  await signUp(b);
  await b.goto(boardUrl);
  await expect(b.getByText(/don.t have access/i)).toBeVisible({ timeout: 15_000 });

  await ctxA.close();
  await ctxB.close();
});
