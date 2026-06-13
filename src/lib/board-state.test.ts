import { describe, it, expect } from "vitest";
import { applyChange, selectColumns } from "./board-state";
import type { Card, Column, CardMap } from "./types";

function card(
  id: string,
  column_id: string,
  position: number,
  extra: Partial<Card> = {},
): Card {
  return {
    id,
    column_id,
    board_id: "b1",
    title: id,
    position,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

function column(id: string, position: number, extra: Partial<Column> = {}): Column {
  return {
    id,
    board_id: "b1",
    title: id,
    position,
    created_at: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

describe("applyChange", () => {
  it("adds a card on INSERT", () => {
    const next = applyChange({}, { eventType: "INSERT", new: card("c1", "col1", 1024) });
    expect(next.c1.position).toBe(1024);
  });

  it("replaces in place on UPDATE — echo-safe, no duplicate", () => {
    const map: CardMap = { c1: card("c1", "col1", 1024) };
    const next = applyChange(map, { eventType: "UPDATE", new: card("c1", "col2", 2048) });
    expect(Object.keys(next)).toHaveLength(1);
    expect(next.c1.column_id).toBe("col2");
    expect(next.c1.position).toBe(2048);
  });

  it("removes a card on DELETE", () => {
    const map: CardMap = { c1: card("c1", "col1", 1024) };
    const next = applyChange(map, { eventType: "DELETE", old: { id: "c1" } });
    expect(next.c1).toBeUndefined();
  });

  it("is a no-op when DELETE targets an unknown id", () => {
    const map: CardMap = { c1: card("c1", "col1", 1024) };
    const next = applyChange(map, { eventType: "DELETE", old: { id: "ghost" } });
    expect(Object.keys(next)).toEqual(["c1"]);
  });

  it("does not mutate the input map", () => {
    const map: CardMap = { c1: card("c1", "col1", 1024) };
    applyChange(map, { eventType: "INSERT", new: card("c2", "col1", 2048) });
    expect(Object.keys(map)).toEqual(["c1"]);
  });
});

describe("selectColumns", () => {
  it("groups cards under their column", () => {
    const cols = [column("col1", 1024), column("col2", 2048)];
    const cards: CardMap = {
      c1: card("c1", "col1", 1024),
      c2: card("c2", "col2", 1024),
    };
    const result = selectColumns(cols, cards);
    expect(result.map((r) => r.column.id)).toEqual(["col1", "col2"]);
    expect(result[0].cards.map((c) => c.id)).toEqual(["c1"]);
    expect(result[1].cards.map((c) => c.id)).toEqual(["c2"]);
  });

  it("sorts cards within a column by position ascending", () => {
    const cols = [column("col1", 1024)];
    const cards: CardMap = {
      c2: card("c2", "col1", 2048),
      c1: card("c1", "col1", 1024),
      c3: card("c3", "col1", 1536),
    };
    const result = selectColumns(cols, cards);
    expect(result[0].cards.map((c) => c.id)).toEqual(["c1", "c3", "c2"]);
  });

  it("sorts columns by position ascending", () => {
    const cols = [column("col2", 2048), column("col1", 1024)];
    const result = selectColumns(cols, {});
    expect(result.map((r) => r.column.id)).toEqual(["col1", "col2"]);
  });

  it("breaks position ties by created_at then id", () => {
    const cols = [column("col1", 1024)];
    const cards: CardMap = {
      cB: card("cB", "col1", 1024, { created_at: "2026-01-02T00:00:00Z" }),
      cA: card("cA", "col1", 1024, { created_at: "2026-01-01T00:00:00Z" }),
    };
    const result = selectColumns(cols, cards);
    expect(result[0].cards.map((c) => c.id)).toEqual(["cA", "cB"]);
  });
});
