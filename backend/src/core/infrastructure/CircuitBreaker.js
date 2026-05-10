const { EventEmitter } = require('events');
const { ExternalServiceError } = require('../errors/index');

const STATE = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

class CircuitBreaker extends EventEmitter {
    constructor({ failureThreshold = 5, successThreshold = 2, timeout = 60000, logger } = {}) {
        super();
        this.failureThreshold = failureThreshold;
        this.successThreshold = successThreshold;
        this.timeout = timeout;
        this.logger = logger;

        this.state = STATE.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = null;
        this._cachedResponse = null;
    }

    async call(fn, fallback = null) {
        if (this.state === STATE.OPEN) {
            if (Date.now() < this.nextAttempt) {
                if (fallback !== null) return typeof fallback === 'function' ? fallback() : fallback;
                throw new ExternalServiceError('errors.circuitBreaker.open');
            }
            this._transition(STATE.HALF_OPEN);
        }

        try {
            const result = await fn();
            this._onSuccess(result);
            return result;
        } catch (err) {
            this._onFailure(err);
            if (fallback !== null) return typeof fallback === 'function' ? fallback() : fallback;
            throw err;
        }
    }

    _onSuccess(result) {
        this._cachedResponse = result;
        this.failureCount = 0;

        if (this.state === STATE.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this._transition(STATE.CLOSED);
            }
        }
    }

    _onFailure(err) {
        this.failureCount++;
        this.successCount = 0;

        if (this.state === STATE.HALF_OPEN || this.failureCount >= this.failureThreshold) {
            this._transition(STATE.OPEN);
        }
    }

    _transition(newState) {
        const prevState = this.state;
        this.state = newState;

        if (newState === STATE.OPEN) {
            this.nextAttempt = Date.now() + this.timeout;
            this.successCount = 0;
        } else if (newState === STATE.CLOSED) {
            this.failureCount = 0;
            this.successCount = 0;
            this.nextAttempt = null;
        } else if (newState === STATE.HALF_OPEN) {
            this.successCount = 0;
        }

        if (this.logger) {
            this.logger.warn(
                { from: prevState, to: newState, failureCount: this.failureCount },
                'errors.circuitBreaker.stateChange'
            );
        }

        this.emit('stateChange', { from: prevState, to: newState });
    }

    getState() {
        return this.state;
    }

    getStats() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttempt: this.nextAttempt,
        };
    }
}

CircuitBreaker.STATE = STATE;

module.exports = CircuitBreaker;
