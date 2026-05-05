class Plugin {
    constructor({ id, botId, name, version, description, sourceType, sourceUri, sourceRefType, sourceRef, path, isEnabled, manifest, settings, createdAt } = {}) {
        this.id = id;
        this.botId = botId;
        this.name = name;
        this.version = version;
        this.description = description || '';
        this.sourceType = sourceType;
        this.sourceUri = sourceUri || null;
        this.sourceRefType = sourceRefType || null;
        this.sourceRef = sourceRef || null;
        this.path = path;
        this.isEnabled = isEnabled !== false;
        this.manifest = typeof manifest === 'string' ? JSON.parse(manifest || '{}') : (manifest || {});
        this.settings = typeof settings === 'string' ? JSON.parse(settings || '{}') : (settings || {});
        this.createdAt = createdAt;
    }

    getDependencies() {
        return this.manifest.dependencies || {};
    }

    isLocal() {
        return this.sourceType === 'LOCAL' || this.sourceType === 'LOCAL_IDE';
    }

    isGithub() {
        return this.sourceType === 'GITHUB';
    }

    toJSON() {
        return {
            id: this.id,
            botId: this.botId,
            name: this.name,
            version: this.version,
            description: this.description,
            sourceType: this.sourceType,
            sourceUri: this.sourceUri,
            isEnabled: this.isEnabled,
        };
    }
}

module.exports = Plugin;
