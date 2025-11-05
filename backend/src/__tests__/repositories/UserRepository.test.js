const UserRepository = require('../../repositories/UserRepository');

describe('UserRepository', () => {
    let repository;
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            user: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                upsert: jest.fn(),
                update: jest.fn(),
            }
        };

        repository = new UserRepository({ prisma: mockPrisma });
    });

    test('должен установить modelName как "user"', () => {
        expect(repository.modelName).toBe('user');
    });

    describe('findByUsername', () => {
        test('должен найти пользователя по botId и username', async () => {
            const mockUser = {
                id: 1,
                botId: 1,
                username: 'TestUser'
            };
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await repository.findByUsername(1, 'TestUser');

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: {
                    botId_username: { botId: 1, username: 'TestUser' }
                }
            });
            expect(result).toEqual(mockUser);
        });
    });

    describe('findByBotId', () => {
        test('должен найти всех пользователей бота', async () => {
            const mockUsers = [
                { id: 1, botId: 1, username: 'User1' },
                { id: 2, botId: 1, username: 'User2' }
            ];
            mockPrisma.user.findMany.mockResolvedValue(mockUsers);

            const results = await repository.findByBotId(1);

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                where: { botId: 1 },
                orderBy: { username: 'asc' }
            });
            expect(results).toEqual(mockUsers);
        });
    });

    describe('upsertUser', () => {
        test('должен создать нового пользователя', async () => {
            const newUser = {
                id: 1,
                botId: 1,
                username: 'NewUser',
                isBlacklisted: false
            };
            mockPrisma.user.upsert.mockResolvedValue(newUser);

            const result = await repository.upsertUser(1, 'NewUser', {
                isBlacklisted: false
            });

            expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
                where: {
                    botId_username: { botId: 1, username: 'NewUser' }
                },
                update: { isBlacklisted: false },
                create: {
                    botId: 1,
                    username: 'NewUser',
                    isBlacklisted: false
                }
            });
            expect(result).toEqual(newUser);
        });

        test('должен обновить существующего пользователя', async () => {
            const updatedUser = {
                id: 1,
                botId: 1,
                username: 'ExistingUser',
                isBlacklisted: true
            };
            mockPrisma.user.upsert.mockResolvedValue(updatedUser);

            const result = await repository.upsertUser(1, 'ExistingUser', {
                isBlacklisted: true
            });

            expect(result).toEqual(updatedUser);
        });
    });

    describe('updateBlacklist', () => {
        test('должен обновить статус черного списка', async () => {
            const updatedUser = {
                id: 1,
                botId: 1,
                username: 'User',
                isBlacklisted: true
            };
            mockPrisma.user.update.mockResolvedValue(updatedUser);

            const result = await repository.updateBlacklist(1, 'User', true);

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: {
                    botId_username: { botId: 1, username: 'User' }
                },
                data: { isBlacklisted: true }
            });
            expect(result).toEqual(updatedUser);
        });
    });
});
