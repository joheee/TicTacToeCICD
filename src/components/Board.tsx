"use client";

import { useState } from "react";
import { isDraw, winner, type Cell } from "@/lib/game";

export default function Board() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const won = winner(board);
  const draw = isDraw(board);

  const play = (i: number) => {
    if (board[i] || won) return;
    setBoard(board.map((c, idx) => (idx === i ? (xTurn ? "X" : "O") : c)));
    setXTurn(!xTurn);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setXTurn(true);
  };

  const status = won ? `${won} wins!` : draw ? "Draw." : `Next: ${xTurn ? "X" : "O"}`;

  return (
    <div>
      <p aria-live="polite">{status}</p>
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
