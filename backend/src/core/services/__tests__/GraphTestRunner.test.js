function waitFor(predicate, timeout = 4000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            try {
                if (predicate()) {
                    resolve();
                    return;
                }
            } catch (error) {
                reject(error);
                return;
            }
            if (Date.now() - started > timeout) {
                reject(new Error('timeout'));
                return;
            }
            setTimeout(tick, 15);
        };
        tick();
    });
}

describe('graph test run', () => {
    const events = [];
    let launchGraphTest;
    let getGlobalDebugManager;

    const graph = {
        nodes: [
            { id: 'start', type: 'event:command', position: { x: 0, y: 0 }, data: {} },
            { id: 'arg', type: 'data:get_argument', position: { x: 200, y: 0 }, data: { argumentName: 'target' } },
            { id: 'msg', type: 'action:send_message', position: { x: 420, y: 0 }, data: { chat_type: 'private', message: '' } },
        ],
        connections: [
            { id: 'e1', sourceNodeId: 'start', targetNodeId: 'msg', sourcePinId: 'exec', targetPinId: 'exec' },
            { id: 'e2', sourceNodeId: 'arg', targetNodeId: 'msg', sourcePinId: 'value', targetPinId: 'message' },
        ],
        variables: [],
    };

    beforeAll(() => {
        jest.resetModules();
        const debug = require('../DebugSessionManager');
        getGlobalDebugManager = debug.getGlobalDebugManager;
        debug.initializeDebugManager({
            to() {
                return {
                    emit(event, data) {
                        events.push({ event, data });
                    },
                };
            },
            sockets: { adapter: { rooms: new Map() } },
        });
        launchGraphTest = require('../GraphTestRunner').launchGraphTest;
    });

    beforeEach(() => {
        events.length = 0;
    });

    it('sends the command argument without a mineflayer bot', async () => {
        const graphId = 910001;
        const originalSend = process.send;
        process.send = undefined;
        try {
            const result = await launchGraphTest({
                kind: 'command',
                botId: 1,
                graphId,
                graph,
                commandName: 'hello',
                body: {
                    username: 'merka',
                    typeChat: 'private',
                    args: { target: 'Steve' },
                },
            });

            expect(result.success).toBe(true);

            await waitFor(() => events.some((item) => item.event === 'debug:paused'));

            getGlobalDebugManager().get(graphId).resume(null, true);

            await waitFor(() => events.some((item) => item.event === 'debug:test-effect'));
            await waitFor(() => events.some((item) => item.event === 'debug:test-finished'));

            const effect = events.find((item) => item.event === 'debug:test-effect').data.effect;
            expect(effect.kind).toBe('message');
            expect(effect.message).toBe('Steve');
            expect(effect.username).toBe('merka');
            expect(effect.chatType).toBe('private');
        } finally {
            process.send = originalSend;
        }
    }, 20000);
});
