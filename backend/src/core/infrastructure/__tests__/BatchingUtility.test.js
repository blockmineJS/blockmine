const BatchingUtility = require('../BatchingUtility');

describe('BatchingUtility', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('executes operations and resolves promises', async () => {
        const batcher = new BatchingUtility({ windowMs: 50 });
        const p = batcher.add(() => 42);
        await batcher.flush();
        expect(await p).toBe(42);
    });

    it('batches multiple operations within window', async () => {
        jest.useFakeTimers();
        const order = [];
        const batcher = new BatchingUtility({ windowMs: 100 });

        const p1 = batcher.add(() => { order.push(1); return 1; });
        const p2 = batcher.add(() => { order.push(2); return 2; });
        const p3 = batcher.add(() => { order.push(3); return 3; });

        await batcher.flush();

        expect(order).toEqual([1, 2, 3]);
        expect(await p1).toBe(1);
        expect(await p2).toBe(2);
        expect(await p3).toBe(3);
    });

    it('flushes immediately when maxSize is reached', async () => {
        const batcher = new BatchingUtility({ windowMs: 10000, maxSize: 2 });
        const results = [];
        const p1 = batcher.add(() => results.push(1));
        const p2 = batcher.add(() => results.push(2));
        await Promise.all([p1, p2]);
        expect(results).toEqual([1, 2]);
    });

    it('preserves operation order', async () => {
        const batcher = new BatchingUtility({ windowMs: 50 });
        const order = [];
        batcher.add(() => order.push('a'));
        batcher.add(() => order.push('b'));
        batcher.add(() => order.push('c'));
        await batcher.flush();
        expect(order).toEqual(['a', 'b', 'c']);
    });

    it('rejects promise when operation throws', async () => {
        const batcher = new BatchingUtility({ windowMs: 50 });
        const p = batcher.add(() => { throw new Error('fail'); });
        await batcher.flush();
        await expect(p).rejects.toThrow('fail');
    });

    it('handles mixed success and failure in same batch', async () => {
        const batcher = new BatchingUtility({ windowMs: 50 });
        const p1 = batcher.add(() => 'ok');
        const p2 = batcher.add(() => { throw new Error('fail'); });
        const p3 = batcher.add(() => 'also ok');
        await batcher.flush();
        expect(await p1).toBe('ok');
        await expect(p2).rejects.toThrow('fail');
        expect(await p3).toBe('also ok');
    });

    it('getPendingCount returns correct count', () => {
        jest.useFakeTimers();
        const batcher = new BatchingUtility({ windowMs: 1000 });
        batcher.add(() => 1);
        batcher.add(() => 2);
        expect(batcher.getPendingCount()).toBe(2);
    });

    it('destroy rejects all pending operations', async () => {
        jest.useFakeTimers();
        const batcher = new BatchingUtility({ windowMs: 1000 });
        const p1 = batcher.add(() => 1);
        const p2 = batcher.add(() => 2);
        batcher.destroy();
        await expect(p1).rejects.toThrow();
        await expect(p2).rejects.toThrow();
    });
});
