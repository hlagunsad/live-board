"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { DEFAULT_COLUMNS, DEMO_BOARD_ID, DEMO_INVITE_TOKEN } from "@/lib/constants";
import type { Board } from "@/lib/types";
import SignIn from "./SignIn";

export default function Home() {
  const { session, loading } = useSession();
  if (loading) return <Centered>Loading…</Centered>;
  if (!session) return <SignIn />;
  return <Boards userId={session.user.id} email={session.user.email ?? "you"} />;
}

function Boards({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // RLS returns only the boards this user is a member of.
    const { data } = await getSupabase()
      .from("boards")
      .select("*")
      .order("created_at", { ascending: false });
    setBoards((data ?? []) as Board[]);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; setState runs after the awaited load
  useEffect(() => {
    load();
  }, [load]);

  async function newBoard() {
    setCreating(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const id = crypto.randomUUID();
      // owner_id = me satisfies the insert policy; a trigger adds me to board_members.
      const { error: bErr } = await supabase
        .from("boards")
        .insert({ id, owner_id: userId, title: "Untitled board" });
      if (bErr) throw new Error(bErr.message);
      const { error: cErr } = await supabase.from("columns").insert(
        DEFAULT_COLUMNS.map((c) => ({ board_id: id, title: c.title, position: c.position })),
      );
      if (cErr) throw new Error(cErr.message);
      router.push(`/board/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="lb-live-dot h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
            Live Board
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{email}</span>
          <button
            type="button"
            onClick={() => getSupabase().auth.signOut()}
            className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mt-14 flex items-end justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
          Your boards
        </h1>
        <button
          type="button"
          onClick={newBoard}
          disabled={creating}
          className="rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl disabled:opacity-60"
        >
          {creating ? "Creating…" : "New board"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {boards === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            No boards yet — create one above, or open the demo below.
          </p>
        ) : (
          boards.map((b) => (
            <Link
              key={b.id}
              href={`/board/${b.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-sky-200 hover:shadow-sm"
            >
              <span className="font-medium text-slate-800">{b.title}</span>
              <span className="text-xs font-medium text-slate-400">
                {b.owner_id === userId ? "Owner" : "Member"}
              </span>
            </Link>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push(`/board/${DEMO_BOARD_ID}?invite=${DEMO_INVITE_TOKEN}`)}
        className="mt-6 text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
      >
        Try the public demo board →
      </button>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-slate-400">
      {children}
    </main>
  );
}
