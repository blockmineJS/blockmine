const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
    try {
        const servers = await prisma.server.findMany({ orderBy: { name: 'asc' } });
        res.json(servers);
    } catch (error) {
        console.error("[API /api/servers] Ошибка получения списка серверов:", error);
        res.status(500).json({ error: 'Не удалось получить список серверов' });
    }
});

router.post('/', async (req, res) => {
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




router.delete('/:id', async (req, res) => {
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