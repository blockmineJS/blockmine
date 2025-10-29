const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');

/**
 * Middleware для аутентификации API клиентов
 */
async function authenticateApiClient(socket, next) {
    try {
        const apiKey = socket.handshake.auth.token;
        const botId = parseInt(socket.handshake.query.botId, 10);

        if (!apiKey || !botId) {
            console.error('[Bot API] Отклонено: Нет токена или botId');
            return next(new Error('Authentication error: Missing token or botId'));
        }

        if (!apiKey.startsWith('bk_')) {
            console.error('[Bot API] Отклонено: Неверный формат токена');
            return next(new Error('Authentication error: Invalid token format'));
        }

        const keys = await prisma.botApiKey.findMany({
            where: { botId },
        });

        let matchedKey = null;
        for (const key of keys) {
            const isMatch = await bcrypt.compare(apiKey, key.keyHash);
            if (isMatch) {
                matchedKey = key;
                break;
            }
        }

        if (!matchedKey) {
            console.error('[Bot API] Отклонено: Неверный ключ для бота', botId);
            return next(new Error('Authentication failed: Invalid token'));
        }

        socket.botId = botId;
        socket.keyId = matchedKey.id;
        socket.keyPrefix = matchedKey.keyPrefix;
        socket.permissions = matchedKey.permissions;

        await prisma.botApiKey.update({
            where: { id: matchedKey.id },
            data: { lastUsedAt: new Date() },
        });

        return next();
    } catch (error) {
        console.error('[Bot API] Ошибка аутентификации:', error);
        return next(new Error('Authentication error'));
    }
}

/**
 * Логирует подключение/отключение клиента
 */
async function logConnection(socket, action) {
    try {
        await prisma.apiConnectionLog.create({
            data: {
                botId: socket.botId,
                keyPrefix: socket.keyPrefix,
                ipAddress: socket.handshake.address,
                userAgent: socket.handshake.headers['user-agent'] || null,
                action,
            },
        });
    } catch (error) {
        console.error(`[Bot API] Ошибка логирования ${action}:`, error);
    }
}

module.exports = {
    authenticateApiClient,
    logConnection,
};
