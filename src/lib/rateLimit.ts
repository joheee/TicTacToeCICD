// In-memory counters for the login and register forms. The app runs as a single container, so a
// process-wide Map is enough; a restart (every deploy) clears it, which is fine for this purpose.
type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();
const MAX_KEYS = 10_000;

function prune(now: number) {
  if (buckets.size <= MAX_KEYS) return;
  for (const [key, entry] of buckets) if (entry.resetAt <= now) buckets.delete(key);
  // Still too big (many live keys): drop the oldest ones so memory stays bounded.
  for (const key of buckets.keys()) {
    if (buckets.size <= MAX_KEYS / 2) break;
    buckets.delete(key);
  }
}

/** Seconds until `key` may try again, or 0 if it is under `max` hits. */
export function retryAfter(key: string, max: number): number {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now || entry.count < max) return 0;
  return Math.ceil((entry.resetAt - now) / 1000);
}

/** Counts one hit. The window starts at the first hit and the count resets when it ends. */
export function recordHit(key: string, windowMs: number): void {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    prune(now);
  } else {
    entry.count++;
  }
}

export function reset(key: string): void {
  buckets.delete(key);
}

export function minutes(seconds: number): string {
  const m = Math.max(1, Math.ceil(seconds / 60));
  return m === 1 ? "1 minute" : `${m} minutes`;
}
