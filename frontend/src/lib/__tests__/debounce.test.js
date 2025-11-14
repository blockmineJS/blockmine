import { debounce } from '../debounce';

describe('debounce utility', () => {
    jest.useFakeTimers();

    afterEach(() => {
        jest.clearAllTimers();
    });

    it('should debounce function calls', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('call1');
        debouncedFn('call2');
        debouncedFn('call3');

        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('call3');
    });

    it('should use the last call arguments', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('first');
        jest.advanceTimersByTime(50);

        debouncedFn('second');
        jest.advanceTimersByTime(50);

        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('second');
    });

    it('should preserve context (this)', () => {
        const context = { value: 42 };
        const mockFn = jest.fn(function() {
            return this.value;
        });
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn.call(context);

        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn.mock.results[0].value).toBe(42);
    });

    it('flush() should immediately call pending function', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('test');

        expect(mockFn).not.toHaveBeenCalled();

        debouncedFn.flush();

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('flush() should use last call arguments', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('first');
        debouncedFn('second');
        debouncedFn('third');

        debouncedFn.flush();

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('flush() should not call function if no pending calls', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn.flush();

        expect(mockFn).not.toHaveBeenCalled();
    });

    it('flush() should cancel pending timer', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('test');
        debouncedFn.flush();

        jest.advanceTimersByTime(100);

        // Функция должна быть вызвана только один раз (при flush), а не дважды
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('flush() should preserve context when calling immediately', () => {
        const context = { value: 99 };
        const mockFn = jest.fn(function() {
            return this.value;
        });
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn.call(context, 'test');
        debouncedFn.flush();

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn.mock.results[0].value).toBe(99);
    });

    it('should handle multiple arguments correctly', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('arg1', 'arg2', 'arg3');

        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('flush() should handle multiple arguments correctly', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('arg1', 'arg2', 'arg3');
        debouncedFn.flush();

        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should allow calling after flush', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('first');
        debouncedFn.flush();

        expect(mockFn).toHaveBeenCalledTimes(1);

        debouncedFn('second');
        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(mockFn).toHaveBeenLastCalledWith('second');
    });
});
