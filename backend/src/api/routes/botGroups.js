const express = require('express');
const prisma = require('../../lib/prisma');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const { botManager } = require('../../core/services');
const UserService = require('../../core/UserService');

const router = express.Router();

router.get('/:botId/groups', authenticateUniversal, authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);

        const groups = await prisma.group.findMany({
            where: { botId },
            include: { permissions: { include: { permission: true } } },
            orderBy: { name: 'asc' }
        });

        res.json({
            items: groups,
            total: groups.length
        });
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/groups:', error);
        res.status(500).json({ error: 'Не удалось получить список групп' });
    }
});

router.get('/:botId/groups/:groupId', authenticateUniversal, authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const groupId = parseInt(req.params.groupId, 10);

        const group = await prisma.group.findFirst({
            where: { id: groupId, botId },
            include: { permissions: { include: { permission: true } } }
        });

        if (!group) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }

        res.json(group);
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/groups/:groupId:', error);
        res.status(500).json({ error: 'Не удалось получить группу' });
    }
});

router.post('/:botId/groups/:groupId/permissions', authenticateUniversal, authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const groupId = parseInt(req.params.groupId, 10);
        const { permissionId } = req.body;

        const group = await prisma.group.findFirst({ where: { id: groupId, botId } });
        if (!group) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }

        const permission = await prisma.permission.findFirst({ where: { id: permissionId, botId } });
        if (!permission) {
            return res.status(404).json({ error: 'Право не найдено' });
        }

        await prisma.groupPermission.upsert({
            where: { groupId_permissionId: { groupId, permissionId } },
            create: { groupId, permissionId },
            update: {}
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[API Error] POST /bots/:botId/groups/:groupId/permissions:', error);
        res.status(500).json({ error: 'Не удалось добавить право в группу' });
    }
});

router.delete('/:botId/groups/:groupId/permissions/:permissionId', authenticateUniversal, authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const groupId = parseInt(req.params.groupId, 10);
        const permissionId = parseInt(req.params.permissionId, 10);

        const group = await prisma.group.findFirst({ where: { id: groupId, botId } });
        if (!group) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }

        await prisma.groupPermission.deleteMany({
            where: { groupId, permissionId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[API Error] DELETE /bots/:botId/groups/:groupId/permissions/:permissionId:', error);
        res.status(500).json({ error: 'Не удалось удалить право из группы' });
    }
});

router.post('/:botId/groups/:groupId/users', authenticateUniversal, authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const groupId = parseInt(req.params.groupId, 10);
        const { username } = req.body;

        const group = await prisma.group.findFirst({ where: { id: groupId, botId } });
        if (!group) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }

        let user = await prisma.user.findFirst({ where: { botId, username } });
        if (!user) {
            user = await prisma.user.create({
                data: { botId, username, isBlacklisted: false }
            });
        }

        await prisma.userGroup.upsert({
            where: { userId_groupId: { userId: user.id, groupId } },
            create: { userId: user.id, groupId },
            update: {}
        });

        botManager.invalidateUserCache(botId, username);
        UserService.clearCache(username, botId);

        res.json({ success: true });
    } catch (error) {
        console.error('[API Error] POST /bots/:botId/groups/:groupId/users:', error);
        res.status(500).json({ error: 'Не удалось добавить пользователя в группу' });
    }
});

router.delete('/:botId/groups/:groupId/users/:username', authenticateUniversal, authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const groupId = parseInt(req.params.groupId, 10);
        const { username } = req.params;

        const group = await prisma.group.findFirst({ where: { id: groupId, botId } });
        if (!group) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }

        const user = await prisma.user.findFirst({ where: { botId, username } });
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        await prisma.userGroup.deleteMany({
            where: { userId: user.id, groupId }
        });

        botManager.invalidateUserCache(botId, username);
        UserService.clearCache(username, botId);

        res.json({ success: true });
    } catch (error) {
        console.error('[API Error] DELETE /bots/:botId/groups/:groupId/users/:username:', error);
        res.status(500).json({ error: 'Не удалось удалить пользователя из группы' });
    }
});

module.exports = router;
