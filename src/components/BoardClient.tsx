"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import {
  colorForId,
  getNameServerSnapshot,
  getNameSnapshot,
  getOrCreateClientId,
  setDisplayName,
  subscribeName,
} from "@/lib/guest";
import { applyChange, selectColumns } from "@/lib/board-state";
import { positionForMove } from "@/lib/ordering";
import type { Board, Card, CardMap, Column, PresenceUser } from "@/lib/types";
import ColumnView from "./Column";
import { type MoveAction } from "./Card";
import PresenceBar from "./PresenceBar";

export default function BoardClient({ boardId }: { boardId: string }) {
  // Read the guest name from localStorage in an SSR-safe way (no setState-in-effect):
  // the server and first hydration render "" → the join gate; the client then re-reads.
  const name = useSyncExternalStore(
    subscribeName,
    getNameSnapshot,
    getNameServerSnapshot,
  );

  if (!name) return <NameGate onJoin={setDisplayName} />;
  return <Board boardId={boardId} name={name} />;
}

function NameGate({ onJoin }: { onJoin: (name: string) => void }) {
  const [value, setValue] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (t) onJoin(t);
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full rounded-2xl border border-slate-200/70 bg-white/80 p-7 text-center shadow-sm backdrop-blur"
      >
        <h1 className="font-display text-2xl font-extrabold text-slate-900">
          Join the board
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Pick a display name so others can see you here.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Display name"
          aria-label="Display name"
          className="mt-5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
        <button
          type="submit"
          className="mt-3 w-full rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl"
        >
          Join
        </button>
      </form>
    </main>
  );
}

type Status = "loading" | "ready" | "notfound" | "error";

