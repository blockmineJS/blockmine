const jwt = require('jsonwebtoken');
const config = require('../config');

const JWT_SECRET = config.security.jwtSecret;

const presenceMap = new Map();

const HEARTBEAT_TTL_MS = 60 * 1000;

function verifyToken(token) {
	try {
		return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
	} catch (e) {
		return null;
	}
}

function broadcast(io) {
	const now = Date.now();
	for (const [userId, info] of presenceMap.entries()) {
		if (now - info.lastSeen > HEARTBEAT_TTL_MS) {
			presenceMap.delete(userId);
		}
	}
	const list = Array.from(presenceMap.entries()).map(([userId, info]) => ({
		userId: Number(userId),
		username: info.username,
		path: info.path || '/',
		lastSeen: info.lastSeen,
	}));
	io.emit('presence:list', list);
}

function handleConnection(io, socket) {
	const token = socket.handshake?.auth?.token;
	const decoded = verifyToken(token);
	if (!decoded) {
		return socket.disconnect(true);
	}
	const { userId, username } = decoded;
	presenceMap.set(userId, { username, socketId: socket.id, lastSeen: Date.now(), path: '/' });
	broadcast(io);

	socket.on('presence:heartbeat', () => {
		const info = presenceMap.get(userId);
		if (info) {
			info.lastSeen = Date.now();
			presenceMap.set(userId, info);
			broadcast(io);
		}
	});

	socket.on('presence:update', ({ path }) => {
		const info = presenceMap.get(userId) || { username, socketId: socket.id };
		info.lastSeen = Date.now();
		info.path = typeof path === 'string' ? path : '/';
		presenceMap.set(userId, info);
		broadcast(io);
	});

	socket.on('disconnect', () => {
		for (const [uid, info] of presenceMap.entries()) {
			if (info.socketId === socket.id) {
				presenceMap.delete(uid);
			}
		}
		broadcast(io);
	});
}

module.exports = {
	handleConnection,
	broadcast,
}; 