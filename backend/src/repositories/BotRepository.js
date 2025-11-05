const BaseRepository = require('./BaseRepository');

class BotRepository extends BaseRepository {
    constructor({ prisma }) {
        super({ prisma });
        this.modelName = 'bot';
    }

    async findByIdWithServer(id) {
        return this.model.findUnique({
            where: { id },
            include: { server: true },
        });
    }

    async findAllWithServer(options = {}) {
        return this.model.findMany({
            include: { server: true },
            orderBy: { sortOrder: 'asc' },
            ...options,
        });
    }

    async findByUsername(username) {
        return this.model.findUnique({
            where: { username },
        });
    }

    async findByServerId(serverId) {
        return this.model.findMany({
            where: { serverId },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async updateSortOrder(botId, sortOrder) {
        return this.update(botId, { sortOrder });
    }
}

module.exports = BotRepository;
