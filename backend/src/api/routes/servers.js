const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(authenticateUniversal);

router.get('/', authorize('server:list'), async (req, res) => {
    try {
        const servers = await prisma.server.findMany({ orderBy: { name: 'asc' } });
        res.json({
            items: servers,
            total: servers.length
        });
    } catch (error) {
        console.error("[API /api/servers] Ошибка получения списка серверов:", error);
        res.status(500).json({ error: 'Не удалось получить список серверов' });
    }
});

router.get('/:id', authorize('server:list'), async (req, res) => {
    try {
        const serverId = parseInt(req.params.id, 10);
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден' });
        }
        res.json(server);
    } catch (error) {
        console.error("[API /api/servers/:id] Ошибка получения сервера:", error);
        res.status(500).json({ error: 'Не удалось получить сервер' });
    }
});

router.post('/', authorize('server:create'), async (req, res) => {
    try {
        const { name, host, port, version } = req.body;
        if (!name || !host || !version) {
            return res.status(400).json({ error: 'Имя, хост и версия сервера обязательны' });
        }
        const newServer = await prisma.server.create({
            data: { name, host, port: port ? parseInt(port, 10) : 25565, version },
        });
        res.status(201).json(newServer);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Сервер с таким именем уже существует' });
        res.status(500).json({ error: 'Не удалось создать сервер' });
    }
});

router.put('/:id', authorize('server:create'), async (req, res) => {
    try {
        const serverId = parseInt(req.params.id, 10);
        if (isNaN(serverId)) return res.status(400).json({ error: 'Некорректный ID сервера' });

        const { name, host, port, version } = req.body;
        const dataToUpdate = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (host !== undefined) dataToUpdate.host = host;
        if (port !== undefined && port !== '') dataToUpdate.port = parseInt(port, 10);
        if (version !== undefined) dataToUpdate.version = version;

        Object.keys(dataToUpdate).forEach(k => { if (dataToUpdate[k] === undefined) delete dataToUpdate[k]; });

        if (dataToUpdate.name) {
            const existing = await prisma.server.findFirst({ where: { name: dataToUpdate.name, id: { not: serverId } } });
            if (existing) return res.status(409).json({ error: 'Сервер с таким именем уже существует' });
        }

        const updated = await prisma.server.update({ where: { id: serverId }, data: dataToUpdate });
        res.json(updated);
    } catch (error) {
        console.error('[API /api/servers] Ошибка обновления сервера:', error);
        res.status(500).json({ error: 'Не удалось обновить сервер' });
    }
});

router.delete('/:id', authorize('server:delete'), async (req, res) => {
    try {
        const serverId = parseInt(req.params.id, 10);
        
        const botsOnServer = await prisma.bot.count({ where: { serverId } });
        if (botsOnServer > 0) {
            return res.status(400).json({ error: `Нельзя удалить сервер, так как он используется ${botsOnServer} ботом(ами).` });
        }

        await prisma.server.delete({ where: { id: serverId } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Не удалось удалить сервер' });
    }
});

module.exports = router;