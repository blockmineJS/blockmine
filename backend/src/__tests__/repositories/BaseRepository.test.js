const BaseRepository = require('../../repositories/BaseRepository');

describe('BaseRepository', () => {
    let repository;
    let mockPrisma;

    beforeEach(() => {
        // Mock Prisma client
        mockPrisma = {
            testModel: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                count: jest.fn(),
            }
        };

        repository = new BaseRepository({ prisma: mockPrisma });
        repository.modelName = 'testModel';
    });

    describe('findById', () => {
        test('должен вызвать findUnique с правильным ID', async () => {
            const mockResult = { id: 1, name: 'Test' };
            mockPrisma.testModel.findUnique.mockResolvedValue(mockResult);

            const result = await repository.findById(1);

            expect(mockPrisma.testModel.findUnique).toHaveBeenCalledWith({
                where: { id: 1 }
            });
            expect(result).toEqual(mockResult);
        });
    });

    describe('findMany', () => {
        test('должен вызвать findMany без параметров', async () => {
            const mockResults = [{ id: 1 }, { id: 2 }];
            mockPrisma.testModel.findMany.mockResolvedValue(mockResults);

            const results = await repository.findMany();

            expect(mockPrisma.testModel.findMany).toHaveBeenCalledWith({
                where: {}
            });
            expect(results).toEqual(mockResults);
        });

        test('должен вызвать findMany с where условием', async () => {
            const mockResults = [{ id: 1, status: 'active' }];
            mockPrisma.testModel.findMany.mockResolvedValue(mockResults);

            const results = await repository.findMany({ status: 'active' });

            expect(mockPrisma.testModel.findMany).toHaveBeenCalledWith({
                where: { status: 'active' }
            });
            expect(results).toEqual(mockResults);
        });

        test('должен вызвать findMany с дополнительными опциями', async () => {
            const mockResults = [{ id: 1 }];
            mockPrisma.testModel.findMany.mockResolvedValue(mockResults);

            const results = await repository.findMany(
                { status: 'active' },
                { orderBy: { createdAt: 'desc' }, take: 10 }
            );

            expect(mockPrisma.testModel.findMany).toHaveBeenCalledWith({
                where: { status: 'active' },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            expect(results).toEqual(mockResults);
        });
    });

    describe('create', () => {
        test('должен создать новую запись', async () => {
            const newData = { name: 'New Item' };
            const mockResult = { id: 1, ...newData };
            mockPrisma.testModel.create.mockResolvedValue(mockResult);

            const result = await repository.create(newData);

            expect(mockPrisma.testModel.create).toHaveBeenCalledWith({
                data: newData
            });
            expect(result).toEqual(mockResult);
        });
    });

    describe('update', () => {
        test('должен обновить запись по ID', async () => {
            const updateData = { name: 'Updated' };
            const mockResult = { id: 1, ...updateData };
            mockPrisma.testModel.update.mockResolvedValue(mockResult);

            const result = await repository.update(1, updateData);

            expect(mockPrisma.testModel.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: updateData
            });
            expect(result).toEqual(mockResult);
        });
    });

    describe('delete', () => {
        test('должен удалить запись по ID', async () => {
            const mockResult = { id: 1 };
            mockPrisma.testModel.delete.mockResolvedValue(mockResult);

            const result = await repository.delete(1);

            expect(mockPrisma.testModel.delete).toHaveBeenCalledWith({
                where: { id: 1 }
            });
            expect(result).toEqual(mockResult);
        });
    });

    describe('count', () => {
        test('должен посчитать количество записей', async () => {
            mockPrisma.testModel.count.mockResolvedValue(42);

            const result = await repository.count({ status: 'active' });

            expect(mockPrisma.testModel.count).toHaveBeenCalledWith({
                where: { status: 'active' }
            });
            expect(result).toBe(42);
        });
    });

    describe('model getter', () => {
        test('должен вернуть правильную модель Prisma', () => {
            const model = repository.model;
            expect(model).toBe(mockPrisma.testModel);
        });
    });
});
