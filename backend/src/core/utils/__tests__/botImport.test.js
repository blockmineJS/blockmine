const path = require('path');
const os = require('os');
const fse = require('fs-extra');
const AdmZip = require('adm-zip');
const {
    assertSafeUsername,
    resolveSafePluginDir,
    resolveBotPluginsDir,
    parseImportZip,
    importBotFromZip,
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

    describe('importBotFromZip', () => {
        it('links imported commands to the new plugin id', async () => {
            const username = `import_fix_${Date.now()}`;
            const pluginDir = resolveBotPluginsDir(username);
            const created = [];
            const zip = new AdmZip();
            zip.addFile('bot.json', Buffer.from(JSON.stringify({ username, prefix: '@' })));
            zip.addFile('plugins.json', Buffer.from(JSON.stringify([
                { id: 5, name: 'demo', version: '1.0.0', settings: '{}' },
            ])));
            zip.addFile('commands.json', Buffer.from(JSON.stringify([
                { name: 'hi', pluginOwnerId: 5 },
            ])));

            const events = [];
            const prisma = {
                bot: {
                    findFirst: async () => null,
                    create: async () => ({ id: 1, username, server: {} }),
                    delete: async () => {},
                },
                installedPlugin: {
                    upsert: async () => ({ id: 9 }),
                    update: async () => ({}),
                },
                command: {
                    create: async ({ data }) => {
                        created.push(data);
                        return data;
                    },
                },
            };

            try {
                await importBotFromZip(zip, {
                    config: { username, serverId: 1, autoRename: false },
                    prisma,
                    pluginManager: {},
                    setupDefaultPermissions: async () => {},
                    onProgress: (event) => events.push(event),
                });
            } finally {
                await fse.remove(pluginDir);
            }

            expect(created).toHaveLength(1);
            expect(created[0].pluginOwnerId).toBe(9);
            expect(events).toEqual(expect.arrayContaining([
                { stage: 'bot' },
                { stage: 'plugin', step: 'files', name: 'demo', index: 1, total: 1 },
            ]));
        });
    });
});
