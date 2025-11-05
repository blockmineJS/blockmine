const BaseRepository = require('./BaseRepository');

class GroupRepository extends BaseRepository {
    constructor({ prisma }) {
        super({ prisma });
        this.modelName = 'group';
    }

    async findByBotId(botId) {
        return this.model.findMany({
            where: { botId },
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findByName(botId, name) {
        return this.model.findUnique({
            where: {
                botId_name: { botId, name },
            },
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }

    async upsertGroup(botId, name, data) {
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

    async addPermissionToGroup(groupId, permissionId, prisma) {
        return prisma.groupPermission.upsert({
            where: {
                groupId_permissionId: { groupId, permissionId },
            },
            update: {},
            create: { groupId, permissionId },
        });
    }

    async removePermissionFromGroup(groupId, permissionId, prisma) {
        return prisma.groupPermission.deleteMany({
            where: { groupId, permissionId },
        });
    }
}

module.exports = GroupRepository;
