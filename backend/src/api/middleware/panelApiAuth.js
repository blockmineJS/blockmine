const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');

const keyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Аутентификация запросов Panel API с использованием API ключей
 */
async function authenticatePanelApiKey(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ error: 'API ключ не предоставлен' });
    }

    const keyParts = authHeader.split(' ');
    if (keyParts.length !== 2 || keyParts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Неверный формат API ключа' });
    }

    const apiKey = keyParts[1];

    if (keyCache.has(apiKey)) {
        const cached = keyCache.get(apiKey);
        if (Date.now() < cached.expires) {
            req.user = cached.user;
            req.apiKey = cached.keyData;
            return next();
        } else {
            keyCache.delete(apiKey);
        }
    }

    try {
        const allKeys = await prisma.panelApiKey.findMany({
            where: {
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                user: {
                    include: {
                        role: true
                    }
                }
            }
        });

        let matchedKey = null;
        for (const keyRecord of allKeys) {
            if (await bcrypt.compare(apiKey, keyRecord.keyHash)) {
                matchedKey = keyRecord;
                break;
            }
        }

        if (!matchedKey) {
            return res.status(401).json({ error: 'Неверный API ключ' });
        }

        await prisma.panelApiKey.update({
            where: { id: matchedKey.id },
            data: { lastUsedAt: new Date() }
        });

        let permissions;
        try {
            if (matchedKey.customScopes) {
                permissions = JSON.parse(matchedKey.customScopes);
            } else {
                permissions = JSON.parse(matchedKey.user.role.permissions);
            }
        } catch (parseError) {
            console.error('Ошибка парсинга прав доступа:', parseError);
            return res.status(500).json({ error: 'Ошибка обработки прав доступа' });
        }

        console.log(`[Panel API Key] User: ${matchedKey.user.username}, Key: ${matchedKey.name}, Permissions:`, permissions);

        const user = {
            id: matchedKey.user.id,
            userId: matchedKey.user.id,  // для совместимости с JWT
            uuid: matchedKey.user.uuid,
            username: matchedKey.user.username,
            roleId: matchedKey.user.roleId,
            roleName: matchedKey.user.role.name,
            permissions,
            allBots: matchedKey.user.allBots
        };

        req.user = user;
        req.apiKey = {
            id: matchedKey.id,
            name: matchedKey.name,
            prefix: matchedKey.prefix
        };

        keyCache.set(apiKey, {
            user,
            keyData: req.apiKey,
            expires: Date.now() + CACHE_TTL
        });

        next();
    } catch (err) {
        console.error('Ошибка аутентификации Panel API ключа:', err);
        res.status(500).json({ error: 'Ошибка аутентификации' });
    }
}

/**
 * Авторизация запросов Panel API на основе прав доступа
 */
function authorizePanelApi(requiredPermission) {
    return (req, res, next) => {
        if (!req.user || !Array.isArray(req.user.permissions)) {
            return res.status(403).json({ error: 'Доступ запрещён: пользователь не аутентифицирован или неверный формат прав' });
        }

        const userPermissions = req.user.permissions;
        if (userPermissions.includes('*') || userPermissions.includes(requiredPermission)) {
            next();
        } else {
            res.status(403).json({ error: 'Доступ запрещён: недостаточно прав' });
        }
    };
}

module.exports = {
    authenticatePanelApiKey,
    authorizePanelApi
};
