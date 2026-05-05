class PluginManifest {
    constructor(data) {
        if (!data || typeof data !== 'object') {
            throw new TypeError('domain.pluginManifest.invalidData');
        }
        this._data = Object.freeze({
            name: data.name || '',
            version: data.version || '0.0.0',
            main: data.main || 'index.js',
            description: data.description || '',
            dependencies: Object.freeze(data.dependencies || {}),
            settings: Object.freeze(data.settings || {}),
        });
    }

    get name() { return this._data.name; }
    get version() { return this._data.version; }
    get main() { return this._data.main; }
    get description() { return this._data.description; }
    get dependencies() { return this._data.dependencies; }
    get settings() { return this._data.settings; }

    hasDependencies() {
        return Object.keys(this._data.dependencies).length > 0;
    }

    getDependencyNames() {
        return Object.keys(this._data.dependencies);
    }

    toJSON() {
        return { ...this._data };
    }
}

module.exports = PluginManifest;
