const ResourceMonitorService = require('../../core/services/ResourceMonitorService');

// Mock pidusage
jest.mock('pidusage', () => jest.fn());
const pidusage = require('pidusage');

describe('ResourceMonitorService', () => {
    let resourceMonitor;
    let mockProcessManager;
    let mockLogger;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            error: jest.fn(),
            info: jest.fn(),
        };

        mockProcessManager = {
            getAllProcesses: jest.fn(() => new Map())
        };

        resourceMonitor = new ResourceMonitorService({
            botProcessManager: mockProcessManager,
            logger: mockLogger
        });
    });

    describe('startMonitoring', () => {
        test('должен запустить мониторинг', () => {
            jest.useFakeTimers();

            resourceMonitor.startMonitoring(1000);

            expect(resourceMonitor.updateInterval).toBeDefined();

            jest.advanceTimersByTime(1000);

            jest.useRealTimers();
        });

        test('должен очистить предыдущий интервал', () => {
            jest.useFakeTimers();

            resourceMonitor.startMonitoring(1000);
            const firstInterval = resourceMonitor.updateInterval;

            resourceMonitor.startMonitoring(2000);
            const secondInterval = resourceMonitor.updateInterval;

            expect(firstInterval).not.toBe(secondInterval);

            jest.useRealTimers();
        });
    });

    describe('stopMonitoring', () => {
        test('должен остановить мониторинг', () => {
            jest.useFakeTimers();

            resourceMonitor.startMonitoring(1000);
            resourceMonitor.stopMonitoring();

            expect(resourceMonitor.updateInterval).toBeNull();

            jest.useRealTimers();
        });
    });

    describe('updateAllResourceUsage', () => {
        test('должен вернуть пустой массив если нет процессов', async () => {
            mockProcessManager.getAllProcesses.mockReturnValue(new Map());

            const result = await resourceMonitor.updateAllResourceUsage();

            expect(result).toEqual([]);
            expect(pidusage).not.toHaveBeenCalled();
        });

        test('должен обновить статистику для запущенных процессов', async () => {
            const mockChild1 = { pid: 1234, botConfig: { id: 1 } };
            const mockChild2 = { pid: 5678, botConfig: { id: 2 } };

            const processes = new Map([
                [1, mockChild1],
                [2, mockChild2]
            ]);

            mockProcessManager.getAllProcesses.mockReturnValue(processes);

            // Mock pidusage response
            pidusage.mockResolvedValue({
                1234: { cpu: 15.5, memory: 52428800 }, // 50 MB
                5678: { cpu: 8.2, memory: 31457280 }   // 30 MB
            });

            const results = await resourceMonitor.updateAllResourceUsage();

            expect(pidusage).toHaveBeenCalledWith([1234, 5678]);
            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                botId: 1,
                cpu: 15.5,
                memory: 50
            });
            expect(results[1]).toEqual({
                botId: 2,
                cpu: 8.2,
                memory: 30
            });
        });

        test('должен обработать ошибку при получении статистики', async () => {
            const mockChild = { pid: 1234 };
            mockProcessManager.getAllProcesses.mockReturnValue(new Map([[1, mockChild]]));

            pidusage.mockRejectedValue(new Error('Process not found'));

            const results = await resourceMonitor.updateAllResourceUsage();

            expect(results).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        test('должен игнорировать процессы без PID', async () => {
            const mockChild = { pid: null };
            mockProcessManager.getAllProcesses.mockReturnValue(new Map([[1, mockChild]]));

            const results = await resourceMonitor.updateAllResourceUsage();

            expect(results).toEqual([]);
            expect(pidusage).not.toHaveBeenCalled();
        });
    });

    describe('getBotIdByPid', () => {
        test('должен найти botId по PID', () => {
            const mockChild1 = { pid: 1234 };
            const mockChild2 = { pid: 5678 };

            mockProcessManager.getAllProcesses.mockReturnValue(new Map([
                [1, mockChild1],
                [2, mockChild2]
            ]));

            const botId = resourceMonitor.getBotIdByPid(5678);

            expect(botId).toBe(2);
        });

        test('должен вернуть null если PID не найден', () => {
            mockProcessManager.getAllProcesses.mockReturnValue(new Map());

            const botId = resourceMonitor.getBotIdByPid(9999);

            expect(botId).toBeNull();
        });
    });

    describe('getResourceUsage', () => {
        test('должен вернуть статистику для бота', () => {
            resourceMonitor.resourceUsage.set(1, {
                botId: 1,
                cpu: 10.5,
                memory: 45
            });

            const usage = resourceMonitor.getResourceUsage(1);

            expect(usage).toEqual({
                botId: 1,
                cpu: 10.5,
                memory: 45
            });
        });

        test('должен вернуть undefined для несуществующего бота', () => {
            const usage = resourceMonitor.getResourceUsage(999);

            expect(usage).toBeUndefined();
        });
    });

    describe('getAllResourceUsage', () => {
        test('должен вернуть массив всей статистики', () => {
            resourceMonitor.resourceUsage.set(1, { botId: 1, cpu: 10, memory: 50 });
            resourceMonitor.resourceUsage.set(2, { botId: 2, cpu: 5, memory: 30 });

            const all = resourceMonitor.getAllResourceUsage();

            expect(all).toHaveLength(2);
            expect(all).toContainEqual({ botId: 1, cpu: 10, memory: 50 });
            expect(all).toContainEqual({ botId: 2, cpu: 5, memory: 30 });
        });
    });

    describe('clearResourceUsage', () => {
        test('должен очистить статистику для бота', () => {
            resourceMonitor.resourceUsage.set(1, { botId: 1, cpu: 10, memory: 50 });

            resourceMonitor.clearResourceUsage(1);

            expect(resourceMonitor.resourceUsage.has(1)).toBe(false);
        });
    });
});
