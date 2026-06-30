const path = require('path');
const os = require('os');
const {
    assertSafeUsername,
    resolveSafePluginDir,
    resolveBotPluginsDir,
    parseImportZip,
    PLUGINS_BASE_DIR,
} = require('../botImport');
const { assertArchiveLimits } = require('../zipSafe');

describe('botImport security guards', () => {
    describe('assertSafeUsername', () => {
        it('accepts normal usernames', () => {
            expect(() => assertSafeUsername('MyBot_1')).not.toThrow();
            expect(() => assertSafeUsername('player.name-2')).not.toThrow();
        });

        it.each(['../evil', '..', '.', 'a/b', 'a\\b', '', '   ', 'a/../b', 'x\0y'])(
            'rejects path-unsafe username %p',
            (name) => {
                expect(() => assertSafeUsername(name)).toThrow();
            }
        );
    });

    describe('resolveSafePluginDir', () => {
        const base = path.resolve(PLUGINS_BASE_DIR, 'bot1');

        it('keeps normal plugin names inside the bot dir', () => {
            const dest = resolveSafePluginDir(base, 'my-plugin');
            expect(dest).toBe(path.resolve(base, 'my-plugin'));
            expect(dest.startsWith(base + path.sep)).toBe(true);
        });

        it('allows scoped npm names as nested dirs inside the bot dir', () => {
            const dest = resolveSafePluginDir(base, '@scope/name');
            expect(dest.startsWith(base + path.sep)).toBe(true);
        });

        it.each(['../escape', '../../etc/passwd', '..\\..\\win', 'sub/../../escape'])(
            'rejects traversal plugin name %p',
            (name) => {
                expect(() => resolveSafePluginDir(base, name)).toThrow();
            }
        );
    });

    describe('resolveBotPluginsDir', () => {
        it('stays within the plugins base dir for a safe username', () => {
            const dir = resolveBotPluginsDir('SafeBot');
            expect(dir.startsWith(path.resolve(PLUGINS_BASE_DIR) + path.sep)).toBe(true);
        });
    });

    describe('assertArchiveLimits', () => {
        const fakeZip = (entries) => ({ getEntries: () => entries });

        it('passes for a small archive', () => {
            const zip = fakeZip([{ header: { size: 1000 } }, { header: { size: 2000 } }]);
            expect(() => assertArchiveLimits(zip)).not.toThrow();
        });

        it('rejects too many entries', () => {
            const entries = Array.from({ length: 10001 }, () => ({ header: { size: 1 } }));
            expect(() => assertArchiveLimits(fakeZip(entries))).toThrow();
        });

        it('rejects a decompression bomb over the size budget', () => {
            const zip = fakeZip([{ header: { size: 600 * 1024 * 1024 } }]);
            expect(() => assertArchiveLimits(zip)).toThrow();
        });
    });

    describe('parseImportZip', () => {
        it('rejects a non-zip buffer with a 400', () => {
            let thrown;
            try {
                parseImportZip(Buffer.from('this is not a zip file'));
            } catch (e) {
                thrown = e;
            }
            expect(thrown).toBeDefined();
            expect(thrown.statusCode).toBe(400);
        });
    });
});
