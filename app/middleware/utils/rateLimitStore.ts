/**
 * Rate Limit Store Entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number; // Timestamp when the window resets
}

/**
 * In-memory Rate Limit Store with automatic cleanup
 * Uses sliding window algorithm
 */
export class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalMs: number = 60000; // Cleanup every minute

  constructor(autoCleanup: boolean = true) {
    if (autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * Increment the counter for a key
   * Returns the current count and whether the limit is exceeded
   */
  public increment(
    key: string,
    windowMs: number,
    maxRequests: number
  ): { count: number; resetTime: number; exceeded: boolean } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      // Create new window
      const resetTime = now + windowMs;
      this.store.set(key, {
        count: 1,
        resetTime,
      });

      return {
        count: 1,
        resetTime,
        exceeded: false,
      };
    }

    // Increment existing window
    entry.count++;
    this.store.set(key, entry);

    return {
      count: entry.count,
      resetTime: entry.resetTime,
      exceeded: entry.count > maxRequests,
    };
  }

  /**
   * Get current count for a key
   */
  public get(key: string): RateLimitEntry | undefined {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (now >= entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  /**
   * Reset counter for a key
   */
  public reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Reset all counters
   */
  public resetAll(): void {
    this.store.clear();
  }

  /**
   * Get number of tracked keys
   */
  public size(): number {
    return this.store.size;
  }

  /**
   * Clean up expired entries
   */
  public cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`[RateLimitStore] Cleaned up ${cleaned} expired entries`);
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get store statistics
   */
  public getStats(): {
    totalKeys: number;
    entries: Array<{ key: string; count: number; timeUntilReset: number }>;
  } {
    const now = Date.now();
    const entries: Array<{ key: string; count: number; timeUntilReset: number }> = [];

    for (const [key, entry] of this.store.entries()) {
      if (now < entry.resetTime) {
        entries.push({
          key,
          count: entry.count,
          timeUntilReset: entry.resetTime - now,
        });
      }
    }

    return {
      totalKeys: this.store.size,
      entries,
    };
  }
}

/**
 * Global rate limit store instance
 */
export const globalRateLimitStore = new RateLimitStore(true);
