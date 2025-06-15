const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PermissionManager {
    /**
     * Регистрирует одно или несколько прав для КОНКРЕТНОГО бота.
     * @param {number} botId - ID бота, для которого регистрируются права.
     * @param {Array<object>} permissions - Массив объектов прав.
     */
    async registerPermissions(botId, permissions) {
        for (const perm of permissions) {
            if (!perm.name || !perm.owner) {
                console.warn('[PermissionManager] Пропущено право без имени или владельца:', perm);
                continue;
            }
            await prisma.permission.upsert({
                where: { botId_name: { botId, name: perm.name } },
                update: { description: perm.description },
                create: {
                    botId,
                    name: perm.name,
                    description: perm.description || '',
                    owner: perm.owner,
                },
            });
        }
    }


    /**
     * Добавляет права к уже существующей группе.
     * @param {number} botId - ID бота.
     * @param {string} groupName - Имя группы, которую нужно обновить.
     * @param {Array<string>} permissionNames - Массив имен прав для добавления.
     */
    async addPermissionsToGroup(botId, groupName, permissionNames) {
        const group = await prisma.group.findUnique({
            where: { botId_name: { botId, name: groupName } }
        });

        if (!group) {
            console.warn(`[PermissionManager] Попытка добавить права в несуществующую группу "${groupName}" для бота ID ${botId}.`);
            return;
        }

        for (const permName of permissionNames) {
            const permission = await prisma.permission.findUnique({
                where: { botId_name: { botId, name: permName } }
            });

            if (permission) {
                await prisma.groupPermission.upsert({
                    where: { groupId_permissionId: { groupId: group.id, permissionId: permission.id } },
                    update: {},
                    create: { groupId: group.id, permissionId: permission.id },
                });
            } else {
                console.warn(`[PermissionManager] Право "${permName}" не найдено для бота ID ${botId} при добавлении в группу "${groupName}".`);
            }
        }
    }

    /**
     * Регистрирует группу для КОНКРЕТНОГО бота и привязывает к ней права.
     * @param {number} botId - ID бота, для которого регистрируется группа.
     * @param {object} groupConfig - Конфигурация группы.
     */
    async registerGroup(botId, groupConfig) {
        if (!groupConfig.name || !groupConfig.owner) {
            console.warn('[PermissionManager] Пропущена группа без имени или владельца:', groupConfig);
            return;
        }

        const group = await prisma.group.upsert({
            where: { botId_name: { botId, name: groupConfig.name } },
            update: {},
            create: { botId, name: groupConfig.name, owner: groupConfig.owner },
        });

        if (groupConfig.permissions && groupConfig.permissions.length > 0) {
            for (const permName of groupConfig.permissions) {
                const permission = await prisma.permission.findUnique({ where: { botId_name: { botId, name: permName } } });
                if (permission) {
                    await prisma.groupPermission.upsert({
                        where: { groupId_permissionId: { groupId: group.id, permissionId: permission.id } },
                        update: {},
                        create: { groupId: group.id, permissionId: permission.id },
                    });
                } else {
                    console.warn(`[PermissionManager] Право "${permName}" не найдено для бота ID ${botId} при привязке к группе "${groupConfig.name}".`);
                }
            }
        }
    }
}

module.exports = new PermissionManager();