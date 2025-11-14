describe('time:now node', () => {
    const timeNow = require('../now');

    it('should return current date from now pin', async () => {
        const node = { id: 'test', type: 'time:now' };
        const context = {};
        const helpers = {};

        const result = await timeNow.evaluate(node, 'now', context, helpers);

        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return null for unknown pin', async () => {
        const node = { id: 'test', type: 'time:now' };
        const context = {};
        const helpers = {};

        const result = await timeNow.evaluate(node, 'unknown', context, helpers);

        expect(result).toBeNull();
    });
});
