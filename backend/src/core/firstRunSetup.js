/**
 * Модуль для настройки первого запуска BlockMine
 * Создает стартового бота если в системе еще нет ботов
 */

const { generateUniqueBotName } = require('./utils/randomNameGenerator');
const prisma = require('../lib/prisma');

/**
 * Настраивает права и группы по умолчанию для бота
 * @param {number} botId - ID бота
 * @param {PrismaClient} prismaClient - Клиент Prisma
 */
async function setupDefaultPermissionsForBot(botId, prismaClient = prisma) {
    const initialData = {
        groups: ["User", "Admin"],
        permissions: [
            { name: "admin.*", description: "Все права администратора" },
            { name: "admin.cooldown.bypass", description: "Обход кулдауна для админ-команд" },
            { name: "user.*", description: "Все права обычного пользователя" },
            { name: "user.say", description: "Доступ к простым командам" },
            { name: "user.cooldown.bypass", description: "Обход кулдауна для юзер-команд" },
        ],
        groupPermissions: {
            "User": ["user.say"],
            "Admin": ["admin.*", "admin.cooldown.bypass", "user.cooldown.bypass", "user.*"]
        },
    };

    // Создаем права
    for (const perm of initialData.permissions) {
        await prismaClient.permission.upsert({
            where: { botId_name: { botId, name: perm.name } },
            update: { description: perm.description },
            create: { ...perm, botId, owner: 'system' }
        });
    }

    // Создаем группы
    for (const groupName of initialData.groups) {
        await prismaClient.group.upsert({
            where: { botId_name: { botId, name: groupName } },
            update: {},
            create: { name: groupName, botId, owner: 'system' }
        });
    }

    // Связываем группы с правами
    for (const [groupName, permNames] of Object.entries(initialData.groupPermissions)) {
        const group = await prismaClient.group.findUnique({
            where: { botId_name: { botId, name: groupName } }
        });

        if (group) {
            for (const permName of permNames) {
                const permission = await prismaClient.permission.findUnique({
                    where: { botId_name: { botId, name: permName } }
                });

                if (permission) {
                    await prismaClient.groupPermission.upsert({
                        where: {
                            groupId_permissionId: {
                                groupId: group.id,
                                permissionId: permission.id
                            }
                        },
                        update: {},
                        create: { groupId: group.id, permissionId: permission.id }
                    });
                }
            }
        }
    }

    console.log(`[FirstRun] Для бота ID ${botId} созданы группы и права по умолчанию.`);
}

/**
 * Проверяет наличие ботов и создает стартового бота если их нет
 */
async function ensureStarterBotExists() {
    try {
        // Проверяем количество ботов в системе
        const botCount = await prisma.bot.count();

        if (botCount > 0) {
            console.log(`[FirstRun] В системе уже есть ${botCount} бот(ов). Стартовый бот не требуется.`);
            return;
        }

        console.log('[FirstRun] Ботов не обнаружено. Создаем стартового бота...');

        // Получаем список существующих имен (на всякий случай)
        const existingBots = await prisma.bot.findMany({ select: { username: true } });
        const existingNames = existingBots.map(bot => bot.username);

        // Генерируем уникальное имя
        const botName = generateUniqueBotName(existingNames);

        // Ищем сервер MasedWorld
        let server = await prisma.server.findFirst({
            where: { name: 'MasedWorld' }
        });

        // Если сервера MasedWorld нет, используем первый доступный
        if (!server) {
            console.log('[FirstRun] Сервер MasedWorld не найден. Используем первый доступный сервер...');
            server = await prisma.server.findFirst();
        }

        // Если вообще нет серверов, создаем базовый
        if (!server) {
            console.log('[FirstRun] Серверов не найдено. Создаем сервер MasedWorld...');
            server = await prisma.server.create({
                data: {
                    name: 'MasedWorld',
                    host: 'mc.masedworld.net',
                    port: 25565,
                    version: '1.20.1'
                }
            });
        }

        // Вычисляем sortOrder
        const maxSortOrder = await prisma.bot.aggregate({
            _max: { sortOrder: true }
        });
        const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

        // Создаем стартового бота
        const newBot = await prisma.bot.create({
            data: {
                username: botName,
                prefix: '@',
                note: 'Стартовый бот, созданный автоматически при первом запуске',
                serverId: server.id,
                sortOrder: nextSortOrder
            },
            include: {
                server: true
            }
        });

        console.log(`[FirstRun] ✓ Создан стартовый бот: ${newBot.username} (ID: ${newBot.id}) на сервере ${server.name}`);

        // Настраиваем права по умолчанию для бота
        await setupDefaultPermissionsForBot(newBot.id, prisma);

        console.log(`[FirstRun] ✓ Стартовый бот успешно настроен и готов к использованию!`);

        return newBot;
    } catch (error) {
        console.error('[FirstRun] Ошибка при создании стартового бота:', error);
        throw error;
    }
}

module.exports = {
    ensureStarterBotExists
};
