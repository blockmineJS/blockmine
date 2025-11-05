const GroupRepository = require('../../repositories/GroupRepository');

describe('GroupRepository', () => {
    let repository;
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            group: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                upsert: jest.fn(),
            },
            groupPermission: {
                upsert: jest.fn(),
                deleteMany: jest.fn(),
            }
        };

        repository = new GroupRepository({ prisma: mockPrisma });
    });

    test('должен установить modelName как "group"', () => {
        expect(repository.modelName).toBe('group');
    });

    describe('findByBotId', () => {
        test('должен найти все группы бота с правами', async () => {
            const mockGroups = [
                {
                    id: 1,
                    botId: 1,
                    name: 'Admin',
                    permissions: [
                        { permission: { id: 1, name: 'admin.*' } }
                    ]
                },
                {
                    id: 2,
                    botId: 1,
                    name: 'User',
                    permissions: []
                }
            ];
            mockPrisma.group.findMany.mockResolvedValue(mockGroups);

            const results = await repository.findByBotId(1);

            expect(mockPrisma.group.findMany).toHaveBeenCalledWith({
                where: { botId: 1 },
                include: {
                    permissions: {
                        include: {
                            permission: true
                        }
                    }
                },
                orderBy: { name: 'asc' }
            });
            expect(results).toEqual(mockGroups);
        });
    });

    describe('findByName', () => {
        test('должен найти группу по имени', async () => {
            const mockGroup = {
                id: 1,
                botId: 1,
                name: 'Moderator',
                permissions: []
            };
            mockPrisma.group.findUnique.mockResolvedValue(mockGroup);

            const result = await repository.findByName(1, 'Moderator');

            expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
                where: {
                    botId_name: { botId: 1, name: 'Moderator' }
                },
                include: {
                    permissions: {
                        include: {
                            permission: true
                        }
                    }
                }
            });
            expect(result).toEqual(mockGroup);
        });
    });

    describe('upsertGroup', () => {
        test('должен создать новую группу', async () => {
            const newGroup = {
                id: 1,
                botId: 1,
                name: 'VIP',
                owner: 'plugin'
            };
            mockPrisma.group.upsert.mockResolvedValue(newGroup);

            const result = await repository.upsertGroup(1, 'VIP', {
                owner: 'plugin'
            });

            expect(mockPrisma.group.upsert).toHaveBeenCalledWith({
                where: {
                    botId_name: { botId: 1, name: 'VIP' }
                },
                update: { owner: 'plugin' },
                create: {
                    botId: 1,
                    name: 'VIP',
                    owner: 'plugin'
                }
            });
            expect(result).toEqual(newGroup);
        });
    });

    describe('addPermissionToGroup', () => {
        test('должен добавить право в группу', async () => {
            const mockResult = {
                groupId: 1,
                permissionId: 5
            };
            mockPrisma.groupPermission.upsert.mockResolvedValue(mockResult);

            const result = await repository.addPermissionToGroup(1, 5, mockPrisma);

            expect(mockPrisma.groupPermission.upsert).toHaveBeenCalledWith({
                where: {
                    groupId_permissionId: { groupId: 1, permissionId: 5 }
                },
                update: {},
                create: { groupId: 1, permissionId: 5 }
            });
            expect(result).toEqual(mockResult);
        });
    });

    describe('removePermissionFromGroup', () => {
        test('должен удалить право из группы', async () => {
            const mockResult = { count: 1 };
            mockPrisma.groupPermission.deleteMany.mockResolvedValue(mockResult);

            const result = await repository.removePermissionFromGroup(1, 5, mockPrisma);

            expect(mockPrisma.groupPermission.deleteMany).toHaveBeenCalledWith({
                where: { groupId: 1, permissionId: 5 }
            });
            expect(result).toEqual(mockResult);
        });
    });
});
