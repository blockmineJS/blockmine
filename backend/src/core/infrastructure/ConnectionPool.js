const { ExternalServiceError } = require('../errors/index');

class ConnectionPool {
    constructor({ factory, min = 2, max = 10, acquireTimeout = 5000, logger } = {}) {
        this.factory = factory;
        this.min = min;
        this.max = max;
        this.acquireTimeout = acquireTimeout;
        this.logger = logger;
        this.idle = [];
        this.total = 0;
        this.queue = [];
    }

    async acquire() {
        if (this.idle.length > 0) {
            return this.idle.pop();
        }

        if (this.total < this.max) {
            this.total++;
            try {
                return await this.factory.create();
            } catch (err) {
                this.total--;
                throw new ExternalServiceError('errors.connectionPool.createFailed', { cause: err });
            }
        }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const idx = this.queue.findIndex(item => item.resolve === resolve);
                if (idx !== -1) this.queue.splice(idx, 1);
                reject(new ExternalServiceError('errors.connectionPool.acquireTimeout'));
            }, this.acquireTimeout);

            this.queue.push({
                resolve: (conn) => {
                    clearTimeout(timer);
                    resolve(conn);
                },
                reject,
            });
        });
    }

    release(connection) {
        if (this.queue.length > 0) {
            const waiter = this.queue.shift();
            waiter.resolve(connection);
            return;
        }
        this.idle.push(connection);
    }

    async destroy() {
        const connections = [...this.idle];
        this.idle = [];
        this.queue.forEach(({ reject }) =>
            reject(new ExternalServiceError('errors.connectionPool.destroyed'))
        );
        this.queue = [];
        this.total = 0;
        await Promise.all(connections.map(conn => this.factory.destroy(conn)));
    }

    getStats() {
        const pending = this.queue.length;
        const idle = this.idle.length;
        const total = this.total;
        const utilization = total > 0 ? (total - idle) / total : 0;

        if (utilization > 0.8 && this.logger) {
            this.logger.warn({ utilization, total, idle, pending }, 'errors.connectionPool.highUtilization');
        }

        return { total, idle, pending, utilization };
    }
}

module.exports = ConnectionPool;
