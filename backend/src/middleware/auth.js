const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

async function authenticateUser(req, res, next) {
    if (req.path.startsWith('/api/auth')) {
        return next();
    }

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await prisma.panelUser.findUnique({ where: { id: payload.id } });
        if (!user) return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
        return next();
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

module.exports = authenticateUser;
