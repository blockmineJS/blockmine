const { EventTypes, MessageTypes } = require('./ipc/ipcMessageTypes');
const { Vec3 } = require('vec3');

const entityMoveThrottles = new Map();

function serializeEntity(entity) {
    if (!entity) return null;
    return {
        id: entity.id,
        type: entity.type,
        username: entity.username,
        displayName: entity.displayName,
        position: entity.position,
        yaw: entity.yaw,
        pitch: entity.pitch,
        onGround: entity.onGround,
        isValid: entity.isValid,
        heldItem: entity.heldItem,
        equipment: entity.equipment,
        metadata: entity.metadata
    };
}

function attachBotEvents(bot, handlers) {
    const { onChat, onUserAction, sendLog, sendEvent } = handlers;
    let messageHandledByCustomParser = false;
    let isReady = false;

    bot.on('message', (jsonMsg) => {
        const logContent = jsonMsg.toAnsi();

        if (logContent.trim()) {
            sendLog(logContent);
        }

        messageHandledByCustomParser = false;
        const rawMessageText = jsonMsg.toString();
        bot.events.emit('core:raw_message', rawMessageText, jsonMsg);

        sendEvent('raw_message', {
            rawText: rawMessageText,
            json: jsonMsg
        });

        if (process.send && rawMessageText.trim()) {
            process.send({
                type: MessageTypes.VIEWER.CHAT,
                payload: {
                    rawText: rawMessageText,
                    timestamp: Date.now()
                }
            });
        }
    });

    bot.events.on('chat:message', (data) => {
        messageHandledByCustomParser = true;
        sendEvent('chat', {
            username: data.username,
            message: data.message,
            chatType: data.type,
            raw: data.raw,
        });
        if (onChat) onChat(data.type, data.username, data.message);
    });

    bot.on('chat', (username, message) => {
        if (messageHandledByCustomParser) return;
        bot.events.emit('chat:message', {
            username,
            message,
            type: EventTypes.CHAT,
            raw: message
        });
    });

    bot.on('whisper', (username, message) => {
        if (messageHandledByCustomParser) return;
        bot.events.emit('chat:message', {
            username,
            message,
            type: EventTypes.WHISPER,
            raw: message
        });
        if (onChat) onChat('whisper', username, message);
    });

    bot.on('userAction', async ({ action, target, ...data }) => {
        if (!target) return;
        if (onUserAction) {
            await onUserAction(action, target, data);
        }
    });

    bot.on('death', () => {
        sendEvent('botDied', { user: { username: bot.username } });
    });

    bot.on('health', () => {
        sendEvent('health', {
            health: bot.health,
            food: bot.food,
            saturation: bot.foodSaturation
        });

        if (process.send) {
            process.send({
                type: MessageTypes.VIEWER.HEALTH,
                payload: {
                    health: bot.health,
                    food: bot.food
                }
            });
        }
    });

    bot.on('kicked', (reason) => {
        let reasonText;
        try { reasonText = JSON.parse(reason).text || reason; } catch (e) { reasonText = reason; }
        sendLog(`[Event: kicked] Меня кикнули. Причина: ${reasonText}.`);
        process.exit(0);
    });

    bot.on('error', (err) => {
        sendLog(`[Event: error] Произошла ошибка: ${err.stack || err.message}`);
    });

    bot.on('end', (reason) => {
        const restartableReasons = ['socketClosed', 'keepAliveError'];
        const exitCode = restartableReasons.includes(reason) ? 1 : 0;
        sendLog(`[Event: end] Отключен от сервера. Причина: ${reason}`);
        process.exit(exitCode);
    });

    bot.on('playerJoined', (player) => {
        if (!isReady) return;
        sendEvent('playerJoined', { user: { username: player.username, uuid: player.uuid } });
    });

    bot.on('playerLeft', (player) => {
        if (!isReady) return;
        sendEvent('playerLeft', { user: { username: player.username, uuid: player.uuid } });
    });

    bot.on('entitySpawn', (entity) => {
        if (!isReady) return;
        sendEvent('entitySpawn', { entity: serializeEntity(entity) });
    });

    bot.on('entityMoved', (entity) => {
        if (!isReady) return;
        const now = Date.now();
        const lastSent = entityMoveThrottles.get(entity.id);
        if (!lastSent || now - lastSent > 500) {
            entityMoveThrottles.set(entity.id, now);
            sendEvent('entityMoved', { entity: serializeEntity(entity) });
        }
    });

    bot.on('entityGone', (entity) => {
        if (!isReady) return;
        sendEvent('entityGone', { entity: serializeEntity(entity) });
        entityMoveThrottles.delete(entity.id);
    });

    bot.on('spawn', () => {
        try {
            if (bot._client && bot._client.options) {
                bot._client.options.chat = 'enabled';
            }
            if (bot.chatEnabled !== undefined) {
                bot.chatEnabled = true;
            }
        } catch (err) {}

        setTimeout(() => {
            isReady = true;
        }, 3000);

        if (process.send) {
            process.send({
                type: MessageTypes.VIEWER.SPAWN,
                payload: {
                    position: bot.entity?.position,
                    yaw: bot.entity?.yaw,
                    pitch: bot.entity?.pitch
                }
            });
        }
    });

    bot.on('move', () => {
        if (process.send) {
            process.send({
                type: MessageTypes.VIEWER.MOVE,
                payload: {
                    position: bot.entity?.position,
                    yaw: bot.entity?.yaw,
                    pitch: bot.entity?.pitch
                }
            });
        }
    });

    bot.on('blockUpdate', (oldBlock, newBlock) => {
        if (process.send && oldBlock && newBlock) {
            process.send({
                type: 'viewer:blockUpdate',
                payload: {
                    position: {
                        x: newBlock.position.x,
                        y: newBlock.position.y,
                        z: newBlock.position.z
                    },
                    oldBlock: { type: oldBlock.type, name: oldBlock.name },
                    newBlock: { type: newBlock.type, name: newBlock.name }
                }
            });
        }
    });

    return { setReady: (value) => { isReady = value; } };
}

module.exports = {
    attachBotEvents,
    serializeEntity
};
