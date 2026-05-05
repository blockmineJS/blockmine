const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    const startTime = Date.now();
    const checks = {};
    let overallHealthy = true;

    try {
        const prisma = require('../../lib/prisma');
        await prisma.$queryRaw`SELECT 1`;
        checks.database = { status: 'healthy' };
    } catch (err) {
        checks.database = { status: 'unhealthy', error: err.message };
        overallHealthy = false;
    }

    try {
        const botManager = req.app.get('botManager');
        checks.botManager = { status: botManager ? 'healthy' : 'unhealthy' };
        if (!botManager) overallHealthy = false;
    } catch (err) {
        checks.botManager = { status: 'unhealthy', error: err.message };
        overallHealthy = false;
    }

    const duration = Date.now() - startTime;
    const status = overallHealthy ? 200 : 503;

    res.status(status).json({
        status: overallHealthy ? 'healthy' : 'unhealthy',
        checks,
        duration,
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
