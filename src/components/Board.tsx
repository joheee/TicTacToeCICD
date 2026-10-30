"use client";

import { useState, useTransition } from "react";
import { outcomeOf, winningLine, type Cell } from "@/lib/game";
import { newGame, playMove, type Score } from "@/lib/play";

const MESSAGES = { win: "You win! 🎉", loss: "The bot wins.", draw: "It's a draw." };
const TONE = { win: "text-ok", loss: "text-err", draw: "text-muted" };

export default function Board({ initialScore, initialBoard }: { initialScore: Score; initialBoard: Cell[] | null }) {
  const [board, setBoard] = useState<Cell[]>(initialBoard ?? Array(9).fill(null));
  const [outcome, setOutcome] = useState<keyof typeof MESSAGES | null>(initialBoard && outcomeOf(initialBoard));
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
    start(() => newGame());
  };

  const stats = [
    { label: "Wins", value: score.wins, tone: "text-ok", bar: "bg-ok" },
    { label: "Losses", value: score.losses, tone: "text-err", bar: "bg-err" },
    { label: "Draws", value: score.draws, tone: "text-muted", bar: "bg-muted" },
  ];

  const status = error || (outcome ? MESSAGES[outcome] : pending ? "Bot is thinking…" : "Your turn");
  const statusTone = error ? "text-err" : outcome ? TONE[outcome] : "text-foreground";
  const lineTone = outcome === "loss" ? "border-err bg-err/15 text-err" : "border-ok bg-ok/15 text-ok";

  return (
    <section className="w-full rounded-3xl border border-border bg-card/90 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-xl border border-border bg-background/70 px-3 pb-2.5 pt-3.5 text-center">
            <span className={`absolute inset-x-0 top-0 h-0.5 ${s.bar}`} />
            <div className={`font-mono text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <p
          aria-live="polite"
          className={`inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-sm font-medium ${statusTone}`}
        >
          {!outcome && !error && (
            <span className={`size-2 rounded-full ${pending ? "pulse-dot bg-o" : "bg-accent"}`} />
          )}
          {status}
          {!outcome && !error && !pending && <span className="font-mono text-xs text-muted">you are X</span>}
        </p>
      </div>

      <div className="mx-auto my-6 grid w-fit grid-cols-3 gap-3">
        {board.map((cell, i) => {
          const hit = line?.includes(i);
          const open = !cell && !outcome;
          return (
            <button
              key={i}
              onClick={() => play(i)}
              disabled={!!cell || !!outcome}
              aria-label={`cell ${i + 1}${cell ? `, ${cell}` : ""}`}
              className={`group flex size-[5.25rem] items-center justify-center rounded-2xl border text-5xl font-bold transition duration-150 sm:size-28 sm:text-6xl ${
                hit
                  ? `win-line ${lineTone}`
                  : "border-border bg-background/70 enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:border-accent/70 enabled:hover:bg-accent/10"
              } ${!hit && cell === "X" ? "text-accent" : ""} ${!hit && cell === "O" ? "text-o" : ""}`}
            >
              {cell && <span className={`pop ${cell === "X" ? "mark-x" : "mark-o"}`}>{cell}</span>}
              {open && <span className="text-accent opacity-0 transition group-hover:opacity-25">X</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={reset}
        className={`mx-auto block cursor-pointer rounded-xl border px-5 py-2.5 text-sm font-medium transition ${
          outcome
            ? "blink border-accent/60 bg-accent/10 text-foreground hover:border-accent"
            : "border-border text-muted hover:border-accent hover:text-foreground"
        }`}
      >
        New game
      </button>
    </section>
  );
}
