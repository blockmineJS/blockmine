class BotConfig {
    constructor(data) {
        if (!data || typeof data !== 'object') {
            throw new TypeError('domain.botConfig.invalidData');
        }
        this._data = Object.freeze({ ...data });
    }

    get id() { return this._data.id; }
    get username() { return this._data.username; }
    get host() { return this._data.host; }
    get port() { return this._data.port; }
    get version() { return this._data.version; }
    get prefix() { return this._data.prefix || '@'; }
    get owners() { return this._data.owners || ''; }
    get plugins() { return this._data.plugins || []; }

    with(overrides) {
        return new BotConfig({ ...this._data, ...overrides });
    }

    toJSON() {
        return { ...this._data };
    }
}

module.exports = BotConfig;
