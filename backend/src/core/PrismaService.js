const { PrismaClient } = require('@prisma/client');

/**
 * Singleton service для PrismaClient
 * Предотвращает утечки памяти используя одно соединение с БД
 * Благодаря кешированию require в Node.js это фактический singleton
 */
class PrismaService {
    constructor() {
        this.prisma = new PrismaClient({
            log: ['error', 'warn'],
        });
    }

    /**
     * Получить экземпляр Prisma client
     * @returns {PrismaClient}
     */
    getClient() {
        return this.prisma;
    }

    /**
     * Отключиться от БД (вызывать при выключении приложения)
     */
    async disconnect() {
        await this.prisma.$disconnect();
    }
}

const prismaService = new PrismaService();
module.exports = prismaService;
