const express = require('express');
const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');
const { checkBotAccess } = require('../middleware/botAccess');

const router = express.Router({ mergeParams: true });

// Middleware для проверки доступа к боту
router.use(authenticate, checkBotAccess);

// GET /api/bots/:botId/api-keys/connected - Получить количество подключенных клиентов (ДОЛЖЕН БЫТЬ ПЕРЕД /:keyId)
router.get('/connected', authorize('bot:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);

        const { getIO } = require('../../real-time/socketHandler');
        const { getConnectedClientsCount } = require('../../real-time/botApi/utils');

        const io = getIO();
        const count = getConnectedClientsCount(io, botId);

        res.json({ success: true, count });
    } catch (error) {
        console.error('[API Keys] Ошибка получения количества клиентов:', error);
        res.status(500).json({ success: false, message: 'Ошибка при получении количества клиентов' });
    }
});

// GET /api/bots/:botId/api-keys/logs - Получить логи подключений (ДОЛЖЕН БЫТЬ ПЕРЕД /:keyId)
router.get('/logs', authorize('bot:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const limit = parseInt(req.query.limit, 10) || 50;

        const logs = await prisma.apiConnectionLog.findMany({
            where: { botId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 200),
        });

        res.json({ success: true, logs });
    } catch (error) {
        console.error('[API Keys] Ошибка получения логов:', error);
        res.status(500).json({ success: false, message: 'Ошибка при получении логов' });
    }
});

// GET /api/bots/:botId/api-keys - Получить список всех API ключей
router.get('/', authorize('bot:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);

        const keys = await prisma.botApiKey.findMany({
            where: { botId },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                permissions: true,
                createdAt: true,
                lastUsedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, keys });
    } catch (error) {
        console.error('[API Keys] Ошибка получения списка ключей:', error);
        res.status(500).json({ success: false, message: 'Ошибка при получении ключей' });
    }
});

// POST /api/bots/:botId/api-keys - Создать новый API ключ
router.post('/', authorize('bot:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const { name, permissions = 'ReadWrite' } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Название ключа обязательно' });
        }

        if (!['Read', 'Write', 'ReadWrite'].includes(permissions)) {
            return res.status(400).json({ success: false, message: 'Недопустимое значение permissions' });
        }

        // Генерируем уникальный ключ: bk_<32 байта hex>
        const rawKey = `bk_${crypto.randomBytes(32).toString('hex')}`;
        const keyPrefix = rawKey.substring(0, 11); // "bk_" + 8 символов
        const keyHash = await bcrypt.hash(rawKey, 10);

        const apiKey = await prisma.botApiKey.create({
            data: {
                botId,
                name: name.trim(),
                keyHash,
                keyPrefix,
                permissions,
            },
        });

        // Возвращаем полный ключ ТОЛЬКО ОДИН РАЗ
        res.json({
            success: true,
            key: rawKey, // Полный ключ
            apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                keyPrefix: apiKey.keyPrefix,
                permissions: apiKey.permissions,
                createdAt: apiKey.createdAt,
            },
        });
    } catch (error) {
        console.error('[API Keys] Ошибка создания ключа:', error);
        res.status(500).json({ success: false, message: 'Ошибка при создании ключа' });
    }
});

// PUT /api/bots/:botId/api-keys/:keyId - Обновить имя или права ключа
router.put('/:keyId', authorize('bot:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const keyId = parseInt(req.params.keyId, 10);
        const { name, permissions } = req.body;

        const updateData = {};
        if (name !== undefined && name.trim().length > 0) {
            updateData.name = name.trim();
        }
        if (permissions !== undefined) {
            if (!['Read', 'Write', 'ReadWrite'].includes(permissions)) {
                return res.status(400).json({ success: false, message: 'Недопустимое значение permissions' });
            }
            updateData.permissions = permissions;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'Нечего обновлять' });
        }

        const apiKey = await prisma.botApiKey.updateMany({
            where: { id: keyId, botId },
            data: updateData,
        });

        if (apiKey.count === 0) {
            return res.status(404).json({ success: false, message: 'Ключ не найден' });
        }

        res.json({ success: true, message: 'Ключ обновлен' });
    } catch (error) {
        console.error('[API Keys] Ошибка обновления ключа:', error);
        res.status(500).json({ success: false, message: 'Ошибка при обновлении ключа' });
    }
});

// DELETE /api/bots/:botId/api-keys/:keyId - Удалить (отозвать) API ключ
router.delete('/:keyId', authorize('bot:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const keyId = parseInt(req.params.keyId, 10);

        const { getIO } = require('../../real-time/socketHandler');

        const io = getIO();

        io.of("/bot-api")
            .in(`key_${keyId}`)
            .disconnectSockets(true)

        const result = await prisma.botApiKey.deleteMany({
            where: { id: keyId, botId },
        });

        if (result.count === 0) {
            return res.status(404).json({ success: false, message: 'Ключ не найден' });
        }

        res.json({ success: true, message: 'Ключ удален' });
    } catch (error) {
        console.error('[API Keys] Ошибка удаления ключа:', error);
        res.status(500).json({ success: false, message: 'Ошибка при удалении ключа' });
    }
});

module.exports = router;
