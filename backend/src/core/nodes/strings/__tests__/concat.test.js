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

    it('should handle non-string inputs by converting to string', async () => {
        const node = { id: 'test', data: { pinCount: 4 } };
        const helpers = mockHelpers('String: ', 123, ' Boolean: ', true);

        const result = await stringConcat.evaluate(node, 'result', {}, helpers);

        expect(result).toBe('String: 123 Boolean: true');
    });

    it('should handle null and undefined inputs', async () => {
        const node = { id: 'test', data: { pinCount: 4 } };
        const helpers = mockHelpers('Value: ', null, ' | ', undefined);

        const result = await stringConcat.evaluate(node, 'result', {}, helpers);

        // null и undefined заменяются на пустые строки в текущей реализации
        expect(result).toBe('Value:  | ');
    });

    it('should handle very large number of inputs', async () => {
        const node = { id: 'test', data: { pinCount: 100 } };
        const inputs = Array(100).fill('x');
        const helpers = mockHelpers(...inputs);

        const result = await stringConcat.evaluate(node, 'result', {}, helpers);

        expect(result).toBe('x'.repeat(100));
        expect(result.length).toBe(100);
    });

    it('should handle object inputs by stringifying', async () => {
        const node = { id: 'test', data: { pinCount: 2 } };
        const helpers = mockHelpers('Object: ', { key: 'value' });

        const result = await stringConcat.evaluate(node, 'result', {}, helpers);

        expect(result).toBe('Object: [object Object]');
    });
});
