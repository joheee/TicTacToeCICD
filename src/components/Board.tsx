"use client";

import { useState, useTransition } from "react";
import { winningLine, type Cell } from "@/lib/game";
import { playMove, type Score } from "@/lib/play";

const MESSAGES = { win: "You win! 🎉", loss: "The bot wins.", draw: "It's a draw." };
const TONE = { win: "text-ok", loss: "text-err", draw: "text-muted" };

export default function Board({ initialScore }: { initialScore: Score }) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [outcome, setOutcome] = useState<keyof typeof MESSAGES | null>(null);
  const [score, setScore] = useState(initialScore);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const line = winningLine(board);

  const play = (i: number) => {
    if (board[i] || outcome || pending) return;
    start(async () => {
      const res = await playMove(board, i);
      setError(res.error ?? "");
      setBoard(res.board);
      setOutcome(res.outcome);
      if (res.score) setScore(res.score);
    });
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setOutcome(null);
    setError("");
  };

  const stats = [
    { label: "Wins", value: score.wins, tone: "text-ok" },
    { label: "Losses", value: score.losses, tone: "text-err" },
    { label: "Draws", value: score.draws, tone: "text-muted" },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/20 sm:p-6">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-background px-3 py-2 text-center">
            <div className={`font-mono text-2xl font-semibold ${s.tone}`}>{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <p
        aria-live="polite"
        className={`mt-5 h-6 text-center font-medium ${error ? "text-err" : outcome ? TONE[outcome] : "text-muted"}`}
      >
        {error || (outcome ? MESSAGES[outcome] : pending ? "Bot is thinking…" : "Your turn — you are X")}
      </p>

      <div className="mx-auto my-4 grid w-fit grid-cols-3 gap-2.5">
        {board.map((cell, i) => {
          const hit = line?.includes(i);
          return (
            <button
              key={i}
              onClick={() => play(i)}
              disabled={!!cell || !!outcome}
              aria-label={`cell ${i + 1}${cell ? `, ${cell}` : ""}`}
              className={`flex size-20 items-center justify-center rounded-xl border text-4xl font-bold transition sm:size-24 ${
                hit
                  ? "border-accent bg-accent/20"
                  : "border-border bg-background enabled:cursor-pointer enabled:hover:border-accent/60 enabled:hover:bg-accent/10"
              } ${cell === "X" ? "text-accent" : "text-foreground"}`}
            >
              {cell && <span className="pop">{cell}</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={reset}
        className="mx-auto block cursor-pointer rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
      >
        New game
      </button>
    </section>
  );
}
