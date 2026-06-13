import { test, expect } from "@playwright/test";

// The headline test: two independent guests on the same board. A move made by one
// must appear for the other over the realtime channel, and presence must show both.
test("a move in one tab appears in another, with presence", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  // A creates a board and joins as "Alice".
  await a.goto("/");
  await a.getByRole("button", { name: "New board" }).click();
  await expect(a).toHaveURL(/\/board\//);
  const url = a.url();
  await a.getByPlaceholder("Display name").fill("Alice");
  await a.getByRole("button", { name: "Join" }).click();

  // A adds a card to "To Do".
  const aTodo = a.getByTestId("list-to-do");
  await aTodo.getByPlaceholder("Add a card").fill("Realtime card");
  await aTodo.getByRole("button", { name: "Add" }).click();
  await expect(a.getByText("Realtime card")).toBeVisible();

  // B opens the SAME board url as a different guest, "Bob".
  await b.goto(url);
  await b.getByPlaceholder("Display name").fill("Bob");
  await b.getByRole("button", { name: "Join" }).click();

  // B sees the card from the initial load, and presence reports two people online.
  await expect(b.getByText("Realtime card")).toBeVisible();
  await expect(b.getByTestId("online-count")).toHaveText(/2 online/);

  // A moves the card to "In Progress"; B must reflect it via realtime.
  await a
    .getByTestId("card")
    .filter({ hasText: "Realtime card" })
    .getByRole("button", { name: "Move card right" })
    .click();

  // expect.poll absorbs WebSocket propagation latency without a fixed sleep.
  await expect
    .poll(
      () => b.getByTestId("list-in-progress").getByText("Realtime card").count(),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);

  await ctxA.close();
  await ctxB.close();
});
