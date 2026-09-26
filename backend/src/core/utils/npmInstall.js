const { execSync, spawn } = require('child_process');
const fse = require('fs-extra');
const path = require('path');

const NPM_PACKAGE_NAME_PATTERN = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

function isValidPackageName(name) {
    if (typeof name !== 'string' || name.length === 0 || name.length > 214) return false;
    if (name.startsWith('.') || name.startsWith('_')) return false;
    return NPM_PACKAGE_NAME_PATTERN.test(name);
}

function runCommandAsync(cmd, cwd, { timeoutMs = DEFAULT_TIMEOUT_MS, sendLog = console.log } = {}) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        const child = spawn(cmd, { cwd, shell: true, windowsHide: true });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            child.kill();
            finish({ ok: false, detail: 'timeout' });
        }, timeoutMs);
        child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', (error) => {
            sendLog(`[npm] Команда '${cmd}' завершилась с ошибкой: ${error.message}`);
            finish({ ok: false, error, detail: error.message });
        });
        child.on('close', (code) => {
            if (code === 0) {
                finish({ ok: true });
                return;
            }
            const detail = (stderr || stdout || `code ${code}`).split('\n').slice(-3).join(' | ');
            sendLog(`[npm] Команда '${cmd}' завершилась с ошибкой: ${detail}`);
            finish({ ok: false, detail });
        });
    });
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
    const { sendLog = console.log, timeoutMs = DEFAULT_TIMEOUT_MS, onWait } = options;
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

    const stampPath = path.join(pluginPath, '.bm-installed-deps.json');
    const nextStamp = JSON.stringify(packageJson.dependencies || {});
    const nodeModulesPath = path.join(pluginPath, 'node_modules');
    let previousStamp = '';
    if (await fse.pathExists(stampPath)) {
        previousStamp = (await fse.readFile(stampPath, 'utf8')).trim();
    }
    if (await fse.pathExists(nodeModulesPath) && (previousStamp === '' || previousStamp === nextStamp)) {
        if (previousStamp !== nextStamp) await fse.writeFile(stampPath, nextStamp);
        return { installed: false, reason: 'up-to-date' };
    }

    const packageManagerField = typeof packageJson.packageManager === 'string' ? packageJson.packageManager : '';
    const prefersPnpm = /pnpm/i.test(packageManagerField);
    const prefersYarn = /yarn/i.test(packageManagerField);
    const hasPackageLock = await fse.pathExists(path.join(pluginPath, 'package-lock.json'));
    const hasPnpmLock = await fse.pathExists(path.join(pluginPath, 'pnpm-lock.yaml'));
    const hasYarnLock = await fse.pathExists(path.join(pluginPath, 'yarn.lock'));

    const attempts = [];
    if (prefersPnpm || hasPnpmLock) attempts.push('pnpm install --prod --no-frozen-lockfile --ignore-scripts');
    if (prefersYarn || hasYarnLock) attempts.push('yarn install --production --no-immutable --ignore-scripts');
    if (hasPackageLock) attempts.push('npm ci --omit=dev --no-audit --no-fund --ignore-scripts');
    attempts.push('npm install --omit=dev --no-audit --no-fund --ignore-scripts');
    attempts.push('npm install --omit=dev --legacy-peer-deps --no-audit --no-fund --ignore-scripts');

    for (const cmd of attempts) {
        const started = Date.now();
        const pulse = () => {
            if (typeof onWait === 'function') onWait({ command: cmd, elapsedMs: Date.now() - started });
        };
        pulse();
        const timer = setInterval(pulse, 3000);
        let result;
        try {
            result = await runCommandAsync(cmd, pluginPath, { timeoutMs, sendLog });
        } finally {
            clearInterval(timer);
        }
        if (result.ok) {
            sendLog(`[npm] Зависимости установлены через '${cmd}'.`);
            await fse.writeFile(stampPath, nextStamp);
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
    const flags = legacyPeerDeps ? '--omit=dev --legacy-peer-deps --no-audit --no-fund --ignore-scripts' : '--omit=dev --no-audit --no-fund --ignore-scripts';
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
