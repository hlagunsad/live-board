"use client";

import type { Card } from "@/lib/types";

export type MoveAction = "left" | "right" | "up" | "down";

const ARROWS: Record<MoveAction, string> = {
  left: "←",
  up: "↑",
  down: "↓",
  right: "→",
};

function MoveButton({
  action,
  enabled,
  onMove,
}: {
  action: MoveAction;
  enabled: boolean;
  onMove: (action: MoveAction) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Move card ${action}`}
      disabled={!enabled}
      onClick={() => onMove(action)}
      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-sky-50 hover:text-sky-600 disabled:pointer-events-none disabled:opacity-25"
    >
      {ARROWS[action]}
    </button>
  );
}

export default function CardView({
  card,
  canLeft,
  canRight,
  canUp,
  canDown,
  flash,
  onMove,
  onDelete,
}: {
  card: Card;
  canLeft: boolean;
  canRight: boolean;
  canUp: boolean;
  canDown: boolean;
  flash: boolean;
  onMove: (action: MoveAction) => void;
  onDelete: () => void;
}) {
  return (
    <div
      data-testid="card"
      className={`group rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:shadow-md ${
        flash ? "lb-flash" : ""
      }`}
    >
      <p className="text-sm leading-snug text-slate-800">{card.title}</p>
      <div className="mt-2 flex items-center gap-0.5">
        <MoveButton action="left" enabled={canLeft} onMove={onMove} />
        <MoveButton action="up" enabled={canUp} onMove={onMove} />
        <MoveButton action="down" enabled={canDown} onMove={onMove} />
        <MoveButton action="right" enabled={canRight} onMove={onMove} />
        <button
          type="button"
          aria-label="Delete card"
          onClick={onDelete}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-500"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
