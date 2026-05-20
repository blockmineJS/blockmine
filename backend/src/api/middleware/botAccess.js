const prisma = require('../../lib/prisma');

async function userCanAccessBot(userId, botId) {
    if (!userId || !Number.isInteger(botId)) return false;
    const user = await prisma.panelUser.findUnique({
        where: { id: userId },
        include: { botAccess: { select: { botId: true } } },
    });
    if (!user) return false;
    if (user.allBots !== false) return true;
    return user.botAccess.some((entry) => entry.botId === botId);
}

async function checkBotAccess(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Неавторизовано' });

        const botIdRaw = req.params.botId ?? req.params.id;
        const botId = parseInt(botIdRaw, 10);
        if (isNaN(botId)) return res.status(400).json({ error: 'Некорректный botId' });

        const allowed = await userCanAccessBot(userId, botId);
        if (!allowed) {
            return res.status(403).json({ error: 'Доступ к боту запрещен' });
        }
        return next();
    } catch (e) {
        console.error('[checkBotAccess] error', e);
        return res.status(500).json({ error: 'Ошибка проверки доступа' });
    }
}

function checkPluginBotAccess({ pluginIdParam = 'id' } = {}) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Неавторизовано' });

            const pluginId = parseInt(req.params[pluginIdParam], 10);
            if (isNaN(pluginId)) return res.status(400).json({ error: 'Некорректный pluginId' });

            const plugin = await prisma.installedPlugin.findUnique({
                where: { id: pluginId },
                select: { id: true, botId: true },
            });
            if (!plugin) return res.status(404).json({ error: 'Плагин не найден' });

            const allowed = await userCanAccessBot(userId, plugin.botId);
            if (!allowed) return res.status(403).json({ error: 'Доступ к плагину запрещен' });

            req.targetPlugin = plugin;
            return next();
        } catch (e) {
            console.error('[checkPluginBotAccess] error', e);
            return res.status(500).json({ error: 'Ошибка проверки доступа' });
        }
    };
}

module.exports = { checkBotAccess, checkPluginBotAccess, userCanAccessBot };
