
interface RateLimitOptions {
    interval: number; // Interval in milliseconds
    uniqueTokenPerInterval: number; // Max number of unique tokens per interval
}

interface RateLimitContext {
    check: (limit: number, token: string) => Promise<void>;
}

const rateLimit = (options: RateLimitOptions): RateLimitContext => {
    const tokenCache = new Map<string, number[]>();
    let lastIntervalStart = Date.now();

    return {
        check: async (limit: number, token: string) => {
            const now = Date.now();
            const intervalStart = Math.floor(now / options.interval) * options.interval;

            // Cleanup tokens from previous intervals
            if (lastIntervalStart !== intervalStart) {
                // Simple cleanup: if we moved to a new interval, we could clear everything 
                // but that might be too aggressive for sliding windows. 
                // For this simple implementation, we'll let the map grow slightly strictly adhering to the interval bucket.
                // A more robust solution involves LRU cache but Map is fine for this scale.

                // Actually, to prevent memory leaks in this simple implementation, 
                // let's just clear the cache if the interval has significantly jumped (e.g. valid window passed)
                if (now - lastIntervalStart > options.interval) {
                    tokenCache.clear();
                    lastIntervalStart = intervalStart;
                }
            }

            const tokenCount = tokenCache.get(token) || [0];
            if (tokenCount[0] === 0) {
                tokenCache.set(token, tokenCount);
            }
            tokenCount[0] += 1;

            const currentUsage = tokenCount[0];
            const isRateLimited = currentUsage > limit;

            if (isRateLimited) {
                throw new Error('Rate limit exceeded');
            }

            // We don't need to return anything, just throw if limited
        },
    };
};

export default rateLimit;
