const CommandExecutionService = require('../../core/services/CommandExecutionService');
const UserService = require('../../core/UserService');

jest.mock('../../core/UserService');

describe('CommandExecutionService', () => {
    let service;
    let mockProcessManager;
    let mockCacheManager;
    let mockEventGraphManager;
    let mockCommandRepository;
    let mockPermissionRepository;
    let mockGroupRepository;
    let mockLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockProcessManager = {
            getProcess: jest.fn(),
            addCommandRequest: jest.fn()
        };

        mockCacheManager = {
            getBotConfig: jest.fn(),
            deleteBotConfig: jest.fn()
        };

        mockEventGraphManager = {
            handleEvent: jest.fn()
        };

        mockCommandRepository = {
            findByName: jest.fn(),
            create: jest.fn(),
            update: jest.fn()
        };

        mockPermissionRepository = {
            findByName: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            prisma: {}
        };

        mockGroupRepository = {
            findByName: jest.fn(),
            upsertGroup: jest.fn(),
            addPermissionToGroup: jest.fn()
        };

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        service = new CommandExecutionService({
            botProcessManager: mockProcessManager,
            cacheManager: mockCacheManager,
            eventGraphManager: mockEventGraphManager,
            commandRepository: mockCommandRepository,
            permissionRepository: mockPermissionRepository,
            groupRepository: mockGroupRepository,
            logger: mockLogger
        });
    });

    afterEach(() => {
        jest.useRealTimers();
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

    describe('validateAndExecuteCommandForApi', () => {
        test('должен выбросить ошибку если бот не найден', async () => {
            mockProcessManager.getProcess.mockReturnValue(null);

            await expect(
                service.validateAndExecuteCommandForApi(1, 'Player1', 'test', {})
            ).rejects.toThrow('Bot configuration not found');
        });

        test('должен выбросить ошибку если кеш не загружен', async () => {
            mockProcessManager.getProcess.mockReturnValue({
                botConfig: { id: 1 }
            });
            mockCacheManager.getBotConfig.mockReturnValue(null);

            await expect(
                service.validateAndExecuteCommandForApi(1, 'Player1', 'test', {})
            ).rejects.toThrow('Bot configuration cache not loaded');
        });

        test('должен выбросить ошибку если пользователь в черном списке', async () => {
            const mockUser = {
                isBlacklisted: true,
                username: 'Player1'
            };

            mockProcessManager.getProcess.mockReturnValue({
                botConfig: { id: 1 }
            });
            mockCacheManager.getBotConfig.mockReturnValue({
                commands: new Map(),
                commandAliases: new Map()
            });
            UserService.getUser.mockResolvedValue(mockUser);

            await expect(
                service.validateAndExecuteCommandForApi(1, 'Player1', 'test', {})
            ).rejects.toThrow('is blacklisted');
        });

        test('должен выбросить ошибку если команда не найдена', async () => {
            const mockUser = {
                isBlacklisted: false,
                isOwner: false,
                username: 'Player1'
            };

            mockProcessManager.getProcess.mockReturnValue({
                botConfig: { id: 1 }
            });
            mockCacheManager.getBotConfig.mockReturnValue({
                commands: new Map(),
                commandAliases: new Map()
            });
            UserService.getUser.mockResolvedValue(mockUser);

            await expect(
                service.validateAndExecuteCommandForApi(1, 'Player1', 'nonexistent', {})
            ).rejects.toThrow('not found or is disabled');
        });

        test('должен выбросить ошибку если недостаточно прав', async () => {
            const mockUser = {
                isBlacklisted: false,
                isOwner: false,
                username: 'Player1',
                hasPermission: jest.fn(() => false)
            };

            const mockCommand = {
                name: 'test',
                isEnabled: true,
                permissionId: 1,
                cooldown: 0
            };

            mockProcessManager.getProcess.mockReturnValue({
                botConfig: { id: 1 }
            });
            mockCacheManager.getBotConfig.mockReturnValue({
                commands: new Map([['test', mockCommand]]),
                commandAliases: new Map(),
                permissionsById: new Map([[1, { id: 1, name: 'admin.test' }]])
            });
            UserService.getUser.mockResolvedValue(mockUser);

            await expect(
                service.validateAndExecuteCommandForApi(1, 'Player1', 'test', {})
            ).rejects.toThrow('insufficient permissions');
        });
    });

    describe('_executeCommandInProcess', () => {
        test('должен вернуть ошибку если бот не запущен', async () => {
            mockProcessManager.getProcess.mockReturnValue(null);

            const mockUser = { username: 'Player1', id: 1 };

            await expect(
                service._executeCommandInProcess(1, 'test', {}, mockUser, 'websocket')
            ).rejects.toThrow('Bot is not running');
        });

        test('должен вернуть ошибку если процесс убит', async () => {
            mockProcessManager.getProcess.mockReturnValue({ killed: true });

            const mockUser = { username: 'Player1', id: 1 };

            await expect(
                service._executeCommandInProcess(1, 'test', {}, mockUser, 'websocket')
            ).rejects.toThrow('Bot is not running');
        });

        test('должен выполнить команду успешно', async () => {
            const mockChild = {
                killed: false,
                send: jest.fn()
            };
            mockProcessManager.getProcess.mockReturnValue(mockChild);

            mockProcessManager.addCommandRequest.mockImplementation((requestId, handler) => {
                setTimeout(() => {
                    handler.resolve({ success: true });
                }, 100);
            });

            const mockUser = { username: 'Player1', id: 1 };
            const promise = service._executeCommandInProcess(1, 'test', {}, mockUser, 'websocket');

            jest.advanceTimersByTime(100);
            const result = await promise;

            expect(result.success).toBe(true);
            expect(mockChild.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'execute_command_request'
                })
            );
        });

        test('должен вернуть таймаут если команда не выполнилась', async () => {
            const mockChild = {
                killed: false,
                send: jest.fn()
            };
            mockProcessManager.getProcess.mockReturnValue(mockChild);

            mockProcessManager.addCommandRequest.mockImplementation(() => {
                // Не вызываем resolve/reject
            });

            const mockUser = { username: 'Player1', id: 1 };
            const promise = service._executeCommandInProcess(1, 'test', {}, mockUser, 'websocket');

            jest.advanceTimersByTime(10000);

            await expect(promise).rejects.toThrow('timed out');
        });
    });

    describe('handleCommandRegistration', () => {
        test('должен создать новую команду', async () => {
            mockCommandRepository.findByName.mockResolvedValue(null);
            mockPermissionRepository.findByName.mockResolvedValue(null);
            mockPermissionRepository.create.mockResolvedValue({ id: 1 });

            const commandConfig = {
                name: 'test',
                description: 'Test command',
                permissions: 'admin.test',
                owner: 'system',
                aliases: ['t'],
                allowedChatTypes: ['global', 'private'],
                cooldown: 5
            };

            await service.handleCommandRegistration(1, commandConfig);

            expect(mockPermissionRepository.create).toHaveBeenCalled();
            expect(mockCommandRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    botId: 1,
                    name: 'test',
                    permissionId: 1
                })
            );
            expect(mockCacheManager.deleteBotConfig).toHaveBeenCalledWith(1);
        });

        test('должен обновить существующую команду', async () => {
            mockCommandRepository.findByName.mockResolvedValue({ id: 10, name: 'test' });
            mockPermissionRepository.findByName.mockResolvedValue(null);
            mockPermissionRepository.create.mockResolvedValue({ id: 1 });

            const commandConfig = {
                name: 'test',
                description: 'Updated description',
                permissions: 'admin.test',
                owner: 'system'
            };

            await service.handleCommandRegistration(1, commandConfig);

            expect(mockCommandRepository.update).toHaveBeenCalledWith(
                10,
                expect.objectContaining({
                    description: 'Updated description'
                })
            );
            expect(mockCommandRepository.create).not.toHaveBeenCalled();
        });

        test('должен обработать ошибку регистрации', async () => {
            mockCommandRepository.findByName.mockRejectedValue(new Error('DB error'));

            const commandConfig = {
                name: 'test',
                description: 'Test'
            };

            await service.handleCommandRegistration(1, commandConfig);

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('handlePermissionsRegistration', () => {
        test('должен создать новые права', async () => {
            mockPermissionRepository.findByName.mockResolvedValue(null);
            mockPermissionRepository.create.mockResolvedValue({ id: 1 });

            const permissions = [
                { name: 'admin.*', description: 'Full admin', owner: 'system' },
                { name: 'user.*', description: 'User permissions', owner: 'system' }
            ];

            await service.handlePermissionsRegistration(1, permissions);

            expect(mockPermissionRepository.create).toHaveBeenCalledTimes(2);
            expect(mockCacheManager.deleteBotConfig).toHaveBeenCalledWith(1);
        });

        test('должен обновить существующие права', async () => {
            mockPermissionRepository.findByName.mockResolvedValue({ id: 1, name: 'admin.*' });
            mockPermissionRepository.update.mockResolvedValue({ id: 1 });

            const permissions = [
                { name: 'admin.*', description: 'Updated description', owner: 'system' }
            ];

            await service.handlePermissionsRegistration(1, permissions);

            expect(mockPermissionRepository.update).toHaveBeenCalledWith(
                1,
                { description: 'Updated description' }
            );
        });

        test('должен пропустить права без имени или владельца', async () => {
            mockPermissionRepository.findByName.mockResolvedValue(null);
            mockPermissionRepository.create.mockResolvedValue({ id: 1 });

            const permissions = [
                { description: 'No name' }, // Нет name
                { name: 'test' }, // Нет owner
                { name: 'valid', owner: 'system' }
            ];

            await service.handlePermissionsRegistration(1, permissions);

            expect(mockLogger.warn).toHaveBeenCalledTimes(2);
            expect(mockPermissionRepository.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('handleGroupRegistration', () => {
        test('должен создать/обновить группу', async () => {
            mockGroupRepository.upsertGroup.mockResolvedValue({ id: 1, name: 'Admin' });

            const groupConfig = {
                name: 'Admin',
                owner: 'system',
                description: 'Administrator group'
            };

            await service.handleGroupRegistration(1, groupConfig);

            expect(mockGroupRepository.upsertGroup).toHaveBeenCalledWith(
                1,
                'Admin',
                {
                    owner: 'system',
                    description: 'Administrator group'
                }
            );
            expect(mockCacheManager.deleteBotConfig).toHaveBeenCalledWith(1);
        });

        test('должен пропустить группу без имени или владельца', async () => {
            await service.handleGroupRegistration(1, { description: 'No name' });

            expect(mockLogger.warn).toHaveBeenCalled();
            expect(mockGroupRepository.upsertGroup).not.toHaveBeenCalled();
        });
    });

    describe('handleAddPermissionsToGroup', () => {
        test('должен добавить права в группу', async () => {
            mockGroupRepository.findByName.mockResolvedValue({ id: 1, name: 'Admin' });
            mockGroupRepository.addPermissionToGroup.mockResolvedValue(undefined);
            mockPermissionRepository.findByName.mockImplementation((botId, name) =>
                Promise.resolve({ id: 10 + name.length, name })
            );

            const message = {
                groupName: 'Admin',
                permissionNames: ['admin.*', 'user.*']
            };

            await service.handleAddPermissionsToGroup(1, message);

            expect(mockGroupRepository.findByName).toHaveBeenCalledWith(1, 'Admin');
            expect(mockGroupRepository.addPermissionToGroup).toHaveBeenCalledTimes(2);
            expect(mockCacheManager.deleteBotConfig).toHaveBeenCalledWith(1);
        });

        test('должен вернуться если группа не найдена', async () => {
            mockGroupRepository.findByName.mockResolvedValue(null);

            const message = {
                groupName: 'NonExistent',
                permissionNames: ['admin.*']
            };

            await service.handleAddPermissionsToGroup(1, message);

            expect(mockLogger.warn).toHaveBeenCalled();
            expect(mockGroupRepository.addPermissionToGroup).not.toHaveBeenCalled();
        });

        test('должен пропустить несуществующие права', async () => {
            mockGroupRepository.findByName.mockResolvedValue({ id: 1, name: 'Admin' });
            mockGroupRepository.addPermissionToGroup.mockResolvedValue(undefined);
            mockPermissionRepository.findByName.mockImplementation((botId, name) => {
                if (name === 'admin.*') return Promise.resolve({ id: 1, name });
                return Promise.resolve(null);
            });

            const message = {
                groupName: 'Admin',
                permissionNames: ['admin.*', 'nonexistent']
            };

            await service.handleAddPermissionsToGroup(1, message);

            expect(mockGroupRepository.addPermissionToGroup).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
});
