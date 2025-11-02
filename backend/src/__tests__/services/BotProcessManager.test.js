const BotProcessManager = require('../../core/services/BotProcessManager');

describe('BotProcessManager', () => {
    let processManager;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };

        processManager = new BotProcessManager({ logger: mockLogger });
    });

    describe('isRunning', () => {
        test('должен вернуть false если процесс не существует', () => {
            expect(processManager.isRunning(1)).toBe(false);
        });

        test('должен вернуть false если процесс убит', () => {
            const mockChild = { killed: true };
            processManager.processes.set(1, mockChild);

            expect(processManager.isRunning(1)).toBe(false);
        });

        test('должен вернуть true если процесс запущен', () => {
            const mockChild = { killed: false };
            processManager.processes.set(1, mockChild);

            expect(processManager.isRunning(1)).toBe(true);
        });
    });

    describe('getProcess', () => {
        test('должен вернуть процесс по ID', () => {
            const mockChild = { pid: 123 };
            processManager.processes.set(1, mockChild);

            const result = processManager.getProcess(1);

            expect(result).toBe(mockChild);
        });

        test('должен вернуть undefined для несуществующего процесса', () => {
            const result = processManager.getProcess(999);

            expect(result).toBeUndefined();
        });
    });

    describe('getAllProcesses', () => {
        test('должен вернуть Map всех процессов', () => {
            const mockChild1 = { pid: 123 };
            const mockChild2 = { pid: 456 };

            processManager.processes.set(1, mockChild1);
            processManager.processes.set(2, mockChild2);

            const result = processManager.getAllProcesses();

            expect(result).toBeInstanceOf(Map);
            expect(result.size).toBe(2);
            expect(result.get(1)).toBe(mockChild1);
            expect(result.get(2)).toBe(mockChild2);
        });
    });

    describe('sendMessage', () => {
        test('должен отправить сообщение процессу', () => {
            const mockChild = {
                killed: false,
                send: jest.fn()
            };
            processManager.processes.set(1, mockChild);

            const message = { type: 'test', data: 'hello' };
            const result = processManager.sendMessage(1, message);

            expect(mockChild.send).toHaveBeenCalledWith(message);
            expect(result).toBe(true);
        });

        test('должен вернуть false если процесс не существует', () => {
            const result = processManager.sendMessage(999, { type: 'test' });

            expect(result).toBe(false);
        });

        test('должен вернуть false если процесс убит', () => {
            const mockChild = {
                killed: true,
                send: jest.fn()
            };
            processManager.processes.set(1, mockChild);

            const result = processManager.sendMessage(1, { type: 'test' });

            expect(mockChild.send).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('kill', () => {
        test('должен убить процесс', () => {
            const mockChild = {
                killed: false,
                kill: jest.fn()
            };
            processManager.processes.set(1, mockChild);

            const result = processManager.kill(1);

            expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
            expect(result).toBe(true);
        });

        test('должен убить процесс с указанным сигналом', () => {
            const mockChild = {
                killed: false,
                kill: jest.fn()
            };
            processManager.processes.set(1, mockChild);

            processManager.kill(1, 'SIGKILL');

            expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
        });

        test('должен вернуть false если процесс не существует', () => {
            const result = processManager.kill(999);

            expect(result).toBe(false);
        });
    });

    describe('remove', () => {
        test('должен удалить процесс из Map', () => {
            const mockChild = { pid: 123 };
            processManager.processes.set(1, mockChild);

            processManager.remove(1);

            expect(processManager.processes.has(1)).toBe(false);
        });
    });

    describe('Plugin UI subscriptions', () => {
        let mockSocket;

        beforeEach(() => {
            mockSocket = {
                id: 'socket-123',
                emit: jest.fn()
            };
        });

        describe('subscribeToPluginUi', () => {
            test('должен подписать сокет на плагин', () => {
                const mockChild = {
                    killed: false,
                    send: jest.fn()
                };
                processManager.processes.set(1, mockChild);

                processManager.subscribeToPluginUi(1, 'test-plugin', mockSocket);

                const subscribers = processManager.getPluginSubscribers(1, 'test-plugin');
                expect(subscribers).toBeInstanceOf(Set);
                expect(subscribers.has(mockSocket)).toBe(true);
                expect(mockChild.send).toHaveBeenCalledWith({
                    type: 'plugin:ui:start-updates',
                    pluginName: 'test-plugin'
                });
            });

            test('должен работать даже если процесс не запущен', () => {
                processManager.subscribeToPluginUi(1, 'test-plugin', mockSocket);

                const subscribers = processManager.getPluginSubscribers(1, 'test-plugin');
                expect(subscribers.has(mockSocket)).toBe(true);
            });
        });

        describe('unsubscribeFromPluginUi', () => {
            test('должен отписать сокет от плагина', () => {
                const mockChild = {
                    killed: false,
                    send: jest.fn()
                };
                processManager.processes.set(1, mockChild);

                processManager.subscribeToPluginUi(1, 'test-plugin', mockSocket);
                processManager.unsubscribeFromPluginUi(1, 'test-plugin', mockSocket);

                expect(mockChild.send).toHaveBeenCalledWith({
                    type: 'plugin:ui:stop-updates',
                    pluginName: 'test-plugin'
                });
            });

            test('должен удалить плагин если нет подписчиков', () => {
                processManager.subscribeToPluginUi(1, 'test-plugin', mockSocket);
                processManager.unsubscribeFromPluginUi(1, 'test-plugin', mockSocket);

                const botSubscriptions = processManager.uiSubscriptions.get(1);
                expect(botSubscriptions.has('test-plugin')).toBe(false);
            });
        });

        describe('handleSocketDisconnect', () => {
            test('должен отписать сокет от всех плагинов', () => {
                const mockChild = {
                    killed: false,
                    send: jest.fn()
                };
                processManager.processes.set(1, mockChild);

                processManager.subscribeToPluginUi(1, 'plugin1', mockSocket);
                processManager.subscribeToPluginUi(1, 'plugin2', mockSocket);
                processManager.subscribeToPluginUi(2, 'plugin3', mockSocket);

                processManager.handleSocketDisconnect(mockSocket);

                expect(processManager.getPluginSubscribers(1, 'plugin1')).toBeUndefined();
                expect(processManager.getPluginSubscribers(1, 'plugin2')).toBeUndefined();
                expect(processManager.getPluginSubscribers(2, 'plugin3')).toBeUndefined();
            });
        });
    });

    describe('Pending requests', () => {
        test('addPlayerListRequest должен добавить запрос', () => {
            const handler = { resolve: jest.fn(), timeout: {} };

            processManager.addPlayerListRequest('req-123', handler);

            expect(processManager.pendingPlayerListRequests.has('req-123')).toBe(true);
        });

        test('resolvePlayerListRequest должен вызвать resolve', () => {
            const handler = {
                resolve: jest.fn(),
                timeout: setTimeout(() => {}, 1000)
            };
            processManager.addPlayerListRequest('req-123', handler);

            processManager.resolvePlayerListRequest('req-123', ['Player1', 'Player2']);

            expect(handler.resolve).toHaveBeenCalledWith(['Player1', 'Player2']);
            expect(processManager.pendingPlayerListRequests.has('req-123')).toBe(false);
        });

        test('addCommandRequest должен добавить запрос', () => {
            const handler = { resolve: jest.fn(), reject: jest.fn() };

            processManager.addCommandRequest('cmd-123', handler);

            expect(processManager.pendingCommandRequests.has('cmd-123')).toBe(true);
        });

        test('resolveCommandRequest должен вызвать resolve при успехе', () => {
            const handler = { resolve: jest.fn(), reject: jest.fn() };
            processManager.addCommandRequest('cmd-123', handler);

            processManager.resolveCommandRequest('cmd-123', { result: 'success' });

            expect(handler.resolve).toHaveBeenCalledWith({ result: 'success' });
            expect(handler.reject).not.toHaveBeenCalled();
        });

        test('resolveCommandRequest должен вызвать reject при ошибке', () => {
            const handler = { resolve: jest.fn(), reject: jest.fn() };
            processManager.addCommandRequest('cmd-123', handler);

            processManager.resolveCommandRequest('cmd-123', null, 'Error message');

            expect(handler.reject).toHaveBeenCalled();
            expect(handler.resolve).not.toHaveBeenCalled();
        });
    });
});
