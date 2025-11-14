const { safeJsonParse } = require('../jsonParser');

describe('safeJsonParse', () => {
    it('should parse valid JSON string', () => {
        const result = safeJsonParse('{"key":"value"}', null, 'test');
        expect(result).toEqual({ key: 'value' });
    });

    it('should return default value for invalid JSON', () => {
        const result = safeJsonParse('{invalid}', { default: true }, 'test');
        expect(result).toEqual({ default: true });
    });

    it('should handle null input', () => {
        const result = safeJsonParse(null, 'default', 'test');
        expect(result).toBe('default');
    });

    it('should handle undefined input', () => {
        const result = safeJsonParse(undefined, 'default', 'test');
        expect(result).toBe('default');
    });

    it('should return non-string values as-is', () => {
        const obj = { key: 'value' };
        const result = safeJsonParse(obj, null, 'test');
        expect(result).toBe(obj);
    });

    it('should parse arrays correctly', () => {
        const result = safeJsonParse('[1,2,3]', [], 'test');
        expect(result).toEqual([1, 2, 3]);
    });

    it('should return default for malformed JSON', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const result = safeJsonParse('{"key": undefined}', [], 'test');

        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
