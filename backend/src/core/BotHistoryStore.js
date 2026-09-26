const prisma = require('../lib/prisma');

/**
 * In-memory хранилище истории чатов и команд ботов
 * Хранит последние N сообщений/команд для каждого бота
 */

class BotHistoryStore {
    constructor() {
        this.chatHistory = new Map();
        this.commandLogs = new Map();

        this.MAX_CHAT_MESSAGES = 1000;
        this.MAX_COMMAND_LOGS = 500;
    }

    /**
     * Добавить сообщение чата
     */
    addChatMessage(botId, data) {
        if (!this.chatHistory.has(botId)) {
            this.chatHistory.set(botId, []);
        }

        const messages = this.chatHistory.get(botId);

        const entry = {
            type: data.type || 'chat',
            username: data.username,
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString()
        };

        messages.push(entry);

        if (messages.length > this.MAX_CHAT_MESSAGES) {
            messages.shift();
        }
    }

    /**
     * Получить историю чата с фильтрами
     */
    getChatHistory(botId, filters = {}) {
        const messages = this.chatHistory.get(botId) || [];

        let filtered = [...messages];

        if (filters.type) {
            filtered = filtered.filter(m => m.type === filters.type);
        }

        if (filters.username) {
            filtered = filtered.filter(m => m.username.toLowerCase() === filters.username.toLowerCase());
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(m => m.message.toLowerCase().includes(searchLower));
        }

        if (filters.from) {
            const fromDate = new Date(filters.from);
            filtered = filtered.filter(m => new Date(m.timestamp) >= fromDate);
        }

        if (filters.to) {
            const toDate = new Date(filters.to);
            filtered = filtered.filter(m => new Date(m.timestamp) <= toDate);
        }

        const limit = parseInt(filters.limit) || 100;
        const offset = parseInt(filters.offset) || 0;

        return {
            messages: filtered.slice(offset, offset + limit).reverse(),
            total: filtered.length
        };
    }

    /**
     * Добавить лог команды
     */
    addCommandLog(botId, data) {
        if (!this.commandLogs.has(botId)) {
            this.commandLogs.set(botId, []);
        }

        const logs = this.commandLogs.get(botId);

        const entry = {
            username: data.username,
            command: data.command,
            args: data.args || [],
            typeChat: data.typeChat || null,
            success: data.success !== undefined ? data.success : true,
            error: data.error || null,
            timestamp: data.timestamp || new Date().toISOString()
        };

        logs.push(entry);

        if (logs.length > this.MAX_COMMAND_LOGS) {
            logs.shift();
        }

        prisma.commandInvocation.create({
            data: {
                botId: Number(botId),
                commandName: entry.command || '',
                username: entry.username || '',
                typeChat: entry.typeChat,
                argsJson: JSON.stringify(entry.args || {}),
                success: entry.success !== false,
                error: entry.error,
                createdAt: new Date(entry.timestamp),
            },
        }).catch((error) => {
            console.error('[CommandHistory] Не удалось записать вызов:', error.message);
        });
    }

    async getPersistentCommandLogs(botId, filters = {}) {
        const where = { botId: Number(botId) };
        if (filters.command) where.commandName = filters.command;
        if (filters.username) where.username = filters.username;
        if (filters.success !== undefined) {
            where.success = filters.success === 'true' || filters.success === true;
        }

        const limit = parseInt(filters.limit, 10) || 100;
        const offset = parseInt(filters.offset, 10) || 0;
        const [rows, total] = await Promise.all([
            prisma.commandInvocation.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.commandInvocation.count({ where }),
        ]);

        return {
            logs: rows.map((row) => ({
                username: row.username,
                command: row.commandName,
                args: safeParseArgs(row.argsJson),
                typeChat: row.typeChat,
                success: row.success,
                error: row.error,
                timestamp: row.createdAt.toISOString(),
            })),
            total,
        };
    }

    /**
     * Получить логи команд с фильтрами
     */
    getCommandLogs(botId, filters = {}) {
        const logs = this.commandLogs.get(botId) || [];

        let filtered = [...logs];

        if (filters.username) {
            filtered = filtered.filter(l => l.username.toLowerCase() === filters.username.toLowerCase());
        }

        if (filters.command) {
            filtered = filtered.filter(l => l.command === filters.command);
        }

        if (filters.success !== undefined) {
            const successValue = filters.success === 'true' || filters.success === true;
            filtered = filtered.filter(l => l.success === successValue);
        }

        if (filters.from) {
            const fromDate = new Date(filters.from);
            filtered = filtered.filter(l => new Date(l.timestamp) >= fromDate);
        }

        if (filters.to) {
            const toDate = new Date(filters.to);
            filtered = filtered.filter(l => new Date(l.timestamp) <= toDate);
        }

        const limit = parseInt(filters.limit) || 100;
        const offset = parseInt(filters.offset) || 0;

        return {
            logs: filtered.slice(offset, offset + limit).reverse(),
            total: filtered.length
        };
    }

    /**
     * Очистить историю бота
     */
    clearBot(botId) {
        this.chatHistory.delete(botId);
        this.commandLogs.delete(botId);
    }

    /**
     * Получить статистику
     */
    getStats(botId) {
        const chatMessages = this.chatHistory.get(botId) || [];
        const commandLogs = this.commandLogs.get(botId) || [];

        const byType = {};
        chatMessages.forEach(msg => {
            const type = msg.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
        });

        return {
            chat: {
                total: chatMessages.length,
                byType
            },
            commands: {
                total: commandLogs.length,
                successful: commandLogs.filter(l => l.success).length,
                failed: commandLogs.filter(l => !l.success).length
            }
        };
    }
}

function safeParseArgs(value) {
    try {
        return JSON.parse(value || '{}');
    } catch {
        return {};
    }
}

module.exports = new BotHistoryStore();
