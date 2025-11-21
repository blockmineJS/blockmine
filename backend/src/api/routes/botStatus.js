const express = require('express');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const { botManager } = require('../../core/services');

const router = express.Router();

router.get('/:id/status', authenticateUniversal, authorize('bot:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);

        const botProcess = botManager.bots.get(botId);

        if (!botProcess) {
            return res.json({
                online: false,
                connected: false,
                status: 'offline'
            });
        }

        const status = botProcess.status || 'unknown';
        const isOnline = status === 'running' || status === 'online';
        const isConnected = botProcess.bot?.isConnected?.() || false;

        res.json({
            online: isOnline,
            connected: isConnected,
            status: status
        });
    } catch (error) {
        console.error('[API Error] GET /bots/:id/status:', error);
        res.status(500).json({ error: 'Не удалось получить статус бота' });
    }
});

module.exports = router;
