const express = require('express');
const prisma = require('../../lib/prisma');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const { botManager } = require('../../core/services');
const UserService = require('../../core/UserService');

const router = express.Router();

router.get('/:botId/users/:username', authenticateUniversal, authorize('management:view'), async (req, res) => {
    console.log('[botUsers] GET /:botId/users/:username called', req.params);
    try {
        const botId = parseInt(req.params.botId, 10);
        const { username } = req.params;

        const user = await prisma.user.findFirst({
            where: { botId, username },
            include: { groups: { include: { group: true } } }
        });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/users/:username:', error);
        res.status(500).json({ error: 'Не удалось получить пользователя' });
    }
});

router.get('/:botId/users', authenticateUniversal, authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const { page = 1, pageSize = 100, search } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(pageSize);
        const take = parseInt(pageSize);

        const where = { botId };
        if (search) {
            where.username = { contains: search };
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: { groups: { include: { group: true } } },
                orderBy: { username: 'asc' },
                skip,
                take
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            items: users,
            total,
            page: parseInt(page),
            pageSize: take
        });
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/users:', error);
        res.status(500).json({ error: 'Не удалось получить список пользователей' });
    }
});

router.put('/:botId/users/:username', authenticateUniversal, authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const { username } = req.params;
        const { isBlacklisted, groupIds } = req.body;

        let user = await prisma.user.findFirst({
            where: { botId, username }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    botId,
                    username,
                    isBlacklisted: isBlacklisted || false
                }
            });
        }

        const updateData = {};
        if (typeof isBlacklisted === 'boolean') {
            updateData.isBlacklisted = isBlacklisted;
        }

        // Используем транзакцию для атомарного обновления групп
        const updatedUser = await prisma.$transaction(async (tx) => {
            // Обновляем основные данные пользователя
            if (Object.keys(updateData).length > 0) {
                await tx.user.update({
                    where: { id: user.id },
                    data: updateData
                });
            }

            // Обновляем группы если переданы
            if (Array.isArray(groupIds)) {
                // Удаляем старые связи
                await tx.userGroup.deleteMany({ where: { userId: user.id } });

                // Создаём новые связи
                if (groupIds.length > 0) {
                    await tx.userGroup.createMany({
                        data: groupIds.map(groupId => ({
                            userId: user.id,
                            groupId
                        }))
                    });
                }
            }

            // Возвращаем обновлённого пользователя с группами
            return tx.user.findUnique({
                where: { id: user.id },
                include: { groups: { include: { group: true } } }
            });
        });

        botManager.invalidateUserCache(botId, username);
        UserService.clearCache(username, botId);

        res.json(updatedUser);
    } catch (error) {
        console.error('[API Error] PUT /bots/:botId/users/:username:', error);
        res.status(500).json({ error: 'Не удалось обновить пользователя' });
    }
});

router.delete('/:botId/users/:username', authenticateUniversal, authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const { username } = req.params;

        const user = await prisma.user.findFirst({
            where: { botId, username }
        });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        await prisma.userGroup.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });

        botManager.invalidateUserCache(botId, username);
        UserService.clearCache(username, botId);

        res.json({ success: true });
    } catch (error) {
        console.error('[API Error] DELETE /bots/:botId/users/:username:', error);
        res.status(500).json({ error: 'Не удалось удалить пользователя' });
    }
});

router.get('/:botId/users/:username/groups', authenticateUniversal, authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const { username } = req.params;

        const user = await prisma.user.findFirst({
            where: { botId, username },
            include: { groups: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ groupIds: user.groups.map(g => g.groupId) });
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/users/:username/groups:', error);
        res.status(500).json({ error: 'Не удалось получить группы пользователя' });
    }
});

module.exports = router;
