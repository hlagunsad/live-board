/**
 * Guest identity for the public demo: a stable per-browser client id (for presence)
 * and a display name, both kept in localStorage. No accounts, no signup.
 * All functions are SSR-safe (guard against a missing `window`).
 */

const CLIENT_ID_KEY = "live-board:client-id";
const NAME_KEY = "live-board:display-name";

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

export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

const nameListeners = new Set<() => void>();

function handleStorage(e: StorageEvent) {
  if (e.key === NAME_KEY) nameListeners.forEach((l) => l());
}

/** Subscribe to display-name changes — same-tab via setDisplayName, cross-tab via storage. */
export function subscribeName(cb: () => void): () => void {
  nameListeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", handleStorage);
  return () => {
    nameListeners.delete(cb);
    if (typeof window !== "undefined" && nameListeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

/** Client snapshot of the display name (for useSyncExternalStore). */
export function getNameSnapshot(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

/** Server snapshot — always empty, so SSR + first hydration render the join gate. */
export function getNameServerSnapshot(): string {
  return "";
}

export function setDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name.trim());
  nameListeners.forEach((l) => l());
}

/** Deterministic color for a client id, so the same guest keeps the same avatar color. */
export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}
