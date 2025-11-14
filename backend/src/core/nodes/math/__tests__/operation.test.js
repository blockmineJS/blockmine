describe('math:operation node', () => {
    const mathOperation = require('../operation');

    const mockHelpers = (aValue, bValue) => ({
        resolvePinValue: jest.fn(async (node, pinId, defaultValue) => {
            if (pinId === 'a') return aValue;
            if (pinId === 'b') return bValue;
            return defaultValue;
        }),
    });

    it('should add two numbers', async () => {
        const node = { id: 'test', data: { operation: '+' } };
        const helpers = mockHelpers(5, 3);

        const result = await mathOperation.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(8);
    });

    it('should subtract two numbers', async () => {
        const node = { id: 'test', data: { operation: '-' } };
        const helpers = mockHelpers(10, 3);

        const result = await mathOperation.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(7);
    });

    it('should multiply two numbers', async () => {
        const node = { id: 'test', data: { operation: '*' } };
        const helpers = mockHelpers(4, 5);

        const result = await mathOperation.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(20);
    });

    it('should divide two numbers', async () => {
        const node = { id: 'test', data: { operation: '/' } };
        const helpers = mockHelpers(20, 4);

        const result = await mathOperation.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(5);
    });

    it('should handle division by zero', async () => {
        const node = { id: 'test', data: { operation: '/' } };
        const helpers = mockHelpers(10, 0);

        const result = await mathOperation.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(0);
    });

    it('should default to addition if operation not specified', async () => {
        const node = { id: 'test', data: {} };
        const helpers = mockHelpers(5, 3);

        const result = await mathOperation.evaluate(node, 'result', {}, helpers);

        expect(result).toBe(8);
    });
});
