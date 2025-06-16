const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'blockmine-secret';

router.post('/setup', async (req, res) => {
    const count = await prisma.panelUser.count();
    if (count > 0) return res.status(400).json({ error: 'Setup already completed' });
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.panelUser.create({ data: { username, passwordHash, permissions: JSON.stringify(['*']) } });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await prisma.panelUser.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token });
});

module.exports = router;
