describe('strings:concat node', () => {
    const stringConcat = require('../concat');

    const mockHelpers = (...strings) => ({
        resolvePinValue: jest.fn(async (node, pinId, defaultValue) => {
            const match = pinId.match(/^pin_(\d+)$/);
            if (match) {
                const index = parseInt(match[1]);
                return strings[index] !== undefined ? strings[index] : defaultValue;
            }
            return defaultValue;
        }),
    });

    it('should concatenate two strings', async () => {
        const node = { id: 'test', data: { pinCount: 2 } };
        const helpers = mockHelpers('Hello', ' World');

        const result = await stringConcat.evaluate(node, 'result', {}, helpers);

        expect(result).toBe('Hello World');
    });

    it('should concatenate multiple strings', async () => {
        const node = { id: 'test', data: { pinCount: 4 } };
        const helpers = mockHelpers('A', 'B', 'C', 'D');

        const result = await stringConcat.evaluate(node, 'result', {}, helpers);

        expect(result).toBe('ABCD');
    });

    it('should handle empty strings', async () => {
        const node = { id: 'test', data: { pinCount: 3 } };
        const helpers = mockHelpers('Hello', '', 'World');

        const result = await stringConcat.evaluate(node, 'result', {}, helpers);

        expect(result).toBe('HelloWorld');
    });

    it('should use default pinCount of 2', async () => {
        const node = { id: 'test', data: {} };
        const helpers = mockHelpers('A', 'B');

        const result = await stringConcat.evaluate(node, 'result', {}, helpers);

        expect(result).toBe('AB');
    });
});
