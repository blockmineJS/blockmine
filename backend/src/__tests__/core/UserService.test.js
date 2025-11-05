// Создаём глобальные моки для Prisma методов
const mockUserFindUnique = jest.fn();
const mockUserUpsert = jest.fn();
const mockUserUpdate = jest.fn();
const mockBotFindUnique = jest.fn();
const mockGroupFindUnique = jest.fn();
const mockUserGroupFindUnique = jest.fn();
const mockUserGroupCreate = jest.fn();
const mockUserGroupDelete = jest.fn();
const mockUserGroupCount = jest.fn();

jest.mock('@prisma/client', () => {
    return {
        PrismaClient: jest.fn().mockImplementation(() => ({
            user: {
                findUnique: mockUserFindUnique,
                upsert: mockUserUpsert,
                update: mockUserUpdate,
            },
            bot: {
                findUnique: mockBotFindUnique,
            },
            group: {
                findUnique: mockGroupFindUnique,
            },
            userGroup: {
                findUnique: mockUserGroupFindUnique,
                create: mockUserGroupCreate,
                delete: mockUserGroupDelete,
                count: mockUserGroupCount,
            },
        })),
    };
});

const User = require('../../core/UserService');

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        User.cache.clear();
    });

    afterEach(() => {
        User.cache.clear();
    });

    describe('User constructor', () => {
        test('должен создать пользователя с правами владельца', () => {
            const userInstance = {
                id: 1,
                username: 'TestOwner',
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: 'TestOwner',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.isOwner).toBe(true);
            expect(user.username).toBe('TestOwner');
            expect(user.id).toBe(1);
        });

        test('должен создать пользователя без прав владельца', () => {
            const userInstance = {
                id: 1,
                username: 'RegularUser',
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: 'SomeoneElse',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.isOwner).toBe(false);
        });

        test('должен создать пользователя с правами через глобального владельца на keksik серверах', () => {
            const userInstance = {
                id: 1,
                username: 'merka',
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'mc.mineblaze.net' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.isOwner).toBe(true);
        });

        test('должен собрать права из групп пользователя', () => {
            const userInstance = {
                id: 1,
                username: 'TestUser',
                isBlacklisted: false,
                groups: [
                    {
                        group: {
                            name: 'Admin',
                            permissions: [
                                { permission: { name: 'admin.*' } },
                                { permission: { name: 'user.*' } },
                            ],
                        },
                    },
                ],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.permissionsSet.has('admin.*')).toBe(true);
            expect(user.permissionsSet.has('user.*')).toBe(true);
        });
    });

    describe('isBlacklisted getter', () => {
        test('должен вернуть false для владельца даже если в БД true', () => {
            const userInstance = {
                id: 1,
                username: 'Owner',
                isBlacklisted: true,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: 'Owner',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.isBlacklisted).toBe(false);
        });

        test('должен вернуть true для обычного пользователя из БД', () => {
            const userInstance = {
                id: 1,
                username: 'BadUser',
                isBlacklisted: true,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.isBlacklisted).toBe(true);
        });
    });

    describe('hasPermission', () => {
        test('владелец должен иметь любые права', () => {
            const userInstance = {
                id: 1,
                username: 'Owner',
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: 'Owner',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.hasPermission('any.permission')).toBe(true);
            expect(user.hasPermission('admin.delete')).toBe(true);
        });

        test('должен вернуть false для пустого имени права', () => {
            const userInstance = {
                id: 1,
                username: 'User',
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.hasPermission(null)).toBe(false);
            expect(user.hasPermission('')).toBe(false);
        });

        test('должен проверить точное совпадение права', () => {
            const userInstance = {
                id: 1,
                username: 'User',
                isBlacklisted: false,
                groups: [
                    {
                        group: {
                            name: 'Moderator',
                            permissions: [{ permission: { name: 'user.say' } }],
                        },
                    },
                ],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.hasPermission('user.say')).toBe(true);
            expect(user.hasPermission('user.kick')).toBe(false);
        });

        test('должен проверить wildcard права (domain.*)', () => {
            const userInstance = {
                id: 1,
                username: 'User',
                isBlacklisted: false,
                groups: [
                    {
                        group: {
                            name: 'Admin',
                            permissions: [{ permission: { name: 'admin.*' } }],
                        },
                    },
                ],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.hasPermission('admin.kick')).toBe(true);
            expect(user.hasPermission('admin.ban')).toBe(true);
            expect(user.hasPermission('admin.delete')).toBe(true);
            expect(user.hasPermission('user.say')).toBe(false);
        });

        test('должен проверить универсальное право (*)', () => {
            const userInstance = {
                id: 1,
                username: 'SuperAdmin',
                isBlacklisted: false,
                groups: [
                    {
                        group: {
                            name: 'SuperAdmin',
                            permissions: [{ permission: { name: '*' } }],
                        },
                    },
                ],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.hasPermission('admin.anything')).toBe(true);
            expect(user.hasPermission('user.anything')).toBe(true);
            expect(user.hasPermission('custom.permission')).toBe(true);
        });
    });

    describe('hasGroup', () => {
        test('должен вернуть true если пользователь в группе', () => {
            const userInstance = {
                id: 1,
                username: 'User',
                isBlacklisted: false,
                groups: [
                    { group: { name: 'Admin' } },
                    { group: { name: 'Moderator' } },
                ],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.hasGroup('Admin')).toBe(true);
            expect(user.hasGroup('admin')).toBe(true); // case-insensitive
            expect(user.hasGroup('Moderator')).toBe(true);
        });

        test('должен вернуть false если пользователь не в группе', () => {
            const userInstance = {
                id: 1,
                username: 'User',
                isBlacklisted: false,
                groups: [{ group: { name: 'User' } }],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.hasGroup('Admin')).toBe(false);
        });

        test('должен вернуть false если нет групп', () => {
            const userInstance = {
                id: 1,
                username: 'User',
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            expect(user.hasGroup('Admin')).toBe(false);
        });
    });

    describe('setBlacklist', () => {
        test('должен обновить статус черного списка', async () => {
            const updatedUser = {
                id: 1,
                username: 'BadUser',
                botId: 1,
                isBlacklisted: true,
                groups: [],
            };

            mockUserUpdate.mockResolvedValue(updatedUser);

            const userInstance = {
                id: 1,
                username: 'BadUser',
                botId: 1,
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.server.com' },
            };

            const user = new User(userInstance, botConfig);

            await user.setBlacklist(true);

            expect(mockUserUpdate).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isBlacklisted: true },
            });

            expect(user.user.isBlacklisted).toBe(true);
        });
    });

    describe('clearCache', () => {
        test('должен очистить кеш для конкретного пользователя', () => {
            User.cache.set('1:testuser', {});
            User.cache.set('1:anotheruser', {});

            User.clearCache('TestUser', 1);

            expect(User.cache.has('1:testuser')).toBe(false);
            expect(User.cache.has('1:anotheruser')).toBe(true);
        });

        test('не должен падать при пустых параметрах', () => {
            expect(() => User.clearCache(null, null)).not.toThrow();
            expect(() => User.clearCache('', '')).not.toThrow();
        });
    });

    describe('getUser', () => {
        test('должен выбросить ошибку если нет username', async () => {
            await expect(User.getUser(null, 1)).rejects.toThrow(
                'Имя пользователя и ID бота обязательны.'
            );
        });

        test('должен выбросить ошибку если нет botId', async () => {
            await expect(User.getUser('TestUser', null)).rejects.toThrow(
                'Имя пользователя и ID бота обязательны.'
            );
        });

        test('должен вернуть пользователя из кеша', async () => {
            const cachedUser = new User(
                { id: 1, username: 'testuser', isBlacklisted: false, groups: [] },
                { id: 1, owners: '', server: { host: 'test.com' } }
            );

            User.cache.set('1:testuser', cachedUser);

            const user = await User.getUser('TestUser', 1);

            expect(user).toBe(cachedUser);
            expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        test('должен создать нового пользователя если не существует', async () => {
            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const defaultGroup = {
                id: 1,
                name: 'User',
            };

            const newUser = {
                id: 1,
                username: 'newuser',
                botId: 1,
                isBlacklisted: false,
                groups: [
                    {
                        group: {
                            name: 'User',
                            permissions: [],
                        },
                    },
                ],
            };

            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(null);
            mockGroupFindUnique.mockResolvedValue(defaultGroup);
            mockUserUpsert.mockResolvedValue(newUser);

            const user = await User.getUser('NewUser', 1);

            expect(user).toBeInstanceOf(User);
            expect(user.username).toBe('newuser');
            expect(mockUserUpsert).toHaveBeenCalled();
        });

        test('должен загрузить существующего пользователя из БД', async () => {
            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const existingUser = {
                id: 1,
                username: 'existinguser',
                botId: 1,
                isBlacklisted: false,
                groups: [
                    {
                        group: {
                            name: 'Admin',
                            permissions: [{ permission: { name: 'admin.*' } }],
                        },
                    },
                ],
            };

            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(existingUser);

            const user = await User.getUser('ExistingUser', 1);

            expect(user).toBeInstanceOf(User);
            expect(user.username).toBe('existinguser');
            expect(user.hasPermission('admin.kick')).toBe(true);
        });

        test('должен использовать переданный botConfig вместо загрузки из БД', async () => {
            const botConfig = {
                id: 1,
                owners: 'TestOwner',
                server: { host: 'test.com' },
            };

            const existingUser = {
                id: 1,
                username: 'testowner',
                botId: 1,
                isBlacklisted: false,
                groups: [],
            };

            mockUserFindUnique.mockResolvedValue(existingUser);

            const user = await User.getUser('TestOwner', 1, botConfig);

            expect(user.isOwner).toBe(true);
            expect(mockBotFindUnique).not.toHaveBeenCalled();
        });

        test('должен закешировать пользователя после загрузки', async () => {
            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const existingUser = {
                id: 1,
                username: 'testuser',
                botId: 1,
                isBlacklisted: false,
                groups: [],
            };

            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(existingUser);

            await User.getUser('TestUser', 1);

            expect(User.cache.has('1:testuser')).toBe(true);

            // Второй вызов должен вернуть из кеша
            await User.getUser('TestUser', 1);

            expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
        });

        test('должен создать пользователя без дефолтной группы если группа User не найдена', async () => {
            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const newUser = {
                id: 1,
                username: 'newuser',
                botId: 1,
                isBlacklisted: false,
                groups: [], // Без групп
            };

            // Mock console.warn для проверки предупреждения
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(null);
            mockGroupFindUnique.mockResolvedValue(null); // Дефолтная группа не найдена
            mockUserUpsert.mockResolvedValue(newUser);

            const user = await User.getUser('NewUser', 1);

            expect(user).toBeInstanceOf(User);
            expect(user.username).toBe('newuser');
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Дефолтная группа \'User\' не найдена')
            );
            expect(mockUserUpsert).toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
        });
    });

    describe('addGroup', () => {
        test('должен добавить группу пользователю', async () => {
            const userInstance = {
                id: 1,
                username: 'testuser',
                botId: 1,
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const user = new User(userInstance, botConfig);

            const group = { id: 5, name: 'Moderator' };
            const updatedUser = {
                ...userInstance,
                groups: [
                    {
                        group: {
                            name: 'Moderator',
                            permissions: [],
                        },
                    },
                ],
            };

            mockGroupFindUnique.mockResolvedValue(group);
            mockUserGroupFindUnique.mockResolvedValue(null); // Связь не существует
            mockUserGroupCreate.mockResolvedValue({});
            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(updatedUser);

            const result = await user.addGroup('Moderator');

            expect(mockGroupFindUnique).toHaveBeenCalledWith({
                where: { botId_name: { botId: 1, name: 'Moderator' } },
            });
            expect(mockUserGroupCreate).toHaveBeenCalledWith({
                data: { userId: 1, groupId: 5 },
            });
            expect(result).toBeInstanceOf(User);
        });

        test('должен выбросить ошибку если группа не найдена', async () => {
            const userInstance = {
                id: 1,
                username: 'testuser',
                botId: 1,
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const user = new User(userInstance, botConfig);

            mockGroupFindUnique.mockResolvedValue(null);

            await expect(user.addGroup('NonExistent')).rejects.toThrow(
                'Группа NonExistent не найдена'
            );
        });

        test('не должен добавлять группу если связь уже существует', async () => {
            const userInstance = {
                id: 1,
                username: 'testuser',
                botId: 1,
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const user = new User(userInstance, botConfig);

            const group = { id: 5, name: 'Moderator' };
            const existingLink = { userId: 1, groupId: 5 };

            mockGroupFindUnique.mockResolvedValue(group);
            mockUserGroupFindUnique.mockResolvedValue(existingLink); // Связь уже существует
            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(userInstance);

            await user.addGroup('Moderator');

            expect(mockUserGroupCreate).not.toHaveBeenCalled();
        });
    });

    describe('removeGroup', () => {
        test('должен удалить группу у пользователя', async () => {
            const userInstance = {
                id: 1,
                username: 'testuser',
                botId: 1,
                isBlacklisted: false,
                groups: [
                    {
                        group: {
                            name: 'Moderator',
                            permissions: [],
                        },
                    },
                ],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const user = new User(userInstance, botConfig);

            const group = { id: 5, name: 'Moderator' };
            const updatedUser = {
                ...userInstance,
                groups: [],
            };

            mockGroupFindUnique.mockResolvedValue(group);
            mockUserGroupDelete.mockResolvedValue({});
            mockUserGroupCount.mockResolvedValue(1); // Осталась 1 группа
            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(updatedUser);

            const result = await user.removeGroup('Moderator');

            expect(mockUserGroupDelete).toHaveBeenCalledWith({
                where: { userId_groupId: { userId: 1, groupId: 5 } },
            });
            expect(result).toBeInstanceOf(User);
        });

        test('должен выбросить ошибку если группа не найдена', async () => {
            const userInstance = {
                id: 1,
                username: 'testuser',
                botId: 1,
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const user = new User(userInstance, botConfig);

            mockGroupFindUnique.mockResolvedValue(null);

            await expect(user.removeGroup('NonExistent')).rejects.toThrow(
                'Группа NonExistent не найдена'
            );
        });

        test('должен добавить дефолтную группу User если не осталось групп', async () => {
            const userInstance = {
                id: 1,
                username: 'testuser',
                botId: 1,
                isBlacklisted: false,
                groups: [
                    {
                        group: {
                            name: 'Moderator',
                            permissions: [],
                        },
                    },
                ],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const user = new User(userInstance, botConfig);

            const moderatorGroup = { id: 5, name: 'Moderator' };
            const defaultGroup = { id: 1, name: 'User' };
            const updatedUser = {
                ...userInstance,
                groups: [
                    {
                        group: {
                            name: 'User',
                            permissions: [],
                        },
                    },
                ],
            };

            mockGroupFindUnique
                .mockResolvedValueOnce(moderatorGroup) // Первый вызов для Moderator
                .mockResolvedValueOnce(defaultGroup); // Второй вызов для дефолтной группы User
            mockUserGroupDelete.mockResolvedValue({});
            mockUserGroupCount.mockResolvedValue(0); // Не осталось групп
            mockUserGroupCreate.mockResolvedValue({});
            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(updatedUser);

            await user.removeGroup('Moderator');

            expect(mockUserGroupCount).toHaveBeenCalledWith({
                where: { userId: 1 },
            });
            expect(mockGroupFindUnique).toHaveBeenCalledWith({
                where: { botId_name: { botId: 1, name: 'User' } },
            });
            expect(mockUserGroupCreate).toHaveBeenCalledWith({
                data: { userId: 1, groupId: 1 },
            });
        });
    });

    describe('refresh', () => {
        test('должен обновить пользователя из БД', async () => {
            const userInstance = {
                id: 1,
                username: 'testuser',
                botId: 1,
                isBlacklisted: false,
                groups: [],
            };

            const botConfig = {
                id: 1,
                owners: '',
                server: { host: 'test.com' },
            };

            const user = new User(userInstance, botConfig);

            const updatedUserInstance = {
                ...userInstance,
                isBlacklisted: true, // Изменилось
            };

            mockBotFindUnique.mockResolvedValue(botConfig);
            mockUserFindUnique.mockResolvedValue(updatedUserInstance);

            const refreshedUser = await user.refresh();

            expect(refreshedUser).toBeInstanceOf(User);
            expect(User.cache.has('1:testuser')).toBe(true);
        });
    });
});
