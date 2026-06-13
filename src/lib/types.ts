/** Row shapes mirroring the Postgres tables in supabase/migrations/0001_init.sql. */

export type Board = {
  id: string;
  title: string;
  created_at: string;
};

export type Column = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type Card = {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
};

/** Board card state is held as a map keyed by card id so realtime upserts are idempotent. */
export type CardMap = Record<string, Card>;

/** Ephemeral presence payload tracked per connected client (not persisted). */
export type PresenceUser = {
  name: string;
  color: string;
  at: number;
};
