const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const setupValidation = [
    body('username').isString().isLength({ min: 3, max: 50 }),
    body('password').isString().isLength({ min: 8, max: 128 })
];

const loginValidation = [
    body('username').isString(),
    body('password').isString()
];

router.get('/needs-setup', async (req, res) => {
    try {
        const count = await prisma.panelUser.count();
        res.json({ setupNeeded: count === 0 });
    } catch (error) {
        if (error.code === 'P2021') {
            // PanelUser table does not exist yet (old installation)
            return res.json({ setupNeeded: true });
        }
        console.error('Failed to check setup state:', error);
        res.status(500).json({ error: 'Could not check setup state' });
    }
});

router.post('/setup', setupValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await prisma.$transaction(async (tx) => {
            const count = await tx.panelUser.count();
            if (count > 0) {
                throw new Error('Setup already completed');
            }
            const { username, password } = req.body;
            const passwordHash = await bcrypt.hash(password, 10);
            return tx.panelUser.create({ data: { username, passwordHash, permissions: JSON.stringify(['*']) } });
        });
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (error) {
        if (error.message === 'Setup already completed') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Setup failed:', error);
        return res.status(500).json({ error: 'Setup failed' });
    }
});

router.post('/login', loginValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { username, password } = req.body;
    const user = await prisma.panelUser.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

module.exports = router;
