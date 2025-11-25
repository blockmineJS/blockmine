const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(authenticateUniversal);

router.get('/', authorize('proxy:list'), async (req, res) => {
    try {
        const proxies = await prisma.proxy.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { bots: true }
                }
            }
        });
        res.json({
            items: proxies,
            total: proxies.length
        });
    } catch (error) {
        console.error("[API /api/proxies] Ошибка получения списка прокси:", error);
        res.status(500).json({ error: 'Не удалось получить список прокси' });
    }
});

router.get('/:id', authorize('proxy:list'), async (req, res) => {
    try {
        const proxyId = parseInt(req.params.id, 10);
        const proxy = await prisma.proxy.findUnique({
            where: { id: proxyId },
            include: {
                _count: {
                    select: { bots: true }
                }
            }
        });
        if (!proxy) {
            return res.status(404).json({ error: 'Прокси не найден' });
        }
        res.json(proxy);
    } catch (error) {
        console.error("[API /api/proxies/:id] Ошибка получения прокси:", error);
        res.status(500).json({ error: 'Не удалось получить прокси' });
    }
});

router.post('/', authorize('proxy:create'), async (req, res) => {
    try {
        const { name, type, host, port, username, password, note } = req.body;
        if (!name || !host || !port) {
            return res.status(400).json({ error: 'Имя, хост и порт прокси обязательны' });
        }
        if (type && !['socks5', 'http'].includes(type)) {
            return res.status(400).json({ error: 'Тип прокси должен быть socks5 или http' });
        }
        const newProxy = await prisma.proxy.create({
            data: {
                name,
                type: type || 'socks5',
                host,
                port: parseInt(port, 10),
                username: username || null,
                password: password || null,
                note: note || null
            },
        });
        res.status(201).json(newProxy);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Прокси с таким именем уже существует' });
        console.error("[API /api/proxies] Ошибка создания прокси:", error);
        res.status(500).json({ error: 'Не удалось создать прокси' });
    }
});

router.put('/:id', authorize('proxy:create'), async (req, res) => {
    try {
        const proxyId = parseInt(req.params.id, 10);
        if (isNaN(proxyId)) return res.status(400).json({ error: 'Некорректный ID прокси' });

        const { name, type, host, port, username, password, note } = req.body;

        if (type && !['socks5', 'http'].includes(type)) {
            return res.status(400).json({ error: 'Тип прокси должен быть socks5 или http' });
        }

        const dataToUpdate = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (type !== undefined) dataToUpdate.type = type;
        if (host !== undefined) dataToUpdate.host = host;
        if (port !== undefined && port !== '') dataToUpdate.port = parseInt(port, 10);
        if (username !== undefined) dataToUpdate.username = username || null;
        if (password !== undefined) dataToUpdate.password = password || null;
        if (note !== undefined) dataToUpdate.note = note || null;

        Object.keys(dataToUpdate).forEach(k => { if (dataToUpdate[k] === undefined) delete dataToUpdate[k]; });

        if (dataToUpdate.name) {
            const existing = await prisma.proxy.findFirst({ where: { name: dataToUpdate.name, id: { not: proxyId } } });
            if (existing) return res.status(409).json({ error: 'Прокси с таким именем уже существует' });
        }

        const updated = await prisma.proxy.update({ where: { id: proxyId }, data: dataToUpdate });
        res.json(updated);
    } catch (error) {
        console.error('[API /api/proxies] Ошибка обновления прокси:', error);
        res.status(500).json({ error: 'Не удалось обновить прокси' });
    }
});

router.delete('/:id', authorize('proxy:delete'), async (req, res) => {
    try {
        const proxyId = parseInt(req.params.id, 10);

        const botsUsingProxy = await prisma.bot.count({ where: { proxyId } });
        if (botsUsingProxy > 0) {
            return res.status(400).json({ error: `Нельзя удалить прокси, так как он используется ${botsUsingProxy} ботом(ами).` });
        }

        await prisma.proxy.delete({ where: { id: proxyId } });
        res.status(204).send();
    } catch (error) {
        console.error('[API /api/proxies] Ошибка удаления прокси:', error);
        res.status(500).json({ error: 'Не удалось удалить прокси' });
    }
});

module.exports = router;
