/** Fixed id of the seeded public demo board (see supabase/migrations/0001_init.sql). */
export const DEMO_BOARD_ID = "11111111-1111-1111-1111-111111111111";

/** Fixed invite token for the demo board (set in 0002_auth_ownership.sql) so the
 *  homepage "try the demo" link auto-joins any signed-in visitor. */
export const DEMO_INVITE_TOKEN = "22222222-2222-2222-2222-222222222222";

/** Default lanes seeded for every new board, with their starting positions. */
export const DEFAULT_COLUMNS: { title: string; position: number }[] = [
  { title: "To Do", position: 1024 },
  { title: "In Progress", position: 2048 },
  { title: "Done", position: 3072 },
];
