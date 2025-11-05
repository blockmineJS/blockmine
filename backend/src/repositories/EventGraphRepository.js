const BaseRepository = require('./BaseRepository');

class EventGraphRepository extends BaseRepository {
    constructor({ prisma }) {
        super({ prisma });
        this.modelName = 'eventGraph';
    }

    async findByBotId(botId) {
        return this.model.findMany({
            where: { botId },
            orderBy: { name: 'asc' },
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

    async findByEventType(botId, eventType) {
        return this.model.findMany({
            where: {
                botId,
                eventType,
                isEnabled: true,
            },
        });
    }

    async updateEnabled(graphId, isEnabled) {
        return this.update(graphId, { isEnabled });
    }
}

module.exports = EventGraphRepository;
