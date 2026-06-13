"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_COLUMNS, DEMO_BOARD_ID } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function newBoard() {
    setCreating(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: board, error: bErr } = await supabase
        .from("boards")
        .insert({ title: "Untitled board" })
        .select("id")
        .single();
      if (bErr || !board) {
        throw new Error(bErr?.message ?? "Could not create the board.");
      }
      const { error: cErr } = await supabase.from("columns").insert(
        DEFAULT_COLUMNS.map((c) => ({
          board_id: board.id,
          title: c.title,
          position: c.position,
        })),
      );
      if (cErr) throw new Error(cErr.message);
      router.push(`/board/${board.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700 backdrop-blur">
        <span className="lb-live-dot h-2 w-2 rounded-full bg-sky-500" />
        REAL-TIME · NO SIGN-UP
      </div>

      <h1 className="font-display mt-6 text-6xl font-extrabold leading-[0.95] tracking-tight text-slate-900 sm:text-7xl">
        Live{" "}
        <span className="bg-gradient-to-br from-sky-500 to-indigo-600 bg-clip-text text-transparent">
          Board
        </span>
      </h1>

      <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600">
        A collaborative Kanban board. Create one, share the link, and watch cards
        move in real time — open it in two tabs to see for yourself.
      </p>

      <div className="mt-9 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={newBoard}
          disabled={creating}
          className="group rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl hover:shadow-sky-500/30 disabled:opacity-60"
        >
          {creating ? "Creating…" : "New board"}
          <span className="ml-1.5 inline-block transition group-hover:translate-x-0.5">
            →
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.push(`/board/${DEMO_BOARD_ID}`)}
          className="text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
        >
          or open the shared demo board
        </button>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <footer className="mt-16 text-xs text-slate-400">
        Next.js · Supabase Realtime · open source
      </footer>
    </main>
  );
}
