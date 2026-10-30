import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { minutes, recordHit, reset, retryAfter } from "./rateLimit";

const WINDOW = 60_000;

describe("rateLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows hits under the limit", () => {
    const key = "under";
    for (let i = 0; i < 2; i++) recordHit(key, WINDOW);
    expect(retryAfter(key, 3)).toBe(0);
  });

  it("blocks once the limit is reached and reports the wait", () => {
    const key = "blocked";
    for (let i = 0; i < 3; i++) recordHit(key, WINDOW);
    expect(retryAfter(key, 3)).toBe(60);
    vi.advanceTimersByTime(20_000);
    expect(retryAfter(key, 3)).toBe(40);
  });

  it("allows again after the window ends", () => {
    const key = "expires";
    for (let i = 0; i < 3; i++) recordHit(key, WINDOW);
    vi.advanceTimersByTime(WINDOW);
    expect(retryAfter(key, 3)).toBe(0);
    recordHit(key, WINDOW);
    expect(retryAfter(key, 3)).toBe(0);
  });

  it("reset clears the counter", () => {
    const key = "reset";
    for (let i = 0; i < 3; i++) recordHit(key, WINDOW);
    reset(key);
    expect(retryAfter(key, 3)).toBe(0);
  });

  it("keeps keys independent", () => {
    for (let i = 0; i < 3; i++) recordHit("a", WINDOW);
    expect(retryAfter("b", 3)).toBe(0);
  });

  it("formats the wait in whole minutes, at least one", () => {
    expect(minutes(5)).toBe("1 minute");
    expect(minutes(61)).toBe("2 minutes");
    expect(minutes(900)).toBe("15 minutes");
  });
});
