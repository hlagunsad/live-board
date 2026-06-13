/** Fixed id of the seeded public demo board (see supabase/migrations/0001_init.sql). */
export const DEMO_BOARD_ID = "11111111-1111-1111-1111-111111111111";

/** Default lanes seeded for every new board, with their starting positions. */
export const DEFAULT_COLUMNS: { title: string; position: number }[] = [
  { title: "To Do", position: 1024 },
  { title: "In Progress", position: 2048 },
  { title: "Done", position: 3072 },
];
