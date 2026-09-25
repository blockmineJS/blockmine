const { computeDynamicOutputs } = require('../../../../../shared/nodePins.mjs');
const { buildGraphContext } = require('../../graphContext');
const { evaluateEventPin } = require('../../nodes/event/evaluateEvent');
const { createTestGraphServices } = require('../../graphServices');

describe('graph foundation', () => {
    it('shares command arguments between args and the command event', () => {
        const context = buildGraphContext({
            botId: 1,
            graphId: 2,
            eventType: 'command',
            user: { username: 'merka' },
            args: { target: 'Steve' },
            typeChat: 'private',
            commandName: 'hello',
        });

        expect(context.args).toBe(context.eventArgs.args);
        expect(context.commandArguments).toBe(context.args);
        expect(evaluateEventPin({ type: 'event:command' }, 'args', context)).toEqual({ target: 'Steve' });
        expect(evaluateEventPin({ type: 'event:command' }, 'chat_type', context)).toBe('private');
        expect(evaluateEventPin({ type: 'event:command' }, 'user', context)).toEqual({ username: 'merka' });
    });

    it('builds sequence outputs from one pin function', () => {
        const outputs = computeDynamicOutputs('flow:sequence', { pinCount: 4 });
        expect(outputs.map((pin) => pin.id)).toEqual(['exec_0', 'exec_1', 'exec_2', 'exec_3']);
    });

    it('keeps a test store write out of prisma and readable again', async () => {
        const effects = [];
        const services = createTestGraphServices((effect) => effects.push(effect));
        const written = await services.tryWrite('store_write', 'demo.coins', {
            botId: 1,
            pluginName: 'demo',
            key: 'coins',
            value: 3,
        });
        expect(written.handled).toBe(true);
        expect(effects[0].kind).toBe('db_write');
        await expect(services.readStore(1, 'demo', 'coins')).resolves.toBe(3);
    });
});
