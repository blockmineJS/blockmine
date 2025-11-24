const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class User {
    /**
     * Конструктор не должен вызываться напрямую. Используйте статический метод User.getUser().
     * @param {object} userInstance - Полный объект пользователя из Prisma.
     * @param {object} botConfig - Полный объект конфигурации бота.
     */
    constructor(userInstance, botConfig = {}) {
        this.user = userInstance;
        this.botConfig = botConfig;

        const globalOwners = ["merka", "akrem"];
        const keksikServers = ["mc.mineblaze.net", "mc.masedworld.net", "mc.cheatmine.net", "mc.dexland.org"];

        const botOwners = (this.botConfig.owners || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        const usernameLower = this.user.username.toLowerCase();

        console.log(`[DEBUG UserService] Bot ${this.botConfig.id} - owners string: "${this.botConfig.owners}", parsed array:`, botOwners, `checking user: "${usernameLower}"`);

        this.isOwner = botOwners.includes(usernameLower) || (keksikServers.includes(this.botConfig.server?.host) && globalOwners.includes(usernameLower));

        console.log(`[DEBUG UserService] User "${usernameLower}" isOwner: ${this.isOwner}`);

        this.permissionsSet = new Set();
        if (this.user.groups) {
            this.user.groups.forEach(userGroup => {
                if (userGroup.group && userGroup.group.permissions) {
                    userGroup.group.permissions.forEach(groupPermission => {
                        if (groupPermission.permission) {
                            this.permissionsSet.add(groupPermission.permission.name);
                        }
                    });
                }
            });
        }
    }

    get id() { return this.user.id; }
    get username() { return this.user.username; }
    get groups() { return this.user.groups; }
    
    get isBlacklisted() { 
        return this.isOwner ? false : this.user.isBlacklisted; 
    }

    async setBlacklist(value) {
        this.user = await prisma.user.update({
            where: { id: this.id },
            data: { isBlacklisted: value },
        });
        User.clearCache(this.username, this.user.botId);
        return this;
    }

    hasPermission(permissionName) {
        if (this.isOwner) return true;
        if (!permissionName) return false;

        if (this.permissionsSet.has(permissionName)) {
            return true;
        }

        const permissionParts = permissionName.split('.');
        if (permissionParts.length > 1) {
            const domain = permissionParts[0];
            const wildcard = `${domain}.*`;
            if (this.permissionsSet.has(wildcard)) {
                return true;
            }
        }
        
        if (this.permissionsSet.has('*')) {
            return true;
        }

        return false;
    }

    async addGroup(groupName) {
        const group = await prisma.group.findUnique({ where: { botId_name: { botId: this.user.botId, name: groupName } } });
        if (!group) throw new Error(`Группа ${groupName} не найдена`);

        const existingLink = await prisma.userGroup.findUnique({
            where: {
                userId_groupId: {
                    userId: this.id,
                    groupId: group.id,
                },
            },
        });

        if (!existingLink) {
            await prisma.userGroup.create({ data: { userId: this.id, groupId: group.id } });
        }
        
        return this.refresh();
    }

    async removeGroup(groupName) {
        const group = await prisma.group.findUnique({ where: { botId_name: { botId: this.user.botId, name: groupName } } });
        if (!group) throw new Error(`Группа ${groupName} не найдена`);
        await prisma.userGroup.delete({ where: { userId_groupId: { userId: this.id, groupId: group.id } } });
        const remainingGroups = await prisma.userGroup.count({ where: { userId: this.id } });
        if (remainingGroups === 0) {
            const defaultGroup = await prisma.group.findUnique({ where: { botId_name: { botId: this.user.botId, name: 'User' } } });
            if (defaultGroup) {
                await prisma.userGroup.create({ data: { userId: this.id, groupId: defaultGroup.id } });
            }
        }
        return this.refresh();
    }
    
    async refresh() {
        User.clearCache(this.username, this.user.botId);
        return User.getUser(this.username, this.user.botId);
    }

    static cache = new Map();

    static clearCache(username, botId) {
        if (!username || !botId) return;
        const lowerUsername = username.toLowerCase();
        const cacheKey = `${botId}:${lowerUsername}`;
        User.cache.delete(cacheKey);
        console.log(`[UserService] Кэш для пользователя "${lowerUsername}" (Бот ID: ${botId}) был очищен.`);
    }

    hasGroup(groupName) {
        if (!this.user.groups || this.user.groups.length === 0) {
            return false;
        }
        return this.user.groups.some(userGroup => userGroup.group.name.toLowerCase() === groupName.toLowerCase());
    }
    
    static async getUser(username, botId, botConfig = null) {
        if (!username || !botId) {
            throw new Error("Имя пользователя и ID бота обязательны.");
        }
        const lowerUsername = username.toLowerCase();
        const cacheKey = `${botId}:${lowerUsername}`;

        if (User.cache.has(cacheKey)) {
            return User.cache.get(cacheKey);
        }

        if (!botConfig) {
            botConfig = await prisma.bot.findUnique({ where: { id: botId }, include: { server: true } });
        }

        let userInstance = await prisma.user.findUnique({
            where: { botId_username: { botId, username: lowerUsername } },
            include: { 
                groups: { 
                    include: { 
                        group: { 
                            include: { 
                                permissions: { 
                                    include: { 
                                        permission: true 
                                    } 
                                } 
                            } 
                        } 
                    } 
                } 
            },
        });

        if (!userInstance) {
            const defaultGroup = await prisma.group.findUnique({ where: { botId_name: { botId, name: 'User' } } });
            
            if (!defaultGroup) {
                console.warn(`[UserService] Дефолтная группа 'User' не найдена для бота ID ${botId}. Пользователь будет создан без группы.`);
                userInstance = await prisma.user.upsert({
                    where: { botId_username: { botId, username: lowerUsername } },
                    update: {},
                    create: { username: lowerUsername, botId },
                    include: { groups: { include: { group: { include: { permissions: { include: { permission: true } } } } } } },
                });
            } else {
                 userInstance = await prisma.user.upsert({
                    where: { botId_username: { botId, username: lowerUsername } },
                    update: {},
                    create: {
                        username: lowerUsername,
                        botId,
                        groups: { create: { groupId: defaultGroup.id } }
                    },
                    include: { groups: { include: { group: { include: { permissions: { include: { permission: true } } } } } } },
                });
            }
        }

        const user = new User(userInstance, botConfig);
        User.cache.set(cacheKey, user);
        return user;
    }
}

module.exports = User;