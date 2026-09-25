const COMMAND_EVENTS = new Set([
    'event:command',
    'event:chat',
    'event:raw_message',
    'event:playerJoined',
    'event:playerLeft',
    'event:entitySpawn',
    'event:entityMoved',
    'event:entityGone',
    'event:health',
    'event:botDied',
    'event:botStartup',
    'event:websocket_call',
]);

function evaluateEventPin(node, pinId, context = {}) {
    if (!COMMAND_EVENTS.has(node?.type)) return undefined;
    const eventArgs = context.eventArgs || {};

    switch (node.type) {
        case 'event:command':
            if (pinId === 'args') return eventArgs.args || context.args || {};
            if (pinId === 'user') return eventArgs.user || context.user || {};
            if (pinId === 'chat_type') return eventArgs.typeChat || context.typeChat || 'chat';
            if (pinId === 'command_name') return eventArgs.commandName || '';
            if (pinId === 'success') return context.success !== undefined ? context.success : true;
            return eventArgs[pinId];
        case 'event:chat':
            if (pinId === 'username') return eventArgs.username || context.user?.username || context.username;
            if (pinId === 'message') return eventArgs.message || context.message;
            if (pinId === 'chatType') return eventArgs.chatType || eventArgs.typeChat || context.typeChat;
            return eventArgs[pinId] !== undefined ? eventArgs[pinId] : context[pinId];
        case 'event:raw_message':
            if (pinId === 'rawText') return eventArgs.rawText || context.rawText;
            return eventArgs[pinId] !== undefined ? eventArgs[pinId] : context[pinId];
        case 'event:playerJoined':
        case 'event:playerLeft':
            if (pinId === 'user') return eventArgs.user || context.user;
            return eventArgs[pinId] !== undefined ? eventArgs[pinId] : context[pinId];
        case 'event:entitySpawn':
        case 'event:entityMoved':
        case 'event:entityGone':
            if (pinId === 'entity') return eventArgs.entity || context.entity;
            return eventArgs[pinId] !== undefined ? eventArgs[pinId] : context[pinId];
        case 'event:websocket_call':
            if (pinId === 'graphName') return eventArgs.graphName || context.graphName;
            if (pinId === 'data') return eventArgs.data || context.data;
            if (pinId === 'socketId') return eventArgs.socketId || context.socketId;
            if (pinId === 'keyPrefix') return eventArgs.keyPrefix || context.keyPrefix;
            return eventArgs[pinId] !== undefined ? eventArgs[pinId] : context[pinId];
        default:
            return eventArgs[pinId] !== undefined ? eventArgs[pinId] : context[pinId];
    }
}

module.exports = { evaluateEventPin };
