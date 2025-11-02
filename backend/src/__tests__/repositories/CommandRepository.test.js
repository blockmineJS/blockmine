const CommandRepository = require('../../repositories/CommandRepository');

describe('CommandRepository', () => {
    let repository;
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            command: {
                findMany: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
            }
        };

        repository = new CommandRepository({ prisma: mockPrisma });
    });

    test('должен установить modelName как "command"', () => {
        expect(repository.modelName).toBe('command');
    });

    describe('findByBotId', () => {
        test('должен найти все команды бота', async () => {
            const mockCommands = [
                { id: 1, botId: 1, name: 'test' },
                { id: 2, botId: 1, name: 'help' }
            ];
            mockPrisma.command.findMany.mockResolvedValue(mockCommands);

            const results = await repository.findByBotId(1);

            expect(mockPrisma.command.findMany).toHaveBeenCalledWith({
                where: { botId: 1 },
                orderBy: { name: 'asc' }
            });
            expect(results).toEqual(mockCommands);
        });
    });

    describe('findEnabledByBotId', () => {
        test('должен найти только включенные команды', async () => {
            const mockCommands = [
                { id: 1, botId: 1, name: 'test', isEnabled: true }
            ];
            mockPrisma.command.findMany.mockResolvedValue(mockCommands);

            const results = await repository.findEnabledByBotId(1);

            expect(mockPrisma.command.findMany).toHaveBeenCalledWith({
                where: {
                    botId: 1,
                    isEnabled: true
                },
                orderBy: { name: 'asc' }
            });
            expect(results).toEqual(mockCommands);
        });
    });

    describe('findByName', () => {
        test('должен найти команду по имени', async () => {
            const mockCommand = { id: 1, botId: 1, name: 'test' };
            mockPrisma.command.findFirst.mockResolvedValue(mockCommand);

            const result = await repository.findByName(1, 'test');

            expect(mockPrisma.command.findFirst).toHaveBeenCalledWith({
                where: { botId: 1, name: 'test' }
            });
            expect(result).toEqual(mockCommand);
        });
    });

    describe('findByNameOrAlias', () => {
        test('должен найти команду по имени', async () => {
            const mockCommands = [
                { id: 1, name: 'test', aliases: '[]', isEnabled: true }
            ];
            mockPrisma.command.findMany.mockResolvedValue(mockCommands);

            const result = await repository.findByNameOrAlias(1, 'test');

            expect(result).toEqual(mockCommands[0]);
        });

        test('должен найти команду по алиасу', async () => {
            const mockCommands = [
                { id: 1, name: 'help', aliases: '["h", "?"]', isEnabled: true }
            ];
            mockPrisma.command.findMany.mockResolvedValue(mockCommands);

            const result = await repository.findByNameOrAlias(1, 'h');

            expect(result).toEqual(mockCommands[0]);
        });

        test('должен вернуть undefined если команда не найдена', async () => {
            mockPrisma.command.findMany.mockResolvedValue([]);

            const result = await repository.findByNameOrAlias(1, 'nonexistent');

            expect(result).toBeUndefined();
        });

        test('должен обработать невалидный JSON в aliases', async () => {
            const mockCommands = [
                { id: 1, name: 'test', aliases: 'invalid json', isEnabled: true }
            ];
            mockPrisma.command.findMany.mockResolvedValue(mockCommands);

            const result = await repository.findByNameOrAlias(1, 'alias');

            expect(result).toBeUndefined();
        });
    });

    describe('updateEnabled', () => {
        test('должен обновить статус isEnabled', async () => {
            const mockCommand = { id: 1, isEnabled: false };
            mockPrisma.command.update.mockResolvedValue(mockCommand);

            const result = await repository.updateEnabled(1, false);

            expect(mockPrisma.command.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isEnabled: false }
            });
            expect(result).toEqual(mockCommand);
        });
    });
});
