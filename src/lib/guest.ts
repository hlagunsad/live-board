/**
 * Avatar color helper — a deterministic color per user id, so the same person keeps
 * the same presence color. (Identity is now Supabase Auth; this is all that remains.)
 */

const COLORS = [
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#6366f1", // indigo
  "#14b8a6", // teal
];

export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}
