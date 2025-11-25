const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3').Vec3;

class MinecraftBotManager {
    constructor({ logger }) {
        this.logger = logger;
        this.bots = new Map();
        this.sessionIdCounter = 0;
    }

    async createBot(sessionId, config) {
        const { host, port, version, username, password } = config;

        if (this.bots.has(sessionId)) {
            await this.disconnectBot(sessionId);
        }

        this.logger.info(`[Minecraft] Creating bot ${username} for session ${sessionId}`);

        const bot = mineflayer.createBot({
            host,
            port: port || 25565,
            username,
            password: password || undefined,
            version: version || '1.19.2',
            hideErrors: false
        });

        bot.loadPlugin(pathfinder);

        const botState = {
            bot,
            config,
            status: 'connecting',
            health: 20,
            food: 20,
            position: null,
            yaw: 0,
            pitch: 0
        };

        this.bots.set(sessionId, botState);
        this._attachEventHandlers(sessionId, bot);

        return sessionId;
    }

    _attachEventHandlers(sessionId, bot) {
        bot.on('spawn', () => {
            this.logger.info(`[Minecraft] Bot spawned for session ${sessionId}`);
            const state = this.bots.get(sessionId);
            if (state) {
                state.status = 'online';
                state.position = bot.entity.position;
                state.yaw = bot.entity.yaw;
                state.pitch = bot.entity.pitch;
            }
        });

        bot.on('health', () => {
            const state = this.bots.get(sessionId);
            if (state) {
                state.health = bot.health;
                state.food = bot.food;
            }
        });

        bot.on('move', () => {
            const state = this.bots.get(sessionId);
            if (state && bot.entity) {
                state.position = bot.entity.position;
                state.yaw = bot.entity.yaw;
                state.pitch = bot.entity.pitch;
            }
        });

        bot.on('end', (reason) => {
            this.logger.info(`[Minecraft] Bot disconnected for session ${sessionId}: ${reason}`);
            const state = this.bots.get(sessionId);
            if (state) {
                state.status = 'offline';
            }
        });

        bot.on('error', (err) => {
            this.logger.error(`[Minecraft] Bot error for session ${sessionId}:`, err);
        });

        bot.on('kicked', (reason) => {
            this.logger.warn(`[Minecraft] Bot kicked for session ${sessionId}: ${reason}`);
        });
    }

    async disconnectBot(sessionId) {
        const state = this.bots.get(sessionId);
        if (!state) return;

        this.logger.info(`[Minecraft] Disconnecting bot for session ${sessionId}`);

        if (state.bot) {
            state.bot.quit();
        }

        this.bots.delete(sessionId);
    }

    getBotState(sessionId) {
        const state = this.bots.get(sessionId);
        if (!state || !state.bot) return null;

        const bot = state.bot;

        return {
            status: state.status,
            health: state.health || 20,
            food: state.food || 20,
            position: state.position ? {
                x: state.position.x,
                y: state.position.y,
                z: state.position.z
            } : null,
            yaw: state.yaw || 0,
            pitch: state.pitch || 0,
            gameMode: bot.game?.gameMode,
            dimension: bot.game?.dimension,
            inventory: this._getInventory(bot),
            nearbyPlayers: this._getNearbyPlayers(bot),
            nearbyMobs: this._getNearbyMobs(bot)
        };
    }

    _getInventory(bot) {
        if (!bot.inventory) return [];

        return bot.inventory.items().map(item => ({
            name: item.name,
            displayName: item.displayName,
            count: item.count,
            slot: item.slot
        }));
    }

    _getNearbyPlayers(bot) {
        if (!bot.entities) return [];

        return Object.values(bot.entities)
            .filter(e => e.type === 'player' && e.username !== bot.username)
            .map(e => ({
                username: e.username,
                position: {
                    x: e.position.x,
                    y: e.position.y,
                    z: e.position.z
                },
                distance: bot.entity ? bot.entity.position.distanceTo(e.position) : 0
            }));
    }

    _getNearbyMobs(bot) {
        if (!bot.entities) return [];

        return Object.values(bot.entities)
            .filter(e => e.type === 'mob')
            .map(e => ({
                name: e.name || e.displayName,
                mobType: e.mobType,
                position: {
                    x: e.position.x,
                    y: e.position.y,
                    z: e.position.z
                },
                distance: bot.entity ? bot.entity.position.distanceTo(e.position) : 0
            }));
    }

    async handleControlCommand(sessionId, command) {
        const state = this.bots.get(sessionId);
        if (!state || !state.bot) return;

        const bot = state.bot;

        try {
            switch (command.type) {
                case 'move':
                    bot.setControlState(command.direction, command.active);
                    break;

                case 'look':
                    const yaw = command.yaw !== undefined ? command.yaw : bot.entity.yaw;
                    const pitch = command.pitch !== undefined ? command.pitch : bot.entity.pitch;
                    await bot.look(yaw, pitch, true);
                    break;

                case 'chat':
                    bot.chat(command.message);
                    break;

                case 'dig':
                    await this._digBlock(bot, command.position);
                    break;

                case 'place':
                    await this._placeBlock(bot, command.position, command.blockType);
                    break;

                default:
                    this.logger.warn(`[Minecraft] Unknown command type: ${command.type}`);
            }
        } catch (error) {
            this.logger.error(`[Minecraft] Error handling command:`, error);
        }
    }

    async _digBlock(bot, position) {
        if (!position) return;

        const block = bot.blockAt(new Vec3(position.x, position.y, position.z));
        if (!block) return;

        try {
            await bot.dig(block);
        } catch (error) {
            this.logger.error('[Minecraft] Error digging block:', error);
        }
    }

    async _placeBlock(bot, position, blockType) {
        if (!position || !blockType) return;

        const referenceBlock = bot.blockAt(new Vec3(position.x, position.y, position.z));
        if (!referenceBlock) return;

        const itemToPlace = bot.inventory.items().find(item => item.name === blockType);
        if (!itemToPlace) return;

        try {
            await bot.equip(itemToPlace, 'hand');
            await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
        } catch (error) {
            this.logger.error('[Minecraft] Error placing block:', error);
        }
    }

    getBot(sessionId) {
        const state = this.bots.get(sessionId);
        return state?.bot || null;
    }

    getAllSessions() {
        return Array.from(this.bots.keys());
    }

    generateSessionId() {
        return `mc_${++this.sessionIdCounter}_${Date.now()}`;
    }
}

module.exports = MinecraftBotManager;
