"use client";

import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";

// Email + password sign-in / sign-up. On success the session updates (onAuthStateChange)
// and the app re-renders. Sign-up logs you straight in when "Confirm email" is off.
export default function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const { error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <div className="mb-7 text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900">
          Live{" "}
          <span className="bg-gradient-to-br from-sky-500 to-indigo-600 bg-clip-text text-transparent">
            Board
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to create boards and collaborate in real time.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full rounded-2xl border border-slate-200/70 bg-white/80 p-7 shadow-sm backdrop-blur"
      >
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl disabled:opacity-60"
        >
          {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
          }}
          className="mt-3 w-full text-center text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
        >
          {mode === "in" ? "Need an account? Create one" : "Have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
