const TelemetryService = require('../../core/services/TelemetryService');
const fs = require('fs');
const path = require('path');

// Mock fs
jest.mock('fs');

// Mock fetch
global.fetch = jest.fn();

describe('TelemetryService', () => {
    let telemetryService;
    let mockConfig;
    let mockProcessManager;
    let mockLogger;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConfig = {
            telemetry: {
                enabled: true
            }
        };

        mockProcessManager = {
            getAllProcesses: jest.fn(() => new Map())
        };

        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
        };

        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockReturnValue(undefined);
        fs.writeFileSync.mockReturnValue(undefined);
    });

    describe('loadInstanceId', () => {
        test('должен создать новый instance ID если файл не существует', () => {
            fs.existsSync.mockReturnValue(false);

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });

            const instanceId = telemetryService.getInstanceId();

            expect(instanceId).toBeDefined();
            expect(typeof instanceId).toBe('string');
            expect(instanceId.length).toBeGreaterThan(0);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        test('должен загрузить существующий instance ID', () => {
            const existingId = 'test-uuid-123';
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(existingId);

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });

            const instanceId = telemetryService.getInstanceId();

            expect(instanceId).toBe(existingId);
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });

        test('должен обработать ошибку при загрузке', () => {
            fs.existsSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });

            const instanceId = telemetryService.getInstanceId();

            expect(instanceId).toBeNull();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('startHeartbeat', () => {
        beforeEach(() => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('test-id');

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });
        });

        test('должен запустить heartbeat если телеметрия включена', () => {
            jest.useFakeTimers();

            telemetryService.startHeartbeat(1000);

            expect(telemetryService.heartbeatInterval).toBeDefined();

            jest.useRealTimers();
        });

        test('не должен запускать heartbeat если телеметрия выключена', () => {
            mockConfig.telemetry.enabled = false;

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });

            telemetryService.startHeartbeat();

            expect(telemetryService.heartbeatInterval).toBeNull();
        });
    });

    describe('stopHeartbeat', () => {
        beforeEach(() => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('test-id');

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });
        });

        test('должен остановить heartbeat', () => {
            jest.useFakeTimers();

            telemetryService.startHeartbeat(1000);
            telemetryService.stopHeartbeat();

            expect(telemetryService.heartbeatInterval).toBeNull();

            jest.useRealTimers();
        });
    });

    describe('triggerHeartbeat', () => {
        beforeEach(() => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('test-id');

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });
        });

        test('должен отложить heartbeat', () => {
            jest.useFakeTimers();

            telemetryService.triggerHeartbeat();

            expect(telemetryService.heartbeatDebounceTimer).toBeDefined();

            jest.useRealTimers();
        });

        test('не должен запускаться если телеметрия выключена', () => {
            mockConfig.telemetry.enabled = false;

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });

            telemetryService.triggerHeartbeat();

            expect(telemetryService.heartbeatDebounceTimer).toBeNull();
        });
    });

    describe('sendHeartbeat', () => {
        beforeEach(() => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('test-id');

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });
        });

        test('должен отправить heartbeat с запущенными ботами', async () => {
            const mockBotProcess = {
                botConfig: {
                    username: 'TestBot',
                    server: {
                        host: 'mc.example.com',
                        port: 25565
                    }
                }
            };

            mockProcessManager.getAllProcesses.mockReturnValue(new Map([[1, mockBotProcess]]));

            // Mock fetch responses
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        challenge: 'test-challenge',
                        difficulty: 1,
                        prefix: 'test'
                    })
                })
                .mockResolvedValueOnce({
                    ok: true
                });

            await telemetryService.sendHeartbeat();

            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        test('не должен отправлять если телеметрия выключена', async () => {
            mockConfig.telemetry.enabled = false;

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });

            await telemetryService.sendHeartbeat();

            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('не должен отправлять если нет запущенных ботов', async () => {
            mockProcessManager.getAllProcesses.mockReturnValue(new Map());

            await telemetryService.sendHeartbeat();

            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('должен обработать ошибку при отправке', async () => {
            const mockBotProcess = {
                botConfig: {
                    username: 'TestBot',
                    server: { host: 'mc.example.com', port: 25565 }
                }
            };

            mockProcessManager.getAllProcesses.mockReturnValue(new Map([[1, mockBotProcess]]));

            global.fetch.mockRejectedValue(new Error('Network error'));

            await telemetryService.sendHeartbeat();

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getInstanceId', () => {
        test('должен вернуть instance ID', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('test-uuid');

            telemetryService = new TelemetryService({
                config: mockConfig,
                botProcessManager: mockProcessManager,
                logger: mockLogger
            });

            expect(telemetryService.getInstanceId()).toBe('test-uuid');
        });
    });
});
