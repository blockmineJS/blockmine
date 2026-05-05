class RateLimiter {
    constructor({ windowMs = 60000, max = 100, keyPrefix = '' } = {}) {
        this.windowMs = windowMs;
        this.max = max;
        this.keyPrefix = keyPrefix;
        this.store = new Map();
    }

    _getKey(key) {
        return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
    }

    _prune(timestamps, now) {
        const cutoff = now - this.windowMs;
        let i = 0;
        while (i < timestamps.length && timestamps[i] <= cutoff) i++;
        return timestamps.slice(i);
    }

    check(key) {
        const storeKey = this._getKey(key);
        const now = Date.now();
        const timestamps = this._prune(this.store.get(storeKey) || [], now);

        const resetAt = timestamps.length > 0 ? timestamps[0] + this.windowMs : now + this.windowMs;
        const allowed = timestamps.length < this.max;

        if (allowed) {
            timestamps.push(now);
            this.store.set(storeKey, timestamps);
            return { allowed: true, remaining: this.max - timestamps.length, resetAt };
        }

        const retryAfter = Math.ceil((resetAt - now) / 1000);
        this.store.set(storeKey, timestamps);
        return { allowed: false, remaining: 0, resetAt, retryAfter };
    }

    reset(key) {
        this.store.delete(this._getKey(key));
    }

    middleware() {
        return (req, res, next) => {
            const key = req.user?.id ? String(req.user.id) : req.ip;
            const result = this.check(key);

            res.set('X-RateLimit-Limit', String(this.max));
            res.set('X-RateLimit-Remaining', String(result.remaining));
            res.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

            if (!result.allowed) {
                return res.status(429).json({
                    error: 'errors.rateLimit.exceeded',
                    retryAfter: result.retryAfter,
                });
            }

            next();
        };
    }
}

module.exports = RateLimiter;
