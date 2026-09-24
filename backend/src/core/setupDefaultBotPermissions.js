const prisma = require('../lib/prisma');

const INITIAL = {
    groups: ['User', 'Admin'],
    permissions: [
        { name: 'admin.*', description: 'Все права администратора' },
        { name: 'admin.cooldown.bypass', description: 'Обход кулдауна для админ-команд' },
        { name: 'user.*', description: 'Все права обычного пользователя' },
        { name: 'user.say', description: 'Доступ к простым командам' },
        { name: 'user.cooldown.bypass', description: 'Обход кулдауна для юзер-команд' },
    ],
    groupPermissions: {
        User: ['user.say'],
        Admin: ['admin.*', 'admin.cooldown.bypass', 'user.cooldown.bypass', 'user.*'],
    },
};

async function setupDefaultPermissionsForBot(botId, prismaClient = prisma) {
    for (const perm of INITIAL.permissions) {
        await prismaClient.permission.upsert({
            where: { botId_name: { botId, name: perm.name } },
            update: { description: perm.description },
            create: { ...perm, botId, owner: 'system' },
        });
    }
    for (const groupName of INITIAL.groups) {
        await prismaClient.group.upsert({
            where: { botId_name: { botId, name: groupName } },
            update: {},
            create: { name: groupName, botId, owner: 'system' },
        });
    }
    for (const [groupName, permNames] of Object.entries(INITIAL.groupPermissions)) {
        const group = await prismaClient.group.findUnique({ where: { botId_name: { botId, name: groupName } } });
        if (!group) continue;
        for (const permName of permNames) {
            const permission = await prismaClient.permission.findUnique({ where: { botId_name: { botId, name: permName } } });
            if (!permission) continue;
            await prismaClient.groupPermission.upsert({
                where: { groupId_permissionId: { groupId: group.id, permissionId: permission.id } },
                update: {},
                create: { groupId: group.id, permissionId: permission.id },
            });
        }
    }
}

module.exports = { setupDefaultPermissionsForBot };
