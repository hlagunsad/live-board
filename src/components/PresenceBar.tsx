"use client";

import type { PresenceUser } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const text = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return text.toUpperCase() || "?";
}

export default function PresenceBar({ users }: { users: PresenceUser[] }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((u, i) => (
          <span
            key={`${u.name}-${i}`}
            title={u.name}
            className="lb-pop flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-sm"
            style={{ backgroundColor: u.color }}
          >
            {initials(u.name)}
          </span>
        ))}
      </div>
      <span
        data-testid="online-count"
        className="text-xs font-semibold text-slate-500"
      >
        {users.length} online
      </span>
    </div>
  );
}
