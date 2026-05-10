const mineflayer = require('mineflayer');
const { SocksClient } = require('socks');
const { Vec3 } = require('vec3');
const EventEmitter = require('events');
const MessageQueue = require('./MessageQueue');

let connectionTimeout = null;
let botReadySent = false;

function buildBotOptions(config) {
    const options = {
        host: config.server.host,
        port: config.server.port,
        username: config.username,
        password: config.password,
        version: config.server.version,
        auth: 'offline',
        hideErrors: false,
        chat: 'enabled',
    };

    if (config.proxyHost && config.proxyPort) {
        const cleanProxyUsername = config.proxyUsername ? config.proxyUsername.trim() : null;
        const cleanProxyPassword = config.proxyPassword || null;

        options.connect = (client) => {
            SocksClient.createConnection({
                proxy: {
                    host: config.proxyHost,
                    port: config.proxyPort,
                    type: 5,
                    userId: cleanProxyUsername,
                    password: cleanProxyPassword
                },
                command: 'connect',
                destination: {
                    host: config.server.host,
                    port: config.server.port
                }
            }).then(info => {
                client.setSocket(info.socket);
                client.emit('connect');
            }).catch(err => {
                client.emit('error', err);
                process.exit(1);
            });
        };
    }

    return options;
}

function createBotConnection(config, sendLog) {
    return new Promise((resolve, reject) => {
        const botOptions = buildBotOptions(config);

        if (config.proxyHost && config.proxyPort) {
            sendLog(`[System] Используется прокси: ${config.proxyHost}:${config.proxyPort}`);
        } else {
            sendLog(`[System] Прокси не настроен, используется прямое подключение.`);
        }

        const bot = mineflayer.createBot(botOptions);

        connectionTimeout = setTimeout(() => {
            if (bot && !bot.player) {
                sendLog('[System] Таймаут подключения к серверу (30 секунд). Завершение работы...');
                process.exit(1);
            }
        }, 30000);

        bot.on('login', () => {
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
            sendLog('[Event: login] Успешно залогинился!');
            if (process.send && !botReadySent) {
                process.send({ type: 'bot_ready' });
                process.send({ type: 'status', status: 'running' });
                botReadySent = true;
            }
        });

        bot.on('error', (err) => {
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
            sendLog(`[Event: error] Произошла ошибка: ${err.stack || err.message}`);
            reject(err);
        });

        bot.on('end', (reason) => {
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
            const restartableReasons = ['socketClosed', 'keepAliveError'];
            const exitCode = restartableReasons.includes(reason) ? 1 : 0;
            sendLog(`[Event: end] Отключен от сервера. Причина: ${reason}`);
            process.exit(exitCode);
        });

        resolve(bot);
    });
}

function clearConnectionTimeout() {
    if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
    }
}

function resetBotReadySent() {
    botReadySent = false;
}

module.exports = {
    createBotConnection,
    buildBotOptions,
    clearConnectionTimeout,
    resetBotReadySent
};
