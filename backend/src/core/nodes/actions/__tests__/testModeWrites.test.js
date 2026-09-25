jest.mock('../../../PrismaService', () => ({
    getClient: () => new Proxy({}, {
        get() {
            return new Proxy({}, {
                get() {
                    return () => {
                        throw new Error('prisma write');
                    };
                },
            });
        },
    }),
}));

jest.mock('../../../UserService', () => ({
    getUser: jest.fn(() => {
        throw new Error('user db');
    }),
    clearCache: jest.fn(),
}));

const storeWrite = require('../../data/store_write');
const createCommand = require('../create_command');
const addToGroup = require('../../users/add_to_group');

function helpers(values = {}) {
    return {
        resolvePinValue: async (node, pin, fallback) => {
            if (Object.prototype.hasOwnProperty.call(values, pin)) return values[pin];
            if (node.data && node.data[pin] !== undefined) return node.data[pin];
            return fallback;
        },
        traverse: jest.fn(async () => {}),
        memo: new Map(),
    };
}

describe('test mode database writes', () => {
    it('does not upsert plugin storage', async () => {
        const effects = [];
        const runtime = helpers();
        await storeWrite.execute(
            { id: 'store', data: { plugin_name: 'demo', key: 'coins' } },
            {
                __testMode: true,
                botId: 1,
                recordEffect: (effect) => effects.push(effect),
            },
            runtime
        );

        expect(effects).toEqual([
            expect.objectContaining({ kind: 'db_write', operation: 'store_write', summary: 'demo.coins' }),
        ]);
        expect(runtime.traverse).toHaveBeenCalledWith(expect.objectContaining({ id: 'store' }), 'exec');
    });

    it('does not create a command', async () => {
        const effects = [];
        const runtime = helpers({ name: 'from-test', temporary: false });
        await createCommand.execute(
            { id: 'create', data: {} },
            {
                __testMode: true,
                botId: 1,
                recordEffect: (effect) => effects.push(effect),
            },
            runtime
        );

        expect(effects[0]).toEqual(expect.objectContaining({
            kind: 'db_write',
            operation: 'create_command',
            summary: 'from-test',
        }));
        expect(runtime.memo.get('create:success')).toBe(true);
    });

    it('does not add a player to a group', async () => {
        const effects = [];
        const runtime = helpers({ user: 'Steve', group: 'Admin' });
        await addToGroup.execute(
            { id: 'group', data: {} },
            {
                __testMode: true,
                botId: 1,
                recordEffect: (effect) => effects.push(effect),
            },
            runtime
        );

        expect(effects[0]).toEqual(expect.objectContaining({
            kind: 'db_write',
            operation: 'add_to_group',
            summary: 'Steve -> Admin',
        }));
        expect(require('../../../UserService').getUser).not.toHaveBeenCalled();
    });
});
