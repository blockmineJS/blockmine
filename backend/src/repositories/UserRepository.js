const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
    constructor({ prisma }) {
        super({ prisma });
        this.modelName = 'user';
    }

    async findByUsername(botId, username) {
        return this.model.findUnique({
            where: {
                botId_username: { botId, username },
            },
        });
    }

    async findByBotId(botId) {
        return this.model.findMany({
            where: { botId },
            orderBy: { username: 'asc' },
        });
    }

    async upsertUser(botId, username, data) {
        return this.model.upsert({
            where: {
                botId_username: { botId, username },
            },
            update: data,
            create: {
                botId,
                username,
                ...data,
            },
        });
    }

    async updateBlacklist(botId, username, isBlacklisted) {
        return this.model.update({
            where: {
                botId_username: { botId, username },
            },
            data: { isBlacklisted },
        });
    }
}

module.exports = UserRepository;
