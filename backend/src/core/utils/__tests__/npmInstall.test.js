const os = require('os');
const path = require('path');
const fse = require('fs-extra');
const { installDependencies } = require('../npmInstall');

describe('installDependencies', () => {
    it('не запускает npm, если node_modules уже есть', async () => {
        const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'bm-npm-'));
        const logs = [];
        try {
            await fse.writeJson(path.join(dir, 'package.json'), {
                dependencies: { leftpad: '1.0.0' },
            });
            await fse.ensureDir(path.join(dir, 'node_modules'));

            const result = await installDependencies(dir, { sendLog: (message) => logs.push(message) });

            expect(result).toEqual({ installed: false, reason: 'up-to-date' });
            expect(logs.join('\n')).not.toContain('npm');
            const stamp = await fse.readFile(path.join(dir, '.bm-installed-deps.json'), 'utf8');
            expect(stamp).toBe(JSON.stringify({ leftpad: '1.0.0' }));
        } finally {
            await fse.remove(dir);
        }
    });
});
