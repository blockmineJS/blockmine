class BatchingUtility {
    constructor({ windowMs = 10, maxSize = 100 } = {}) {
        this.windowMs = windowMs;
        this.maxSize = maxSize;
        this._queue = [];
        this._timer = null;
        this._resolvers = [];
    }

    add(operation) {
        return new Promise((resolve, reject) => {
            this._queue.push({ operation, resolve, reject });
            this._resolvers.push({ resolve, reject });

            if (this._queue.length >= this.maxSize) {
                this._flush();
                return;
            }

            if (!this._timer) {
                this._timer = setTimeout(() => this._flush(), this.windowMs);
            }
        });
    }

    async _flush() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }

        const batch = this._queue.splice(0);
        if (batch.length === 0) return;

        for (const { operation, resolve, reject } of batch) {
            try {
                const result = await operation();
                resolve(result);
            } catch (err) {
                reject(err);
            }
        }
    }

    async flush() {
        return this._flush();
    }

    getPendingCount() {
        return this._queue.length;
    }

    destroy() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        const err = new Error('BatchingUtility destroyed');
        for (const { reject } of this._queue) {
            reject(err);
        }
        this._queue = [];
    }
}

module.exports = BatchingUtility;
