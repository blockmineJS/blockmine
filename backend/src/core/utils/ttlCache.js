class TtlCache {
    constructor({ ttlMs, cleanupIntervalMs = null, maxSize = 0 } = {}) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error('TtlCache: ttlMs must be a positive number.');
        }
        this.ttlMs = ttlMs;
        this.maxSize = maxSize;
        this.store = new Map();
        if (cleanupIntervalMs && Number.isFinite(cleanupIntervalMs) && cleanupIntervalMs > 0) {
            this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
            if (typeof this.cleanupTimer.unref === 'function') {
                this.cleanupTimer.unref();
            }
        }
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    set(key, value, ttlMs = this.ttlMs) {
        if (this.maxSize > 0 && this.store.size >= this.maxSize && !this.store.has(key)) {
            const firstKey = this.store.keys().next().value;
            if (firstKey !== undefined) {
                this.store.delete(firstKey);
            }
        }
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
        return value;
    }

    delete(key) {
        return this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (entry.expiresAt <= now) {
                this.store.delete(key);
            }
        }
    }

    dispose() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.store.clear();
    }
}

module.exports = TtlCache;
