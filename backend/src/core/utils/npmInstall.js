const { execSync } = require('child_process');
const fse = require('fs-extra');
const path = require('path');

const NPM_PACKAGE_NAME_PATTERN = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

function isValidPackageName(name) {
    if (typeof name !== 'string' || name.length === 0 || name.length > 214) return false;
    if (name.startsWith('.') || name.startsWith('_')) return false;
    return NPM_PACKAGE_NAME_PATTERN.test(name);
}

function runCommand(cmd, cwd, { timeoutMs = DEFAULT_TIMEOUT_MS, sendLog = console.log } = {}) {
    try {
        execSync(cmd, { cwd, stdio: 'pipe', timeout: timeoutMs });
        return { ok: true };
    } catch (error) {
        const stderr = error?.stderr?.toString?.() || '';
        const stdout = error?.stdout?.toString?.() || '';
        const detail = stderr || stdout || error.message;
        sendLog(`[npm] Команда '${cmd}' завершилась с ошибкой: ${detail.split('\n').slice(-3).join(' | ')}`);
        return { ok: false, error, detail };
    }
}

async function installDependencies(pluginPath, options = {}) {
    const { sendLog = console.log, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const packageJsonPath = path.join(pluginPath, 'package.json');
    if (!await fse.pathExists(packageJsonPath)) return { installed: false, reason: 'no-package-json' };

    let packageJson;
    try {
        packageJson = await fse.readJson(packageJsonPath);
    } catch (error) {
        sendLog(`[npm] Не удалось прочитать package.json: ${error.message}`);
        return { installed: false, reason: 'invalid-package-json' };
    }

    const hasDeps = packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0;
    if (!hasDeps) return { installed: false, reason: 'no-deps' };

    const packageManagerField = typeof packageJson.packageManager === 'string' ? packageJson.packageManager : '';
    const prefersPnpm = /pnpm/i.test(packageManagerField);
    const prefersYarn = /yarn/i.test(packageManagerField);
    const hasPackageLock = await fse.pathExists(path.join(pluginPath, 'package-lock.json'));
    const hasPnpmLock = await fse.pathExists(path.join(pluginPath, 'pnpm-lock.yaml'));
    const hasYarnLock = await fse.pathExists(path.join(pluginPath, 'yarn.lock'));

    const attempts = [];
    if (prefersPnpm || hasPnpmLock) attempts.push('pnpm install --prod --no-frozen-lockfile');
    if (prefersYarn || hasYarnLock) attempts.push('yarn install --production --no-immutable');
    if (hasPackageLock) attempts.push('npm ci --omit=dev --no-audit --no-fund');
    attempts.push('npm install --omit=dev --no-audit --no-fund');
    attempts.push('npm install --omit=dev --legacy-peer-deps --no-audit --no-fund');

    for (const cmd of attempts) {
        const result = runCommand(cmd, pluginPath, { timeoutMs, sendLog });
        if (result.ok) {
            sendLog(`[npm] Зависимости установлены через '${cmd}'.`);
            return { installed: true, command: cmd };
        }
    }

    throw new Error('Не удалось установить зависимости плагина стандартными способами.');
}

function installSinglePackage(packageName, pluginPath, options = {}) {
    if (!isValidPackageName(packageName)) {
        throw new Error(`Некорректное имя пакета: ${packageName}`);
    }
    const { sendLog = console.log, timeoutMs = DEFAULT_TIMEOUT_MS, legacyPeerDeps = false } = options;
    const flags = legacyPeerDeps ? '--omit=dev --legacy-peer-deps --no-audit --no-fund' : '--omit=dev --no-audit --no-fund';
    const cmd = `npm install ${packageName} ${flags}`;
    const result = runCommand(cmd, pluginPath, { timeoutMs, sendLog });
    if (!result.ok && !legacyPeerDeps) {
        return installSinglePackage(packageName, pluginPath, { ...options, legacyPeerDeps: true });
    }
    if (!result.ok) {
        throw result.error || new Error(`Не удалось установить пакет ${packageName}.`);
    }
    return result;
}

function getPeerDependencies(packageName, pluginPath) {
    if (!isValidPackageName(packageName)) return [];
    try {
        const out = execSync(`npm view ${packageName} peerDependencies --json`, { cwd: pluginPath, timeout: 30000 });
        const text = String(out || '').trim();
        if (!text || text === 'null' || text === 'undefined') return [];
        const parsed = JSON.parse(text);
        return Object.keys(parsed || {}).filter(isValidPackageName);
    } catch {
        return [];
    }
}

module.exports = {
    NPM_PACKAGE_NAME_PATTERN,
    isValidPackageName,
    installDependencies,
    installSinglePackage,
    getPeerDependencies,
};
