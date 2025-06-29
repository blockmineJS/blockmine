// This is a simple polyfill for crypto.randomUUID() to support non-secure contexts (http)
// It's not as cryptographically secure as the original, but it's good enough for generating unique IDs in the UI.
export function randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
} 