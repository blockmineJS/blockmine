const PermissionRepository = require('../../repositories/PermissionRepository');

describe('PermissionRepository', () => {
    let repository;
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            permission: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                upsert: jest.fn(),
            }
        };

        repository = new PermissionRepository({ prisma: mockPrisma });
    });

    test('должен установить modelName как "permission"', () => {
        expect(repository.modelName).toBe('permission');
    });

    describe('findByBotId', () => {
        test('должен найти все права бота', async () => {
            const mockPermissions = [
                { id: 1, botId: 1, name: 'admin.*' },
                { id: 2, botId: 1, name: 'user.say' }
            ];
            mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);

            const results = await repository.findByBotId(1);

            expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
                where: { botId: 1 },
                orderBy: { name: 'asc' }
            });
            expect(results).toEqual(mockPermissions);
        });
    });

    describe('findByName', () => {
        test('должен найти право по имени', async () => {
            const mockPermission = {
                id: 1,
                botId: 1,
                name: 'admin.ban'
            };
            mockPrisma.permission.findUnique.mockResolvedValue(mockPermission);

            const result = await repository.findByName(1, 'admin.ban');

            expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
                where: {
                    botId_name: { botId: 1, name: 'admin.ban' }
                }
            });
            expect(result).toEqual(mockPermission);
        });
    });

    describe('upsertPermission', () => {
        test('должен создать новое право', async () => {
            const newPermission = {
                id: 1,
                botId: 1,
                name: 'user.fly',
                description: 'Разрешение на полет'
            };
            mockPrisma.permission.upsert.mockResolvedValue(newPermission);

            const result = await repository.upsertPermission(1, 'user.fly', {
                description: 'Разрешение на полет',
                owner: 'plugin'
            });

            expect(mockPrisma.permission.upsert).toHaveBeenCalledWith({
                where: {
                    botId_name: { botId: 1, name: 'user.fly' }
                },
                update: {
                    description: 'Разрешение на полет',
                    owner: 'plugin'
                },
                create: {
                    botId: 1,
                    name: 'user.fly',
                    description: 'Разрешение на полет',
                    owner: 'plugin'
                }
            });
            expect(result).toEqual(newPermission);
        });

        test('должен обновить существующее право', async () => {
            const updatedPermission = {
                id: 1,
                botId: 1,
                name: 'admin.*',
                description: 'Обновленное описание'
            };
            mockPrisma.permission.upsert.mockResolvedValue(updatedPermission);

            const result = await repository.upsertPermission(1, 'admin.*', {
                description: 'Обновленное описание'
            });

            expect(result).toEqual(updatedPermission);
        });
    });

    describe('findSystemPermissions', () => {
        test('должен найти системные права', async () => {
            const mockPermissions = [
                { id: 1, botId: 1, name: 'admin.*', owner: 'system' },
                { id: 2, botId: 1, name: 'user.*', owner: 'system' }
            ];
            mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);

            const results = await repository.findSystemPermissions(1);

            expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
                where: {
                    botId: 1,
                    owner: 'system'
                }
            });
            expect(results).toEqual(mockPermissions);
        });
    });
});
