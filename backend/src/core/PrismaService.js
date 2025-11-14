const { PrismaClient } = require('@prisma/client');

/**
 * Singleton service for PrismaClient
 * Prevents memory leaks by reusing a single database connection
 */
class PrismaService {
    constructor() {
        if (PrismaService.instance) {
            return PrismaService.instance;
        }

        this.prisma = new PrismaClient({
            log: ['error', 'warn'],
        });

        PrismaService.instance = this;
    }

    /**
     * Get the Prisma client instance
     * @returns {PrismaClient}
     */
    getClient() {
        return this.prisma;
    }

    /**
     * Disconnect from database (call on application shutdown)
     */
    async disconnect() {
        await this.prisma.$disconnect();
    }
}

const prismaService = new PrismaService();
module.exports = prismaService;
