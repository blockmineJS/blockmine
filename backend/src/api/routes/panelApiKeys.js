const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const { authenticate, authenticateUniversal } = require('../middleware/auth');

/**
 * Генерация случайного API ключа
 */
function generateApiKey() {
    return 'pk_' + crypto.randomBytes(32).toString('hex');
}

/**
 * GET /api/panel/api-keys
 * Получить список API ключей пользователя
 */
router.get('/', authenticateUniversal, async (req, res) => {
    try {
        const keys = await prisma.panelApiKey.findMany({
            where: {
                userId: req.user.userId
            },
            select: {
                id: true,
                name: true,
                prefix: true,
                customScopes: true,
                lastUsedAt: true,
                expiresAt: true,
                isActive: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            keys: keys.map(key => ({
                ...key,
                customScopes: key.customScopes ? JSON.parse(key.customScopes) : null
            }))
        });
    } catch (error) {
        console.error('Ошибка при получении списка API ключей:', error);
        res.status(500).json({ error: 'Не удалось получить список API ключей' });
    }
});

/**
 * POST /api/panel/api-keys
 * Создать новый API ключ
 */
router.post('/', authenticateUniversal, async (req, res) => {
    try {
        const { name, customScopes, expiresAt } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Имя ключа обязательно' });
        }

        const apiKey = generateApiKey();
        const keyHash = await bcrypt.hash(apiKey, 10);
        const prefix = apiKey.substring(0, 10);

        const newKey = await prisma.panelApiKey.create({
            data: {
                userId: req.user.userId,
                name: name.trim(),
                keyHash,
                prefix,
                customScopes: customScopes ? JSON.stringify(customScopes) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            }
        });

        res.json({
            success: true,
            message: 'API ключ успешно создан',
            key: {
                id: newKey.id,
                name: newKey.name,
                prefix: newKey.prefix,
                customScopes: newKey.customScopes ? JSON.parse(newKey.customScopes) : null,
                expiresAt: newKey.expiresAt,
                createdAt: newKey.createdAt,
                apiKey
            }
        });
    } catch (error) {
        console.error('Ошибка при создании API ключа:', error);
        res.status(500).json({ error: 'Не удалось создать API ключ' });
    }
});

/**
 * PATCH /api/panel/api-keys/:id
 * Обновить API ключ (название, статус, срок действия)
 */
router.patch('/:id', authenticateUniversal, async (req, res) => {
    try {
        const keyId = parseInt(req.params.id);
        const { name, isActive, expiresAt } = req.body;

        const existingKey = await prisma.panelApiKey.findFirst({
            where: {
                id: keyId,
                userId: req.user.userId
            }
        });

        if (!existingKey) {
            return res.status(404).json({ error: 'API ключ не найден' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

        const updatedKey = await prisma.panelApiKey.update({
            where: { id: keyId },
            data: updateData
        });

        res.json({
            success: true,
            message: 'API ключ успешно обновлён',
            key: {
                id: updatedKey.id,
                name: updatedKey.name,
                prefix: updatedKey.prefix,
                isActive: updatedKey.isActive,
                expiresAt: updatedKey.expiresAt
            }
        });
    } catch (error) {
        console.error('Ошибка при обновлении API ключа:', error);
        res.status(500).json({ error: 'Не удалось обновить API ключ' });
    }
});

/**
 * DELETE /api/panel/api-keys/:id
 * Удалить (отозвать) API ключ
 */
router.delete('/:id', authenticateUniversal, async (req, res) => {
    try {
        const keyId = parseInt(req.params.id);

        const existingKey = await prisma.panelApiKey.findFirst({
            where: {
                id: keyId,
                userId: req.user.userId
            }
        });

        if (!existingKey) {
            return res.status(404).json({ error: 'API ключ не найден' });
        }

        await prisma.panelApiKey.delete({
            where: { id: keyId }
        });

        res.json({
            success: true,
            message: 'API ключ успешно удалён'
        });
    } catch (error) {
        console.error('Ошибка при удалении API ключа:', error);
        res.status(500).json({ error: 'Не удалось удалить API ключ' });
    }
});

module.exports = router;
