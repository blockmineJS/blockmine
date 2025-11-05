const BaseRepository = require('./BaseRepository');

class PermissionRepository extends BaseRepository {
    constructor({ prisma }) {
        super({ prisma });
        this.modelName = 'permission';
    }

    async findByBotId(botId) {
        return this.model.findMany({
            where: { botId },
            orderBy: { name: 'asc' },
        });
    }

    async findByName(botId, name) {
        return this.model.findUnique({
            where: {
                botId_name: { botId, name },
            },
        });
    }

    async upsertPermission(botId, name, data) {
        return this.model.upsert({
            where: {
                botId_name: { botId, name },
            },
            update: data,
            create: {
                botId,
                name,
                ...data,
            },
        });
    }

    async findSystemPermissions(botId) {
        return this.model.findMany({
            where: {
                botId,
                owner: 'system',
            },
        });
    }
}

module.exports = PermissionRepository;