function Board({ boardId, name }: { boardId: string; name: string }) {
  const supabase = useMemo(() => getSupabase(), []);
  const clientId = useMemo(() => getOrCreateClientId(), []);

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<CardMap>({});
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flashing, setFlashing] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const lanes = useMemo(() => selectColumns(columns, cards), [columns, cards]);

  const flashCard = useCallback((id: string) => {
    setFlashing((prev) => ({ ...prev, [id]: 1 }));
    setTimeout(() => {
      setFlashing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 900);
  }, []);

  // Initial load, then subscribe to one channel for card/column changes + presence.
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      setStatus("loading");
      const { data: boardRow, error: bErr } = await supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .maybeSingle();
      if (cancelled) return;
      if (bErr) {
        setErrorMsg(bErr.message);
        setStatus("error");
        return;
      }
      if (!boardRow) {
        setStatus("notfound");
        return;
      }

      const [{ data: cols }, { data: crds }] = await Promise.all([
        supabase.from("columns").select("*").eq("board_id", boardId),
        supabase.from("cards").select("*").eq("board_id", boardId),
      ]);
      if (cancelled) return;

      setBoard(boardRow as Board);
      setColumns((cols ?? []) as Column[]);
      setCards(
        Object.fromEntries(((crds ?? []) as Card[]).map((c) => [c.id, c])),
      );
      setStatus("ready");

      channel = supabase.channel(`board:${boardId}`, {
        config: { presence: { key: clientId } },
      });
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${boardId}` },
          (payload) => {
            setCards((prev) =>
              applyChange(prev, {
                eventType: payload.eventType,
                new: payload.new as Card,
                old: payload.old as { id?: string },
              }),
            );
            if (payload.eventType !== "DELETE") {
              const id = (payload.new as Card)?.id;
              if (id) flashCard(id);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "columns", filter: `board_id=eq.${boardId}` },
          (payload) => {
            setColumns((prev) =>
              applyColumnChange(
                prev,
                payload.eventType,
                payload.new as Column,
                payload.old as { id?: string },
              ),
            );
          },
        )
        .on("presence", { event: "sync" }, () => setOnline(readPresence(channel!)))
        .on("presence", { event: "join" }, () => setOnline(readPresence(channel!)))
        .on("presence", { event: "leave" }, () => setOnline(readPresence(channel!)))
        .subscribe(async (s) => {
          if (s === "SUBSCRIBED" && channel) {
            await channel.track({
              name,
              color: colorForId(clientId),
              at: Date.now(),
            } satisfies PresenceUser);
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [boardId, supabase, clientId, name, flashCard]);

  const addCard = useCallback(
    async (columnId: string, title: string) => {
      const lane = lanes.find((l) => l.column.id === columnId);
      const positions = (lane?.cards ?? []).map((c) => c.position);
      const { position } = positionForMove(positions, positions.length);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      setCards((prev) => ({
        ...prev,
        [id]: { id, column_id: columnId, board_id: boardId, title, position, created_at: now, updated_at: now },
      }));
      const { error } = await supabase
        .from("cards")
        .insert({ id, column_id: columnId, board_id: boardId, title, position });
      if (error) setErrorMsg(error.message);
    },
    [lanes, boardId, supabase],
  );

  const moveCard = useCallback(
    async (card: Card, toColumnId: string, excludedPositions: number[], toIndex: number) => {
      const { position } = positionForMove(excludedPositions, toIndex);
      const now = new Date().toISOString();
      setCards((prev) => ({
        ...prev,
        [card.id]: { ...prev[card.id], column_id: toColumnId, position, updated_at: now },
      }));
      const { error } = await supabase
        .from("cards")
        .update({ column_id: toColumnId, position, updated_at: now })
        .eq("id", card.id);
      if (error) setErrorMsg(error.message);
    },
    [supabase],
  );

  const onMoveCard = useCallback(
    (card: Card, action: MoveAction) => {
      if (action === "left" || action === "right") {
        const ordered = [...columns].sort((a, b) => a.position - b.position);
        const idx = ordered.findIndex((c) => c.id === card.column_id);
        const targetIdx = idx + (action === "right" ? 1 : -1);
        if (targetIdx < 0 || targetIdx >= ordered.length) return;
        const target = ordered[targetIdx];
        const targetCards = lanes.find((l) => l.column.id === target.id)?.cards ?? [];
        moveCard(card, target.id, targetCards.map((c) => c.position), targetCards.length);
      } else {
        const lane = lanes.find((l) => l.column.id === card.column_id);
        if (!lane) return;
        const i = lane.cards.findIndex((c) => c.id === card.id);
        const excluded = lane.cards.filter((c) => c.id !== card.id);
        const toIndex = action === "up" ? i - 1 : i + 1;
        if (toIndex < 0 || toIndex > excluded.length) return;
        moveCard(card, card.column_id, excluded.map((c) => c.position), toIndex);
      }
    },
    [columns, lanes, moveCard],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      setCards((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) setErrorMsg(error.message);
    },
    [supabase],
  );

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (status === "loading") {
    return <Centered>Loading board…</Centered>;
  }
  if (status === "notfound") {
    return (
      <Centered>
        <p className="text-slate-600">That board doesn’t exist.</p>
        <Link href="/" className="mt-3 font-semibold text-sky-600 hover:underline">
          ← Start a new board
        </Link>
      </Centered>
    );
  }
  if (status === "error") {
    return <Centered>Couldn’t load the board: {errorMsg}</Centered>;
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-6 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <span className="lb-live-dot h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
            Live Board
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <PresenceBar users={online} />
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy board link"
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {copied ? "Link copied ✓" : "Share"}
          </button>
        </div>
      </header>

      <div className="px-6 pb-3 pt-6">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">
          {board?.title ?? "Board"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Open this link in another tab and watch changes sync in real time.
        </p>
      </div>

      <section className="flex items-start gap-5 overflow-x-auto px-6 pb-12">
        {lanes.map((lane, laneIdx) => (
          <ColumnView
            key={lane.column.id}
            column={lane.column}
            cards={lane.cards}
            isFirstLane={laneIdx === 0}
            isLastLane={laneIdx === lanes.length - 1}
            flashing={flashing}
            onAddCard={(title) => addCard(lane.column.id, title)}
            onMoveCard={onMoveCard}
            onDeleteCard={deleteCard}
          />
        ))}
      </section>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-slate-500">
      {children}
    </main>
  );
}

function applyColumnChange(
  prev: Column[],
  eventType: "INSERT" | "UPDATE" | "DELETE",
  newRow: Column | null,
  oldRow: { id?: string } | null,
): Column[] {
  if (eventType === "DELETE") return prev.filter((c) => c.id !== oldRow?.id);
  if (!newRow) return prev;
  const idx = prev.findIndex((c) => c.id === newRow.id);
  if (idx === -1) return [...prev, newRow];
  const next = [...prev];
  next[idx] = newRow;
  return next;
}

function readPresence(channel: RealtimeChannel): PresenceUser[] {
  const state = channel.presenceState<PresenceUser>();
  return Object.values(state)
    .map((metas) => metas[0])
    .filter(Boolean) as PresenceUser[];
}
