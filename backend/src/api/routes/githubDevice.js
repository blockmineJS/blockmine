const express = require('express');
const { Octokit } = require('@octokit/rest');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const LINK_URL = (process.env.GITHUB_LINK_URL || 'http://212.22.78.42:3010').replace(/\/$/, '');

router.post('/whoami', authenticate, async (req, res) => {
    const token = req.body?.token;
    if (!token) return res.status(400).json({ error: 'Сначала подключите GitHub.' });
    try {
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.users.getAuthenticated();
        res.json({ login: data.login });
    } catch {
        res.status(401).json({ error: 'GitHub не подтвердил этот вход.' });
    }
});

router.post('/connect/start', authenticate, async (req, res) => {
    try {
        const response = await fetch(`${LINK_URL}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ returnUrl: req.body?.returnUrl }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return res.status(502).json({ error: 'Не удалось открыть GitHub. Попробуйте ещё раз.' });
        }
        res.json({
            sessionId: payload.sessionId,
            authorizeUrl: payload.authorizeUrl,
            interval: payload.interval || 5,
        });
    } catch {
        res.status(502).json({ error: 'Не удалось открыть GitHub. Попробуйте ещё раз.' });
    }
});

router.get('/connect/:sessionId', authenticate, async (req, res) => {
    try {
        const response = await fetch(`${LINK_URL}/session/${encodeURIComponent(req.params.sessionId)}`);
        const payload = await response.json().catch(() => ({ status: 'expired' }));
        if (response.status === 404) return res.json({ status: 'expired' });
        if (!response.ok) return res.status(502).json({ error: 'Не удалось проверить GitHub. Попробуйте ещё раз.' });
        res.json(payload);
    } catch {
        res.status(502).json({ error: 'Не удалось проверить GitHub. Попробуйте ещё раз.' });
    }
});

module.exports = router;
