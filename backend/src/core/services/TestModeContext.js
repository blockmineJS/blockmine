function createMockHandler(label) {
    const handler = {
        get(target, prop) {
            if (prop === 'then') return undefined;
            if (prop === Symbol.toPrimitive) return () => `[mock:${label}]`;
            if (prop === 'toString') return () => `[mock:${label}]`;
            if (prop in target) return target[prop];
            const child = function (...args) {
                console.log(`[TestMode] mock call: ${label}.${String(prop)}(${args.length} args)`);
                return undefined;
            };
            child.__mock = true;
            const proxied = new Proxy(child, createMockHandler(`${label}.${String(prop)}`));
            target[prop] = proxied;
            return proxied;
        },
        apply(target, thisArg, args) {
            console.log(`[TestMode] mock invoke: ${label}(${args.length} args)`);
            return undefined;
        }
    };
    return handler;
}

function createTestBotMock() {
    const base = function () {};
    base.username = 'TestBot';
    base.entity = { position: { x: 0, y: 64, z: 0 }, yaw: 0, pitch: 0 };
    base.players = {};
    base.entities = {};
    base.health = 20;
    base.food = 20;
    base.sendMessage = (...args) => {
        console.log('[TestMode] bot.sendMessage:', ...args);
    };
    base.lookAt = () => {};
    base.chat = (msg) => console.log('[TestMode] bot.chat:', msg);
    return new Proxy(base, createMockHandler('bot'));
}

function createTestApiMock() {
    const base = function () {};
    return new Proxy(base, createMockHandler('api'));
}

function buildTestContext({ botId, graphId, eventArgs }) {
    return {
        botId,
        graphId,
        eventArgs,
        user: eventArgs?.user || (eventArgs?.username ? { username: eventArgs.username } : { username: 'TestUser' }),
        commandArguments: eventArgs?.commandArguments || {},
        bot: createTestBotMock(),
        api: createTestApiMock(),
        services: new Proxy({}, createMockHandler('services')),
        typeChat: 'chat',
        __testMode: true
    };
}

module.exports = {
    createTestBotMock,
    createTestApiMock,
    buildTestContext
};
