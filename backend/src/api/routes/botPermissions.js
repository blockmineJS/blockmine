const express = require('express');
const prisma = require('../../lib/prisma');
const { authenticateUniversal, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/:botId/permissions', authenticateUniversal, authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);

        const permissions = await prisma.permission.findMany({
            where: { botId },
            orderBy: { name: 'asc' }
        });

        res.json({
            items: permissions,
            total: permissions.length
        });
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/permissions:', error);
        res.status(500).json({ error: 'Не удалось получить список прав' });
    }
});

router.get('/:botId/permissions/:permissionId', authenticateUniversal, authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const permissionId = parseInt(req.params.permissionId, 10);

        const permission = await prisma.permission.findFirst({
            where: { id: permissionId, botId }
        });

        if (!permission) {
            return res.status(404).json({ error: 'Право не найдено' });
        }

        res.json(permission);
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/permissions/:permissionId:', error);
        res.status(500).json({ error: 'Не удалось получить право' });
    }
});

router.put('/:botId/permissions/:permissionId', authenticateUniversal, authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const permissionId = parseInt(req.params.permissionId, 10);
        const { name, description } = req.body;

        const permission = await prisma.permission.findFirst({
            where: { id: permissionId, botId }
        });

        if (!permission) {
            return res.status(404).json({ error: 'Право не найдено' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const updated = await prisma.permission.update({
            where: { id: permissionId },
            data: updateData
        });

        res.json(updated);
    } catch (error) {
        console.error('[API Error] PUT /bots/:botId/permissions/:permissionId:', error);
        res.status(500).json({ error: 'Не удалось обновить право' });
    }
});

router.delete('/:botId/permissions/:permissionId', authenticateUniversal, authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const permissionId = parseInt(req.params.permissionId, 10);

        const permission = await prisma.permission.findFirst({
            where: { id: permissionId, botId }
        });

        if (!permission) {
            return res.status(404).json({ error: 'Право не найдено' });
        }

        await prisma.groupPermission.deleteMany({ where: { permissionId } });
        await prisma.permission.delete({ where: { id: permissionId } });

        res.json({ success: true });
    } catch (error) {
        console.error('[API Error] DELETE /bots/:botId/permissions/:permissionId:', error);
        res.status(500).json({ error: 'Не удалось удалить право' });
    }
});

module.exports = router;
