describe('logic:compare node', () => {
    const logicCompare = require('../compare');

    const mockHelpers = (aValue, bValue) => ({
        resolvePinValue: jest.fn(async (node, pinId) => {
            if (pinId === 'a') return aValue;
            if (pinId === 'b') return bValue;
            return null;
        }),
    });

    it('should compare greater than', async () => {
        const node = { id: 'test', data: { operation: '>' } };
        const helpers = mockHelpers(10, 5);

        const result = await logicCompare.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(true);
    });

    it('should compare less than', async () => {
        const node = { id: 'test', data: { operation: '<' } };
        const helpers = mockHelpers(5, 10);

        const result = await logicCompare.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(true);
    });

    it('should compare equals', async () => {
        const node = { id: 'test', data: { operation: '==' } };
        const helpers = mockHelpers(10, 10);

        const result = await logicCompare.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(true);
    });

    it('should compare not equals', async () => {
        const node = { id: 'test', data: { operation: '!=' } };
        const helpers = mockHelpers(10, 5);

        const result = await logicCompare.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(true);
    });

    it('should compare greater or equal', async () => {
        const node = { id: 'test', data: { operation: '>=' } };
        const helpers = mockHelpers(10, 10);

        const result = await logicCompare.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(true);
    });

    it('should compare less or equal', async () => {
        const node = { id: 'test', data: { operation: '<=' } };
        const helpers = mockHelpers(5, 10);

        const result = await logicCompare.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(true);
    });

    it('should handle string comparison', async () => {
        const node = { id: 'test', data: { operation: '<' } };
        const helpers = mockHelpers('apple', 'banana');

        const result = await logicCompare.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(true);
    });

    it('should default to equals if no operation specified', async () => {
        const node = { id: 'test', data: {} };
        const helpers = mockHelpers(5, 5);

        const result = await logicCompare.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(true);
    });
});
