const DEFAULTS = {
    useNewDependencyResolver: true,
    useStructuredLogger: true,
    useErrorHandler: true,
    useInputValidation: true,
    useRateLimiter: false,
    useCircuitBreaker: false,
    useMetrics: false,
    useAuditLog: false,
};

class FeatureFlags {
    constructor(overrides = {}) {
        this._flags = { ...DEFAULTS, ...this._loadFromEnv(), ...overrides };
    }

    _loadFromEnv() {
        const flags = {};
        for (const key of Object.keys(DEFAULTS)) {
            const envKey = `FEATURE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
            if (process.env[envKey] !== undefined) {
                flags[key] = process.env[envKey] === 'true';
            }
        }
        return flags;
    }

    isEnabled(flag) {
        return this._flags[flag] === true;
    }

    enable(flag) {
        this._flags[flag] = true;
    }

    disable(flag) {
        this._flags[flag] = false;
    }

    getAll() {
        return { ...this._flags };
    }
}

let instance = null;

function getFeatureFlags() {
    if (!instance) instance = new FeatureFlags();
    return instance;
}

module.exports = { FeatureFlags, getFeatureFlags };
