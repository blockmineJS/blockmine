const { execute } = require('../restart_bot');

describe('bot:restart', () => {
    const originalSend = process.send;

    afterEach(() => {
        process.send = originalSend;
    });

    it('в тестовом режиме не перезапускает бота', async () => {
        process.send = jest.fn();
        const effects = [];
        await execute({}, {
            __testMode: true,
            recordEffect: (effect) => effects.push(effect),
        });
        expect(process.send).not.toHaveBeenCalled();
        expect(effects).toEqual([{ kind: 'bot', operation: 'restart' }]);
    });

    it('просит панель перезапустить бота', async () => {
        process.send = jest.fn();
        await execute({}, {});
        expect(process.send).toHaveBeenCalledWith({ type: 'restart' });
    });
});
