const BotLifecycleService = require('../../core/services/BotLifecycleService');
const DependencyService = require('../../core/DependencyService');
const UserService = require('../../core/UserService');

// Mock dependencies
jest.mock('../../core/DependencyService');
jest.mock('../../core/UserService');
jest.mock('../../core/utils/crypto', () => ({
    decrypt: jest.fn((value) => `decrypted_${value}`)
}));

// Mock Socket.IO
jest.mock('../../real-time/socketHandler', () => ({
    getIO: jest.fn().mockReturnValue({
        emit: jest.fn(),
        to: jest.fn().mockReturnValue({ emit: jest.fn() })
    })
}));

jest.mock('../../real-time/botApi', () => ({
    broadcastBotStatus: jest.fn(),
    broadcastToApiClients: jest.fn()
}));

describe('BotLifecycleService', () => {
    let service;
    let mockBotRepository;
    let mockPluginRepository;
    let mockCommandRepository;
    let mockPermissionRepository;
    let mockProcessManager;
    let mockCacheManager;
    let mockResourceMonitor;
    let mockTelemetry;
    let mockEventGraphManager;
    let mockLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockBotRepository = {
            findById: jest.fn()
        };

        mockPluginRepository = {
            findEnabledByBotId: jest.fn(() => Promise.resolve([]))
        };

        mockCommandRepository = {
            findByBotId: jest.fn(() => Promise.resolve([]))
        };

        mockPermissionRepository = {
            findByBotId: jest.fn(() => Promise.resolve([]))
        };

        mockProcessManager = {
            isRunning: jest.fn(() => false),
            getProcess: jest.fn(),
            getAllProcesses: jest.fn(() => new Map()),
            spawn: jest.fn(),
            sendMessage: jest.fn(() => true),
            remove: jest.fn(),
            getPluginSubscribers: jest.fn(),
            resolvePlayerListRequest: jest.fn(),
            resolveCommandRequest: jest.fn(),
            addPlayerListRequest: jest.fn()
        };

        mockCacheManager = {
            setBotConfig: jest.fn(),
            getBotConfig: jest.fn(),
            deleteBotConfig: jest.fn(),
            clearBotCache: jest.fn(),
            getPlayerList: jest.fn(),
            setPlayerList: jest.fn()
        };

        mockResourceMonitor = {
            clearResourceUsage: jest.fn()
        };

        mockTelemetry = {
            triggerHeartbeat: jest.fn()
        };

        mockEventGraphManager = {
            loadGraphsForBot: jest.fn(() => Promise.resolve()),
            unloadGraphsForBot: jest.fn(),
            handleEvent: jest.fn()
        };

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        service = new BotLifecycleService({
            botRepository: mockBotRepository,
            pluginRepository: mockPluginRepository,
            commandRepository: mockCommandRepository,
            permissionRepository: mockPermissionRepository,
            botProcessManager: mockProcessManager,
            cacheManager: mockCacheManager,
            resourceMonitorService: mockResourceMonitor,
            telemetryService: mockTelemetry,
            eventGraphManager: mockEventGraphManager,
            logger: mockLogger
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('startBot', () => {
        test('должен вернуть ошибку если бот уже запущен', async () => {
            mockProcessManager.isRunning.mockReturnValue(true);

            const botConfig = { id: 1, username: 'TestBot' };
            const result = await service.startBot(botConfig);

            expect(result.success).toBe(false);
            expect(result.message).toContain('уже запущен');
            expect(mockProcessManager.spawn).not.toHaveBeenCalled();
        });

        // Примечание: тесты с startBot требуют сложных моков Socket.IO
        // Основная функциональность покрыта интеграционными тестами
    });

    describe('stopBot', () => {
        test('должен остановить запущенного бота', async () => {
            const mockChild = {
                send: jest.fn(),
                kill: jest.fn(),
                killed: false
            };
            mockProcessManager.getProcess.mockReturnValue(mockChild);

            const result = await service.stopBot(1);

            expect(mockEventGraphManager.unloadGraphsForBot).toHaveBeenCalledWith(1);
            expect(mockChild.send).toHaveBeenCalledWith({ type: 'stop' });
            expect(mockCacheManager.clearBotCache).toHaveBeenCalledWith(1);
            expect(result.success).toBe(true);
        });

        test('должен вернуть ошибку если бот не найден', async () => {
            mockProcessManager.getProcess.mockReturnValue(null);

            const result = await service.stopBot(1);

            expect(result.success).toBe(false);
            expect(result.message).toContain('не найден');
        });

        test('должен принудительно завершить процесс через 5 секунд', async () => {
            const mockChild = {
                send: jest.fn(),
                kill: jest.fn(),
                killed: false
            };
            mockProcessManager.getProcess.mockReturnValue(mockChild);

            await service.stopBot(1);

            jest.advanceTimersByTime(5000);

            expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
        });
    });

    describe('loadConfigForBot', () => {
        test('должен загрузить и закешировать конфигурацию', async () => {
            const commands = [
                { id: 1, name: 'test', aliases: '["t"]' },
                { id: 2, name: 'help', aliases: '[]' }
            ];
            const permissions = [
                { id: 1, name: 'admin.*' },
                { id: 2, name: 'user.*' }
            ];

            mockCommandRepository.findByBotId.mockResolvedValue(commands);
            mockPermissionRepository.findByBotId.mockResolvedValue(permissions);

            const result = await service.loadConfigForBot(1);

            expect(mockCacheManager.setBotConfig).toHaveBeenCalledWith(1, expect.objectContaining({
                commands: expect.any(Map),
                permissionsById: expect.any(Map),
                commandAliases: expect.any(Map)
            }));

            expect(result.commands.size).toBe(2);
            expect(result.permissionsById.size).toBe(2);
            expect(result.commandAliases.get('t')).toBe('test');
        });

        test('должен обработать ошибку загрузки', async () => {
            mockCommandRepository.findByBotId.mockRejectedValue(new Error('DB error'));

            await expect(service.loadConfigForBot(1)).rejects.toThrow('Failed to load/cache bot configuration');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('invalidateConfigCache', () => {
        test('должен инвалидировать кеш если он существует', () => {
            mockCacheManager.getBotConfig.mockReturnValue({ commands: new Map() });

            service.invalidateConfigCache(1);

            expect(mockCacheManager.deleteBotConfig).toHaveBeenCalledWith(1);
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        test('не должен вызывать delete если кеш пуст', () => {
            mockCacheManager.getBotConfig.mockReturnValue(null);

            service.invalidateConfigCache(1);

            expect(mockCacheManager.deleteBotConfig).not.toHaveBeenCalled();
        });
    });

    describe('getBotLogs', () => {
        test('должен вернуть пустой массив для несуществующего бота', () => {
            const logs = service.getBotLogs(999);
            expect(logs).toEqual([]);
        });
    });

    describe('isBotRunning', () => {
        test('должен вернуть true если бот запущен', () => {
            mockProcessManager.isRunning.mockReturnValue(true);

            expect(service.isBotRunning(1)).toBe(true);
        });

        test('должен вернуть false если бот остановлен', () => {
            mockProcessManager.isRunning.mockReturnValue(false);

            expect(service.isBotRunning(1)).toBe(false);
        });
    });

    describe('sendMessageToBot', () => {
        test('должен отправить сообщение боту', () => {
            const mockSendMessage = jest.fn();
            const mockChild = {
                api: {
                    sendMessage: mockSendMessage
                }
            };
            mockProcessManager.getProcess.mockReturnValue(mockChild);

            const result = service.sendMessageToBot(1, 'Hello', 'chat', 'Player1');

            expect(mockSendMessage).toHaveBeenCalledWith('chat', 'Hello', 'Player1');
            expect(result.success).toBe(true);
        });

        test('должен вернуть ошибку если бот не найден', () => {
            mockProcessManager.getProcess.mockReturnValue(null);

            const result = service.sendMessageToBot(1, 'Hello');

            expect(result.success).toBe(false);
            expect(result.message).toContain('не найден');
        });
    });

    describe('lookAt', () => {
        test('должен отправить команду lookAt', () => {
            const position = { x: 0, y: 64, z: 0 };
            const result = service.lookAt(1, position);

            expect(mockProcessManager.sendMessage).toHaveBeenCalledWith(
                1,
                { type: 'action', name: 'lookAt', payload: { position } }
            );
            expect(result.success).toBe(true);
        });

        test('должен вернуть ошибку если не удалось отправить', () => {
            mockProcessManager.sendMessage.mockReturnValue(false);

            const result = service.lookAt(1, { x: 0, y: 64, z: 0 });

            expect(result.success).toBe(false);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getPlayerList', () => {
        test('должен вернуть пустой массив если бот не запущен', async () => {
            mockProcessManager.isRunning.mockReturnValue(false);

            const result = await service.getPlayerList(1);

            expect(result).toEqual([]);
        });

        test('должен вернуть закешированный список игроков', async () => {
            const cachedPlayers = ['Player1', 'Player2'];
            mockProcessManager.isRunning.mockReturnValue(true);
            mockCacheManager.getPlayerList.mockReturnValue(cachedPlayers);

            const result = await service.getPlayerList(1);

            expect(result).toEqual(cachedPlayers);
            expect(mockProcessManager.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('invalidateUserCache', () => {
        test('должен очистить кеш пользователя', () => {
            UserService.clearCache = jest.fn();

            const result = service.invalidateUserCache(1, 'TestUser');

            expect(UserService.clearCache).toHaveBeenCalledWith('TestUser', 1);
            expect(mockProcessManager.sendMessage).toHaveBeenCalledWith(
                1,
                { type: 'invalidate_user_cache', username: 'TestUser' }
            );
            expect(result.success).toBe(true);
        });
    });

    describe('invalidateAllUserCache', () => {
        test('должен очистить весь кеш пользователей для бота', () => {
            UserService.cache = new Map([
                ['1:user1', {}],
                ['1:user2', {}],
                ['2:user3', {}]
            ]);

            service.invalidateAllUserCache(1);

            expect(UserService.cache.has('1:user1')).toBe(false);
            expect(UserService.cache.has('1:user2')).toBe(false);
            expect(UserService.cache.has('2:user3')).toBe(true);
            expect(mockProcessManager.sendMessage).toHaveBeenCalledWith(
                1,
                { type: 'invalidate_all_user_cache' }
            );
        });
    });

    describe('_syncSystemPermissions', () => {
        test('должен создать системные права', async () => {
            mockPermissionRepository.findByName = jest.fn(() => Promise.resolve(null));
            mockPermissionRepository.create = jest.fn();

            await service._syncSystemPermissions(1);

            expect(mockPermissionRepository.create).toHaveBeenCalledTimes(5);
            expect(mockPermissionRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    botId: 1,
                    name: 'admin.*',
                    owner: 'system'
                })
            );
        });

        test('должен обновить существующие права если описание изменилось', async () => {
            mockPermissionRepository.findByName = jest.fn(() =>
                Promise.resolve({ id: 1, description: 'Старое описание' })
            );
            mockPermissionRepository.update = jest.fn();
            mockPermissionRepository.create = jest.fn();

            await service._syncSystemPermissions(1);

            expect(mockPermissionRepository.update).toHaveBeenCalled();
            expect(mockPermissionRepository.create).not.toHaveBeenCalled();
        });

        test('не должен обновлять если описание не изменилось', async () => {
            mockPermissionRepository.findByName = jest.fn((botId, name) =>
                Promise.resolve({
                    id: 1,
                    description: name === 'admin.*' ? 'Все права администратора' : 'Test'
                })
            );
            mockPermissionRepository.update = jest.fn();

            await service._syncSystemPermissions(1);

            // Первое право не обновится, остальные 4 обновятся
            expect(mockPermissionRepository.update).toHaveBeenCalledTimes(4);
        });

        test('должен обработать ошибку синхронизации', async () => {
            mockPermissionRepository.findByName = jest.fn(() =>
                Promise.reject(new Error('DB error'))
            );

            await service._syncSystemPermissions(1);

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
