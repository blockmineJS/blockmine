const Command = require('./system/Command');
const { loadCommands } = require('./system/CommandRegistry');
const { MessageTypes } = require('./ipc/ipcMessageTypes');
const GraphExecutionEngine = require('./GraphExecutionEngine');
const NodeRegistry = require('./NodeRegistry');

async function loadBotCommands(bot, config, prisma) {
    bot.commands = await loadCommands();

    const dbCommands = await prisma.command.findMany({ where: { botId: config.id } });

    for (const dbCommand of dbCommands) {
        const existingCommand = bot.commands.get(dbCommand.name);

        if (existingCommand) {
            existingCommand.isEnabled = dbCommand.isEnabled;
            existingCommand.description = dbCommand.description;
            existingCommand.cooldown = dbCommand.cooldown;
            existingCommand.aliases = JSON.parse(dbCommand.aliases || '[]');
            existingCommand.permissionId = dbCommand.permissionId;
            existingCommand.allowedChatTypes = JSON.parse(dbCommand.allowedChatTypes || '[]');

            const aliases = JSON.parse(dbCommand.aliases || '[]');
            for (const alias of aliases) {
                bot.commands.set(alias, existingCommand);
            }
        } else if (dbCommand.isVisual) {
            const visualCommand = createVisualCommand(bot, dbCommand);
            bot.commands.set(visualCommand.name, visualCommand);

            const visualAliases = JSON.parse(dbCommand.aliases || '[]');
            for (const alias of visualAliases) {
                bot.commands.set(alias, visualCommand);
            }
        }
    }

    for (const cmd of bot.commands.values()) {
        if (cmd.aliases && Array.isArray(cmd.aliases)) {
            for (const alias of cmd.aliases) {
                if (!bot.commands.has(alias)) {
                    bot.commands.set(alias, cmd);
                }
            }
        }
    }

    if (process.send) {
        for (const cmd of bot.commands.values()) {
            process.send({
                type: MessageTypes.COMMAND.REGISTER,
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

    return bot.commands;
}

function createVisualCommand(bot, dbCommand) {
    const visualCommand = new Command({
        name: dbCommand.name,
        description: dbCommand.description,
        aliases: JSON.parse(dbCommand.aliases || '[]'),
        cooldown: dbCommand.cooldown,
        allowedChatTypes: JSON.parse(dbCommand.allowedChatTypes || '[]'),
        args: JSON.parse(dbCommand.argumentsJson || '[]'),
        owner: 'visual_editor',
    });

    visualCommand.permissionId = dbCommand.permissionId;
    visualCommand.graphJson = dbCommand.graphJson;
    visualCommand.owner = 'visual_editor';

    visualCommand.handler = (botInstance, typeChat, user, args) => {
        const playerList = botInstance ? Object.keys(botInstance.players) : [];
        const botState = botInstance ? { yaw: botInstance.entity.yaw, pitch: botInstance.entity.pitch } : {};
        const botEntity = botInstance && botInstance.entity ? {
            position: botInstance.entity.position,
            yaw: botInstance.entity.yaw,
            pitch: botInstance.entity.pitch
        } : null;

        const context = {
            bot: botInstance,
            botApi: botInstance.api,
            user,
            args,
            typeChat,
            players: playerList,
            botState,
            botEntity,
            botId: botInstance.config.id,
            graphId: dbCommand.id,
            eventType: 'command',
            eventArgs: {
                commandName: dbCommand.name,
                user: { username: user?.username },
                args,
                typeChat
            }
        };

        const engine = new GraphExecutionEngine(NodeRegistry, botInstance);
        return engine.execute(visualCommand.graphJson, context);
    };

    return visualCommand;
}

function registerTemporaryCommand(bot, commandData) {
    const tempCommand = new Command({
        name: commandData.name,
        description: commandData.description || '',
        aliases: commandData.aliases || [],
        cooldown: commandData.cooldown || 0,
        allowedChatTypes: commandData.allowedChatTypes || ['chat', 'private'],
        args: [],
        owner: 'runtime',
    });

    tempCommand.permissionId = commandData.permissionId || null;
    tempCommand.isTemporary = true;
    tempCommand.tempId = commandData.tempId;
    tempCommand.isVisual = false;
    tempCommand.handler = () => {};

    bot.commands.set(commandData.name, tempCommand);

    if (Array.isArray(commandData.aliases)) {
        for (const alias of commandData.aliases) {
            bot.commands.set(alias, tempCommand);
        }
    }
}

function unregisterTemporaryCommand(bot, commandName, aliases) {
    if (bot.commands.has(commandName)) {
        bot.commands.delete(commandName);
    }

    if (Array.isArray(aliases)) {
        for (const alias of aliases) {
            if (bot.commands.has(alias)) {
                bot.commands.delete(alias);
            }
        }
    }
}

module.exports = {
    loadBotCommands,
    createVisualCommand,
    registerTemporaryCommand,
    unregisterTemporaryCommand
};
