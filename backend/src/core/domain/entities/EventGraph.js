class EventGraph {
    constructor({ id, botId, name, isEnabled, graphJson, variables, pluginOwnerId, createdAt, updatedAt } = {}) {
        this.id = id;
        this.botId = botId;
        this.name = name;
        this.isEnabled = isEnabled !== false;
        this.graphJson = graphJson || null;
        this.variables = typeof variables === 'string' ? JSON.parse(variables || '[]') : (variables || []);
        this.pluginOwnerId = pluginOwnerId || null;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    getParsedGraph() {
        if (!this.graphJson || this.graphJson === 'null') return null;
        if (typeof this.graphJson === 'object') return this.graphJson;
        try {
            return JSON.parse(this.graphJson);
        } catch {
            return null;
        }
    }

    isOwnedByPlugin() {
        return this.pluginOwnerId !== null;
    }

    toJSON() {
        return {
            id: this.id,
            botId: this.botId,
            name: this.name,
            isEnabled: this.isEnabled,
            pluginOwnerId: this.pluginOwnerId,
        };
    }
}

module.exports = EventGraph;
