const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!match || process.env[match[1]]) continue;
        process.env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
    }
}

const PORT = Number(process.env.PORT || 3010);
const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://212.22.78.42:3010').replace(/\/$/, '');
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const sessions = new Map();

function pruneSessions() {
    const now = Date.now();
    for (const [id, session] of sessions) {
        if (session.expiresAt <= now) sessions.delete(id);
    }
}

function safeReturnUrl(value) {
    if (typeof value !== 'string' || !value) return null;
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ ok: true, configured: Boolean(CLIENT_ID && CLIENT_SECRET) });
});

app.post('/session', (req, res) => {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(503).json({ error: 'Привязка GitHub ещё не настроена.' });
    }
    const returnUrl = safeReturnUrl(req.body?.returnUrl);
    if (!returnUrl) {
        return res.status(400).json({ error: 'Некуда вернуть после GitHub.' });
    }
    pruneSessions();
    const sessionId = crypto.randomBytes(24).toString('hex');
    sessions.set(sessionId, {
        returnUrl,
        token: null,
        expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id', CLIENT_ID);
    authorize.searchParams.set('redirect_uri', `${PUBLIC_URL}/callback`);
    authorize.searchParams.set('scope', 'public_repo');
    authorize.searchParams.set('state', sessionId);
    res.json({ sessionId, authorizeUrl: authorize.toString() });
});

app.get('/callback', async (req, res) => {
    const sessionId = typeof req.query.state === 'string' ? req.query.state : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const session = sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
        return res.status(400).type('html').send('<p>Время вышло. Вернитесь в панель и нажмите кнопку ещё раз.</p>');
    }
    if (!code) {
        return res.status(400).type('html').send('<p>GitHub не подтвердил доступ. Закройте страницу и нажмите кнопку в панели ещё раз.</p>');
    }
    try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
                redirect_uri: `${PUBLIC_URL}/callback`,
            }),
        });
        const payload = await tokenResponse.json();
        if (!payload.access_token) {
            return res.status(400).type('html').send(`<p>${payload.error_description || 'GitHub не пустил.'}</p>`);
        }
        session.token = payload.access_token;
        const back = new URL(session.returnUrl);
        back.searchParams.set('github_session', sessionId);
        res.redirect(back.toString());
    } catch (error) {
        res.status(502).type('html').send(`<p>${error.message || 'Не удалось закончить вход.'}</p>`);
    }
});

app.get('/session/:sessionId', (req, res) => {
    pruneSessions();
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ status: 'expired' });
    if (!session.token) return res.json({ status: 'pending' });
    if (!session.readAt) session.readAt = Date.now();
    if (Date.now() - session.readAt > 30000) sessions.delete(req.params.sessionId);
    res.json({ status: 'ready', token: session.token });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[github-link] ${PUBLIC_URL}`);
});
