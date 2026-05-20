const express = require('express');
const { randomUUID } = require('crypto');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
const { authenticateUniversal } = require('../middleware/auth');
const { buildMcpServer } = require('./server');

const router = express.Router();

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_GC_INTERVAL_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 15 * 1000;

const sessions = new Map();
const DEBUG = process.env.DEBUG === 'true' || process.env.MCP_DEBUG === 'true';
const dlog = DEBUG ? (...args) => console.log('[MCP]', ...args) : () => {};

function touchSession(sid) {
    const entry = sessions.get(sid);
    if (entry) entry.lastActivity = Date.now();
}

setInterval(() => {
    const cutoff = Date.now() - SESSION_IDLE_TIMEOUT_MS;
    for (const [sid, entry] of sessions) {
        if (entry.lastActivity < cutoff) {
            sessions.delete(sid);
            entry.transport.close().catch(() => {});
            entry.server.close().catch(() => {});
            dlog('GC closed idle session', sid);
        }
    }
}, SESSION_GC_INTERVAL_MS).unref();

function getSessionId(req) {
    const raw = req.header('mcp-session-id');
    return raw ? String(raw) : undefined;
}

async function handleViaTransport(req, res, transport) {
    try {
        await transport.handleRequest(req, res, req.body);
    } catch (e) {
        console.error('[MCP] handler error', e);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal MCP error' },
                id: null,
            });
        }
    }
}

router.post('/', authenticateUniversal, async (req, res) => {
    const sessionId = getSessionId(req);

    if (sessionId && sessions.has(sessionId)) {
        touchSession(sessionId);
        return handleViaTransport(req, res, sessions.get(sessionId).transport);
    }

    if (sessionId && !sessions.has(sessionId)) {
        return res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Session not found. Re-initialize.' },
            id: null,
        });
    }

    if (!sessionId && isInitializeRequest(req.body)) {
        const server = buildMcpServer({ user: req.user });
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
                sessions.set(sid, { transport, server, user: req.user, lastActivity: Date.now() });
                dlog('session initialized', sid);
            },
            onsessionclosed: (sid) => {
                sessions.delete(sid);
                dlog('session closed', sid);
            },
        });

        transport.onclose = () => {
            if (transport.sessionId) sessions.delete(transport.sessionId);
            server.close().catch(() => {});
        };

        try {
            await server.connect(transport);
        } catch (e) {
            console.error('[MCP] connect error', e);
            return res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Failed to initialize MCP session' },
                id: null,
            });
        }

        return handleViaTransport(req, res, transport);
    }

    return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Missing or invalid mcp-session-id (initialize required first).' },
        id: null,
    });
});

// GET serves the long-lived SSE notification channel.
//
// We do NOT route GET through transport.handleRequest because the SDK does not
// emit any initial bytes on the stream when the negotiated protocol version is
// older than 2025-11-25, and several MCP clients (notably Claude Code 2.1.x)
// abort the stream if no data arrives within ~3s. We instead manage the stream
// here with explicit priming + heartbeat events.
//
// Limitation: server-initiated notifications dispatched via McpServer.notify()
// will not reach the client through this stream. None of the current tools
// emit notifications. If that changes, route this back through transport.handleRequest
// and find a different way to satisfy the priming requirement.
router.get('/', authenticateUniversal, async (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Missing mcp-session-id.' },
            id: null,
        });
    }
    if (!sessions.has(sessionId)) {
        return res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Session not found. Re-initialize.' },
            id: null,
        });
    }

    if (!req.header('accept')?.includes('text/event-stream')) {
        return res.status(406).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Client must accept text/event-stream' },
            id: null,
        });
    }

    touchSession(sessionId);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Mcp-Session-Id', sessionId);
    res.flushHeaders?.();

    let eventId = 0;
    res.write(`id: ${eventId++}\nretry: 15000\ndata: \n\n`);

    const heartbeat = setInterval(() => {
        touchSession(sessionId);
        try {
            res.write(`id: ${eventId++}\ndata: \n\n`);
        } catch {
            clearInterval(heartbeat);
        }
    }, HEARTBEAT_INTERVAL_MS);

    req.on('close', () => {
        clearInterval(heartbeat);
        dlog('GET stream closed', sessionId);
    });
});

router.delete('/', authenticateUniversal, async (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) {
        return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Missing mcp-session-id.' },
            id: null,
        });
    }
    if (!sessions.has(sessionId)) {
        return res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Session not found.' },
            id: null,
        });
    }
    const entry = sessions.get(sessionId);
    sessions.delete(sessionId);
    try { await entry.transport.close(); } catch {}
    try { await entry.server.close(); } catch {}
    res.status(200).end();
});

module.exports = router;
