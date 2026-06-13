"use client";

import { useState } from "react";
import type { Card, Column } from "@/lib/types";
import CardView, { type MoveAction } from "./Card";

/** "To Do" → "to-do", "In Progress" → "in-progress" — used for a stable data-testid. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ColumnView({
  column,
  cards,
  isFirstLane,
  isLastLane,
  flashing,
  onAddCard,
  onMoveCard,
  onDeleteCard,
}: {
  column: Column;
  cards: Card[];
  isFirstLane: boolean;
  isLastLane: boolean;
  flashing: Record<string, number>;
  onAddCard: (title: string) => void;
  onMoveCard: (card: Card, action: MoveAction) => void;
  onDeleteCard: (cardId: string) => void;
}) {
  const [title, setTitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAddCard(t);
    setTitle("");
  }

  return (
    <section
      data-testid={`list-${slugify(column.title)}`}
      className="flex max-h-[calc(100vh-9rem)] w-[300px] shrink-0 flex-col rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur"
    >
      <header className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <h2 className="font-display text-sm font-bold tracking-wide text-slate-700">
          {column.title}
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          {cards.length}
        </span>
      </header>

      <div className="flex flex-col gap-2 overflow-y-auto px-3 pb-1">
        {cards.map((card, i) => (
          <CardView
            key={card.id}
            card={card}
            canLeft={!isFirstLane}
            canRight={!isLastLane}
            canUp={i > 0}
            canDown={i < cards.length - 1}
            flash={Boolean(flashing[card.id])}
            onMove={(action) => onMoveCard(card, action)}
            onDelete={() => onDeleteCard(card.id)}
          />
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a card"
          aria-label={`Add a card to ${column.title}`}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Add
        </button>
      </form>
    </section>
  );
}
