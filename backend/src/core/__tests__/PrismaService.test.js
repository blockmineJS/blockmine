const prismaService = require('../PrismaService');

describe('PrismaService', () => {
    it('should return singleton instance', () => {
        const service1 = require('../PrismaService');
        const service2 = require('../PrismaService');

        expect(service1).toBe(service2);
    });

    it('should provide getClient method', () => {
        const client = prismaService.getClient();

        expect(client).toBeDefined();
        expect(typeof client.$connect).toBe('function');
    });

    it('should reuse same client instance', () => {
        const client1 = prismaService.getClient();
        const client2 = prismaService.getClient();

        expect(client1).toBe(client2);
    });
});
