const BaseRepository = require('./BaseRepository');

class PluginRepository extends BaseRepository {
    constructor({ prisma }) {
        super({ prisma });
        this.modelName = 'installedPlugin';
    }

    async findByBotId(botId) {
        return this.model.findMany({
            where: { botId },
            orderBy: { name: 'asc' },
        });
    }

    async findByName(botId, name) {
        return this.model.findFirst({
            where: { botId, name },
        });
    }

    async findEnabledByBotId(botId) {
        return this.model.findMany({
            where: {
                botId,
                isEnabled: true,
            },
        });
    }

    async updateEnabled(pluginId, isEnabled) {
        return this.update(pluginId, { isEnabled });
    }

    async deleteByName(botId, name) {
        return this.model.deleteMany({
            where: { botId, name },
        });
    }
}

module.exports = PluginRepository;
