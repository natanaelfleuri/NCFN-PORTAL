// Simple in-memory sliding window rate limiter
// Not persistent across restarts — acceptable for dev/single-instance
const store = new Map<string, number[]>();

/**
 * Returns true if request is ALLOWED, false if rate limit exceeded.
 * @param key      Unique key (e.g. "upload:email@x.com")
 * @param max      Max requests allowed in window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = (store.get(key) ?? []).filter(t => now - t < windowMs);
    if (timestamps.length >= max) return false;
    timestamps.push(now);
    store.set(key, timestamps);
    return true;
}

// Cleanup stale entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
        const fresh = timestamps.filter(t => now - t < 3_600_000); // 1h max window
        if (fresh.length === 0) store.delete(key);
        else store.set(key, fresh);
    }
}, 10 * 60 * 1000);
