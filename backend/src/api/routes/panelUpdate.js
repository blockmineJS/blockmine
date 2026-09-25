const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const PanelUpdateService = require('../../core/services/PanelUpdateService');

const router = express.Router();

const checkLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many update checks. Try again later.' },
});

const applyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many update attempts. Try again later.' },
});

router.get('/check', authenticateUniversal, checkLimiter, async (req, res) => {
    try {
        const fresh = req.query.fresh === '1' || req.query.fresh === 'true';
        const result = await PanelUpdateService.checkForUpdate({ fresh });
        res.json(result);
    } catch (error) {
        console.error('[API /api/panel/update/check]', error);
        res.status(500).json({ error: 'Не удалось проверить обновления.' });
    }
});

router.get('/status', authenticateUniversal, (req, res) => {
    res.json(PanelUpdateService.getProgress());
});

router.post('/apply', authenticateUniversal, authorize('panel:settings:edit'), applyLimiter, async (req, res) => {
    try {
        const result = await PanelUpdateService.applyUpdate();
        res.json(result);
    } catch (error) {
        const code = error.code || '';
        if (code === 'update_in_progress') {
            return res.status(409).json({ error: 'Обновление уже выполняется.', code });
        }
        if (code === 'not_git' || code === 'no_git_binary' || code === 'dirty' || code === 'wrong_branch' || code === 'diverged' || code === 'cannot_update' || code === 'invalid_branch' || code === 'offline' || code === 'same' || code === 'ahead') {
            return res.status(400).json({ error: 'Сейчас нельзя обновить панель.', code });
        }
        console.error('[API /api/panel/update/apply]', error);
        res.status(500).json({
            error: 'Не удалось обновить панель.',
            code: code || 'update_failed',
            detail: error.detail || '',
        });
    }
});

module.exports = router;
