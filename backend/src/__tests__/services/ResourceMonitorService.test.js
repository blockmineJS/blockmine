const ResourceMonitorService = require('../../core/services/ResourceMonitorService');

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

    describe('updateFromIPC', () => {
        test('должен сохранить статистику для бота', () => {
            const usage = resourceMonitor.updateFromIPC(1, { cpu: 12.345, memory: 50.678 });

            expect(usage).toEqual({ botId: 1, cpu: 12.3, memory: 50.7 });
            expect(resourceMonitor.getResourceUsage(1)).toEqual({ botId: 1, cpu: 12.3, memory: 50.7 });
        });

        test('должен игнорировать вызов без botId', () => {
            resourceMonitor.updateFromIPC(null, { cpu: 1, memory: 2 });
            expect(resourceMonitor.getAllResourceUsage()).toEqual([]);
        });

        test('должен приводить нечисловые значения к 0', () => {
            const usage = resourceMonitor.updateFromIPC(2, { cpu: 'foo', memory: 'bar' });
            expect(usage.cpu).toBeNaN();
            expect(usage.memory).toBeNaN();
        });
    });

    describe('updateAllResourceUsage', () => {
        test('должен вернуть пустой массив если нет процессов и нет данных', async () => {
            mockProcessManager.getAllProcesses.mockReturnValue(new Map());

            const result = await resourceMonitor.updateAllResourceUsage();

            expect(result).toEqual([]);
        });

        test('должен вернуть актуальные сохранённые значения', async () => {
            const processes = new Map([
                [1, { pid: 1234 }],
                [2, { pid: 5678 }]
            ]);
            mockProcessManager.getAllProcesses.mockReturnValue(processes);

            resourceMonitor.updateFromIPC(1, { cpu: 15.5, memory: 50 });
            resourceMonitor.updateFromIPC(2, { cpu: 8.2, memory: 30 });

            const results = await resourceMonitor.updateAllResourceUsage();

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ botId: 1, cpu: 15.5, memory: 50 });
            expect(results).toContainEqual({ botId: 2, cpu: 8.2, memory: 30 });
        });

        test('должен очистить запись несуществующего бота', async () => {
            const processes = new Map([
                [1, { pid: 1234 }]
            ]);
            mockProcessManager.getAllProcesses.mockReturnValue(processes);

            resourceMonitor.updateFromIPC(1, { cpu: 10, memory: 50 });
            resourceMonitor.updateFromIPC(99, { cpu: 99, memory: 999 });

            const results = await resourceMonitor.updateAllResourceUsage();

            expect(results).toHaveLength(1);
            expect(results[0].botId).toBe(1);
            expect(resourceMonitor.getResourceUsage(99)).toBeUndefined();
        });

        test('должен очистить все записи если ни одного процесса не запущено', async () => {
            mockProcessManager.getAllProcesses.mockReturnValue(new Map());

            resourceMonitor.updateFromIPC(1, { cpu: 10, memory: 50 });

            const results = await resourceMonitor.updateAllResourceUsage();

            expect(results).toEqual([]);
            expect(resourceMonitor.getAllResourceUsage()).toEqual([]);
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
