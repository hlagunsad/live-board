import type { Card, Column, CardMap } from "./types";

/**
 * A Supabase Realtime `postgres_changes` payload, narrowed to what we use.
 * `new` carries the row on INSERT/UPDATE; `old` carries (at least) the id on DELETE.
 */
export type CardChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Card | null;
  old?: { id?: string } | null;
};

/**
 * Apply one realtime change to the card map. Pure and idempotent: re-applying the
 * client's own optimistic write (which echoes back over the channel) is a no-op,
 * and the authoritative server row simply overwrites any local guess.
 */
export function applyChange(map: CardMap, change: CardChange): CardMap {
  if (change.eventType === "DELETE") {
    const id = change.old?.id;
    if (!id || !(id in map)) return map; // unknown id → no-op
    const next = { ...map };
    delete next[id];
    return next;
  }
  const row = change.new;
  if (!row) return map;
  return { ...map, [row.id]: row }; // INSERT/UPDATE → upsert by id
}

export type ColumnWithCards = { column: Column; cards: Card[] };

/**
 * Project the flat column list + card map into ordered lanes for rendering:
 * columns sorted by position, each lane's cards grouped and sorted by position.
 * Ties break by created_at then id so the order is deterministic across clients.
 */
export function selectColumns(columns: Column[], cards: CardMap): ColumnWithCards[] {
  const cardList = Object.values(cards);
  return [...columns].sort(byPositionThenCreated).map((column) => ({
    column,
    cards: cardList
      .filter((c) => c.column_id === column.id)
      .sort(byPositionThenCreated),
  }));
}

function byPositionThenCreated(
  a: { position: number; created_at: string; id: string },
  b: { position: number; created_at: string; id: string },
): number {
  if (a.position !== b.position) return a.position - b.position;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}
