
const mineflayer = require('mineflayer');
const { SocksClient } = require('socks');
const EventEmitter = require('events');
const { loadCommands } = require('./system/CommandRegistry');
const { initializePlugins } = require('./PluginLoader');
const MessageQueue = require('./MessageQueue');
const Command = require('./system/Command');
const { parseArguments } = require('./system/parseArguments');

const UserService = require('./ipc/UserService.stub.js');
const PermissionManager = require('./ipc/PermissionManager.stub.js');

let bot = null;

function sendLog(content) {
    if (process.send) {
        process.send({ type: 'log', content });
    } else {
        console.log(`[ChildProcess Log] ${content}`);
    }
}

function handleIncomingCommand(type, username, message) {
    if (!message.startsWith(bot.config.prefix || '@')) return;

    const rawMessage = message.slice((bot.config.prefix || '@').length).trim();
    const commandParts = rawMessage.split(/ +/);
    const commandName = commandParts.shift().toLowerCase();
    const restOfMessage = commandParts.join(' ');

    const commandInstance = bot.commands.get(commandName) || 
                            Array.from(bot.commands.values()).find(cmd => cmd.aliases.includes(commandName));

    if (!commandInstance) return;

    try {
        const processedArgs = {};
        const parsedArgs = parseArguments(restOfMessage);
        let currentArgIndex = 0;

        for (const argDef of commandInstance.args) {
            if (argDef.type === 'greedy_string') {
                if (currentArgIndex < parsedArgs.length) {
                    processedArgs[argDef.name] = parsedArgs.slice(currentArgIndex).join(' ');
                    currentArgIndex = parsedArgs.length;
                }
            } else if (currentArgIndex < parsedArgs.length) {
                let value = parsedArgs[currentArgIndex];
                if (argDef.type === 'number') {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) {
                        bot.api.sendMessage(type, `Ошибка: Неверный тип аргумента "${argDef.description}". Ожидалось число.`, username);
                        return;
                    }
                    value = numValue;
                }
                processedArgs[argDef.name] = value;
                currentArgIndex++;
            }

            if (processedArgs[argDef.name] === undefined) {
                if (argDef.required) {
                    bot.api.sendMessage(type, `Ошибка: Необходимо указать: ${argDef.description}`, username);
                    return;
                }
                if (argDef.default !== undefined) {
                    processedArgs[argDef.name] = argDef.default;
                }
            }
        }
        
        if (process.send) {
            process.send({
                type: 'validate_and_run_command',
                commandName: commandInstance.name,
                username,
                args: processedArgs,
                typeChat: type
            });
        }
    } catch (e) {
        sendLog(`[BotProcess] Ошибка парсинга аргументов: ${e.message}`);
    }
}

