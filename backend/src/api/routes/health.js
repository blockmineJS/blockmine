const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');

// Публичный эндпоинт для внешних мониторов доступности (uptime monitors).
// Не должен возвращать ничего кроме минимального статуса живости —
// детальная информация о системе доступна через авторизованные /api/system/*.
router.get('/', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy' });
    }
});

module.exports = router;
