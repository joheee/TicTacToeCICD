"use client";

import { useState, useTransition } from "react";
import type { Cell } from "@/lib/game";
import { playMove, type Score } from "@/lib/play";

const MESSAGES = { win: "You win!", loss: "Bot wins.", draw: "Draw." };

export default function Board({ initialScore }: { initialScore: Score }) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [outcome, setOutcome] = useState<keyof typeof MESSAGES | null>(null);
  const [score, setScore] = useState(initialScore);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

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

  return (
    <div>
      <p>
        Wins {score.wins} · Losses {score.losses} · Draws {score.draws}
      </p>
      <p aria-live="polite">{error || (outcome ? MESSAGES[outcome] : "Your turn (X)")}</p>
      <div className="board">
        {board.map((cell, i) => (
          <button key={i} onClick={() => play(i)} aria-label={`cell ${i + 1}`}>
            {cell}
          </button>
        ))}
      </div>
      <button onClick={reset}>New game</button>
    </div>
  );
}
