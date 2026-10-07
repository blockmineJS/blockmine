const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret';

jest.mock('../../../config', () => ({
    security: { jwtSecret: 'test-secret' },
}));

jest.mock('../../../lib/prisma', () => ({
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    bot: { count: jest.fn().mockResolvedValue(0) },
    server: { count: jest.fn().mockResolvedValue(0) },
    panelUser: { count: jest.fn().mockResolvedValue(0) },
}));

const systemRouter = require('../system');

function buildApp() {
    const app = express();
    app.use('/api/system', systemRouter);
    return app;
}

function tokenFor(permissions) {
    return jwt.sign({ id: 1, permissions }, JWT_SECRET, { algorithm: 'HS256' });
}

describe.each([
    ['/api/system/health'],
    ['/api/system/stats'],
])('GET %s', (path) => {
    it('rejects requests without an Authorization header', async () => {
        const response = await request(buildApp()).get(path);
        expect(response.status).toBe(401);
    });

    it('rejects an authenticated user who lacks panel:settings:view', async () => {
        const token = tokenFor(['bot:list']);

        const response = await request(buildApp())
            .get(path)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
    });

    it('allows an authenticated user with panel:settings:view', async () => {
        const token = tokenFor(['panel:settings:view']);

        const response = await request(buildApp())
            .get(path)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
    });

    it('allows an admin (wildcard permission) user', async () => {
        const token = tokenFor(['*']);

        const response = await request(buildApp())
            .get(path)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
    });
});