process.on('message', async (message) => {
    if (message.type === 'start') {
        const config = message.config;
        sendLog(`[System] Получена команда на запуск бота ${config.username}...`);
        try {
            const botOptions = {
                host: config.server.host,
                port: config.server.port,
                username: config.username,
                password: config.password,
                version: config.server.version,
                auth: 'offline',
                hideErrors: false,
            };

            if (config.proxyHost && config.proxyPort) {
                sendLog(`[System] Используется прокси: ${config.proxyHost}:${config.proxyPort}`);
                botOptions.connect = (client) => {
                   SocksClient.createConnection({
                       proxy: {
                           host: config.proxyHost,
                           port: config.proxyPort,
                           type: 5,
                           userId: config.proxyUsername,
                           password: config.proxyPassword
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
                       sendLog(`[Proxy Error] ${err.message}`);
                       client.emit('error', err);
                   });
                }
           } else {
                sendLog(`[System] Прокси не настроен, используется прямое подключение.`);
           }

            bot = mineflayer.createBot(botOptions);

            bot.events = new EventEmitter();
            bot.events.setMaxListeners(30); 
            bot.config = config;
            bot.sendLog = sendLog;
            bot.messageQueue = new MessageQueue(bot);

            const installedPluginNames = config.plugins.map(p => p.name);

            bot.api = {
                Command: Command,
                events: bot.events,
                sendMessage: (type, message, username) => bot.messageQueue.enqueue(type, message, username),
                sendMessageAndWaitForReply: (command, patterns, timeout) => bot.messageQueue.enqueueAndWait(command, patterns, timeout),
                getUser: (username) => UserService.getUser(username, bot.config.id, bot.config),
                registerPermissions: (permissions) => PermissionManager.registerPermissions(bot.config.id, permissions),
                registerGroup: (groupConfig) => PermissionManager.registerGroup(bot.config.id, groupConfig),
                addPermissionsToGroup: (groupName, permissionNames) => PermissionManager.addPermissionsToGroup(bot.config.id, groupName, permissionNames),
                installedPlugins: installedPluginNames,
                registerCommand: (commandInstance) => {
                    if (!(commandInstance instanceof Command)) {
                        throw new Error('registerCommand ожидает экземпляр класса Command.');
                    }
                    bot.commands.set(commandInstance.name, commandInstance);
                    if (process.send) {
                        process.send({
                            type: 'register_command',
                            commandConfig: {
                                name: commandInstance.name,
                                description: commandInstance.description,
                                aliases: commandInstance.aliases,
                                owner: commandInstance.owner,
                                permissions: commandInstance.permissions,
                                cooldown: commandInstance.cooldown,
                                allowedChatTypes: commandInstance.allowedChatTypes,
                            }
                        });
                    }
                    sendLog(`[API] Команда "${commandInstance.name}" от плагина "${commandInstance.owner}" зарегистрирована в процессе.`);
                }
            };

            bot.commands = await loadCommands();

            if (process.send) {
                for (const cmd of bot.commands.values()) {
                    process.send({
                        type: 'register_command',
                        commandConfig: {
                            name: cmd.name,
                            description: cmd.description,
                            aliases: cmd.aliases,
                            owner: cmd.owner,
                            permissions: cmd.permissions,
                            cooldown: cmd.cooldown,
                            allowedChatTypes: cmd.allowedChatTypes,
                        }
                    });
                }
            }
            
            await initializePlugins(bot, config.plugins);
            sendLog('[System] Все системы инициализированы.');


            let messageHandledByCustomParser = false;

            bot.events.on('chat:message', (data) => {
                const { type, username, message } = data;
                if (username && message) {
                    messageHandledByCustomParser = true;
                    handleIncomingCommand(type, username, message);
                }
            });
            
            bot.on('message', (jsonMsg) => {
                const ansiMessage = jsonMsg.toAnsi();
                if (ansiMessage.trim()) {
                    sendLog(ansiMessage);
                }
                
                messageHandledByCustomParser = false;
                const rawMessageText = jsonMsg.toString();
                bot.events.emit('core:raw_message', rawMessageText, jsonMsg);
            });
            
            bot.on('chat', (username, message) => {
                if (messageHandledByCustomParser) {
                    return;
                }
                handleIncomingCommand('chat', username, message);
            });

            bot.on('login', () => {
                sendLog('[Event: login] Успешно залогинился!');
                if (process.send) {
                    process.send({ type: 'status', status: 'running' });
                }
            });

            bot.on('spawn', () => {
                sendLog('[Event: spawn] Бот заспавнился в мире. Полностью готов к работе!');
            });
            
            bot.on('kicked', (reason) => {
                let reasonText;
                try { reasonText = JSON.parse(reason).text || reason; } catch (e) { reasonText = reason; }
                sendLog(`[Event: kicked] Меня кикнули. Причина: ${reasonText}.`);
                process.exit(0);
            });

            bot.on('error', (err) => sendLog(`[Event: error] Произошла ошибка: ${err.stack || err.message}`));

            bot.on('end', (reason) => {
                sendLog(`[Event: end] Отключен от сервера. Причина: ${reason}`);
                process.exit(0);
            });

        } catch (err) {
            sendLog(`[CRITICAL] Критическая ошибка при создании бота: ${err.stack}`);
            process.exit(1);
        }
    } else if (message.type === 'stop') {
        if (bot) bot.quit();
        else process.exit(0);
    } else if (message.type === 'chat') {
        if (bot && bot.entity) {
            const { message: msg, chatType, username } = message.payload;
            bot.messageQueue.enqueue(chatType, msg, username);
        }
    } else if (message.type === 'execute_handler') {
        const { commandName, username, args, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            const fakeUser = { username };
            commandInstance.handler(bot, typeChat, fakeUser, args).catch(e => {
                sendLog(`[Handler Error] Ошибка в handler-е команды ${commandName}: ${e.message}`);
            });
        }
    } else if (message.type === 'invalidate_user_cache') {
        if (message.username && bot && bot.config) {
            UserService.clearCache(message.username, bot.config.id);
        }
    }
});

process.on('unhandledRejection', (reason, promise) => {
    const errorMsg = `[FATAL] Необработанная ошибка процесса: ${reason?.stack || reason}`;
    sendLog(errorMsg);
    console.error(errorMsg, promise);
    process.exit(1);
});