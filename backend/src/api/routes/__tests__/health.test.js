const express = require('express');
const request = require('supertest');

jest.mock('../../../lib/prisma', () => ({
    $queryRaw: jest.fn(),
}));

const prisma = require('../../../lib/prisma');
const healthRouter = require('../health');

function buildApp() {
    const app = express();
    app.use('/api/health', healthRouter);
    return app;
}

describe('GET /api/health', () => {
    it('exposes only minimal health information without authentication', async () => {
        prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

        const response = await request(buildApp()).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
        expect(response.body).not.toHaveProperty('hostname');
        expect(response.body).not.toHaveProperty('cpu');
        expect(response.body).not.toHaveProperty('memory');
        expect(response.body).not.toHaveProperty('botCount');
        expect(response.body).not.toHaveProperty('checks');
        expect(response.body).not.toHaveProperty('timestamp');
    });

    it('does not require an Authorization header', async () => {
        prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

        const response = await request(buildApp()).get('/api/health');

        expect(response.status).not.toBe(401);
    });

    it('reports unhealthy without leaking error details when the database is unreachable', async () => {
        prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

        const response = await request(buildApp()).get('/api/health');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({ status: 'unhealthy' });
    });
});
