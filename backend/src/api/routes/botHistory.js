const express = require('express');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const botHistoryStore = require('../../core/BotHistoryStore');

const router = express.Router();

router.get('/:botId/chat', authenticateUniversal, authorize('bot:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const { type, username, search, from, to, limit, offset } = req.query;

        const result = botHistoryStore.getChatHistory(botId, {
            type,
            username,
            search,
            from,
            to,
            limit: limit || 100,
            offset: offset || 0
        });

        res.json({
            messages: result.messages,
            total: result.total,
            pagination: {
                total: result.total,
                limit: parseInt(limit) || 100,
                offset: parseInt(offset) || 0,
                hasMore: (parseInt(offset) || 0) + (parseInt(limit) || 100) < result.total
            }
        });
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/chat:', error);
        res.status(500).json({
            success: false,
            error: 'Не удалось получить историю чата.'
        });
    }
});

router.get('/:botId/commands', authenticateUniversal, authorize('bot:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const { username, command, success, from, to, limit, offset } = req.query;

        const result = botHistoryStore.getCommandLogs(botId, {
            username,
            command,
            success,
            from,
            to,
            limit: limit || 100,
            offset: offset || 0
        });

        res.json({
            logs: result.logs,
            total: result.total,
            pagination: {
                total: result.total,
                limit: parseInt(limit) || 100,
                offset: parseInt(offset) || 0,
                hasMore: (parseInt(offset) || 0) + (parseInt(limit) || 100) < result.total
            }
        });
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/commands:', error);
        res.status(500).json({
            success: false,
            error: 'Не удалось получить логи команд.'
        });
    }
});

router.get('/:botId/stats', authenticateUniversal, authorize('bot:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const stats = botHistoryStore.getStats(botId);

        res.json(stats);
    } catch (error) {
        console.error('[API Error] GET /bots/:botId/stats:', error);
        res.status(500).json({
            success: false,
            error: 'Не удалось получить статистику.'
        });
    }
});

router.delete('/:botId/clear', authenticateUniversal, authorize('bot:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        botHistoryStore.clearBot(botId);

        res.json({
            success: true,
            message: 'История бота очищена.'
        });
    } catch (error) {
        console.error('[API Error] DELETE /bots/:botId/clear:', error);
        res.status(500).json({
            success: false,
            error: 'Не удалось очистить историю.'
        });
    }
});

module.exports = router;
