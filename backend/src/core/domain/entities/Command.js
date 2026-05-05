class Command {
    constructor({ id, botId, name, isEnabled, cooldown, aliases, description, owner, permissionId, allowedChatTypes, isVisual, argumentsJson, graphJson, pluginOwnerId } = {}) {
        this.id = id;
        this.botId = botId;
        this.name = name;
        this.isEnabled = isEnabled !== false;
        this.cooldown = cooldown || 0;
        this.aliases = typeof aliases === 'string' ? JSON.parse(aliases || '[]') : (aliases || []);
        this.description = description || null;
        this.owner = owner || null;
        this.permissionId = permissionId || null;
        this.allowedChatTypes = typeof allowedChatTypes === 'string' ? JSON.parse(allowedChatTypes || '["chat","private"]') : (allowedChatTypes || ['chat', 'private']);
        this.isVisual = isVisual || false;
        this.arguments = typeof argumentsJson === 'string' ? JSON.parse(argumentsJson || '[]') : (argumentsJson || []);
        this.graphJson = graphJson || null;
        this.pluginOwnerId = pluginOwnerId || null;
    }

    isAllowedInChat(chatType) {
        return this.allowedChatTypes.includes(chatType);
    }

    hasCooldown() {
        return this.cooldown > 0;
    }

    toJSON() {
        return {
            id: this.id,
            botId: this.botId,
            name: this.name,
            isEnabled: this.isEnabled,
            cooldown: this.cooldown,
            aliases: this.aliases,
            description: this.description,
            allowedChatTypes: this.allowedChatTypes,
        };
    }
}

module.exports = Command;
