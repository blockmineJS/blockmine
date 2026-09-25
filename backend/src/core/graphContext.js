const { createLiveGraphServices } = require('./graphServices');

function buildGraphContext({
    bot = null,
    botId,
    graphId,
    eventType = 'command',
    eventArgs = {},
    user = null,
    args = null,
    typeChat = null,
    commandName = null,
    services = null,
    recordEffect = null,
}) {
    const namedArgs = args || eventArgs?.args || eventArgs?.commandArguments || {};
    const resolvedUser = user || eventArgs?.user || (eventArgs?.username ? { username: eventArgs.username } : null);
    const chat = typeChat || eventArgs?.typeChat || eventArgs?.chatType || 'chat';
    const resolvedServices = services || createLiveGraphServices();
    const mergedEventArgs = {
        ...(eventArgs || {}),
        commandName: commandName || eventArgs?.commandName || '',
        user: resolvedUser,
        args: namedArgs,
        typeChat: chat,
        username: resolvedUser?.username || eventArgs?.username || null,
    };

    return {
        bot,
        botApi: bot?.api || null,
        api: bot?.api || null,
        services: resolvedServices,
        user: resolvedUser,
        args: namedArgs,
        commandArguments: namedArgs,
        typeChat: chat,
        players: bot?.players ? Object.keys(bot.players) : [],
        botState: bot ? {
            health: bot.health,
            food: bot.food,
            yaw: bot.entity?.yaw,
            pitch: bot.entity?.pitch,
            position: bot.entity?.position,
            gameMode: bot.game?.gameMode,
        } : {},
        botEntity: bot?.entity ? {
            position: bot.entity.position,
            yaw: bot.entity.yaw,
            pitch: bot.entity.pitch,
            velocity: bot.entity.velocity,
            onGround: bot.entity.onGround,
            height: bot.entity.height,
            width: bot.entity.width,
        } : null,
        botId,
        graphId,
        eventType,
        eventArgs: mergedEventArgs,
        recordEffect,
        __testMode: Boolean(resolvedServices.isIsolated),
    };
}

module.exports = { buildGraphContext };
