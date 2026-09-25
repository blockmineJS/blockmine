const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const semver = require('semver');
const { fetchGithubJsonSafe } = require('../utils/github');

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const OFFICIAL_OWNER = 'blockmineJS';
const OFFICIAL_REPO = 'blockmine';
const OFFICIAL_GIT_URL = `https://github.com/${OFFICIAL_OWNER}/${OFFICIAL_REPO}.git`;
const STAMP_PATH = path.join(REPO_ROOT, 'backend', 'src', '.panel-update-stamp.json');
const PROGRESS_PATH = path.join(os.homedir(), '.blockmine', 'update-progress.json');
const UPDATE_REQUEST_PATH = path.join(os.homedir(), '.blockmine', 'update-requested.txt');
const CHECK_CACHE_MS = 2 * 60 * 1000;
const STALE_PROGRESS_MS = 5 * 60 * 1000;
const MAX_COMMITS = 25;
const ACTIVE_STAGES = new Set(['stopping', 'fetch', 'pull', 'install', 'build', 'starting']);

let checkCache = { at: 0, value: null };
let applying = false;
let watchTimer = null;
let resumed = false;
let progress = {
    stage: 'idle',
    percent: 0,
    message: '',
    log: [],
    at: 0,
};

function shortSha(sha) {
    if (!sha || typeof sha !== 'string') return '';
    return sha.slice(0, 7);
}

function firstLine(message) {
    if (!message || typeof message !== 'string') return '';
    return message.split(/\r?\n/)[0].trim();
}

function isDefaultBranch(branch, defaultBranch) {
    if (!branch || branch === 'HEAD') return true;
    const normalized = String(branch).trim();
    if (normalized === 'master' || normalized === 'main') return true;
    if (defaultBranch && normalized === defaultBranch) return true;
    return false;
}

function isSafeRef(value) {
    return typeof value === 'string'
        && /^[A-Za-z0-9._/-]+$/.test(value)
        && !value.startsWith('-')
        && !value.includes('..');
}

function readLocalPackageVersion() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
        return pkg.version || '';
    } catch {
        return '';
    }
}

function hasGitDirectory() {
    try {
        return fs.existsSync(path.join(REPO_ROOT, '.git'));
    } catch {
        return false;
    }
}

function isDevelopment(env = process.env, argv = process.argv) {
    return env.NODE_ENV === 'development'
        || argv.includes('--dev')
        || argv.includes('--debug');
}

function resolveRestartMethod(env = process.env, argv = process.argv) {
    if (env.BLOCKMINE_UPDATE_WORKER === '1') return 'none';
    if (isDevelopment(env, argv)) return 'nodemon';
    if (env.pm_id != null && String(env.pm_id) !== '') return 'pm2';
    return 'spawn';
}

function getPm2Target(env = process.env) {
    if (env.pm_id != null && String(env.pm_id) !== '') return String(env.pm_id);
    if (env.name) return String(env.name);
    return 'blockmine';
}

function parseGitLogLine(line) {
    if (!line || typeof line !== 'string') return null;
    const [sha, message, author, date] = line.split('\x1f');
    if (!sha) return null;
    return {
        sha,
        shortSha: shortSha(sha),
        message: firstLine(message || ''),
        author: author || '',
        date: date || '',
        htmlUrl: `https://github.com/${OFFICIAL_OWNER}/${OFFICIAL_REPO}/commit/${sha}`,
    };
}

function mapGithubCommit(commit) {
    if (!commit) return null;
    const sha = commit.sha || '';
    return {
        sha,
        shortSha: shortSha(sha),
        message: firstLine(commit.commit?.message || commit.message || ''),
        author: commit.commit?.author?.name || commit.author?.login || '',
        date: commit.commit?.author?.date || commit.commit?.committer?.date || '',
        htmlUrl: commit.html_url || '',
    };
}

function resolveUpdateDecision({
    hasGit,
    gitAvailable,
    localSha,
    remoteSha,
    dirty,
    branch,
    defaultBranch,
    compareStatus,
    behindBy,
    localVersion,
    remoteVersion,
}) {
    const versionsDiffer = Boolean(
        localVersion
        && remoteVersion
        && semver.valid(localVersion)
        && semver.valid(remoteVersion)
        && semver.gt(remoteVersion, localVersion)
    );
    const shasDiffer = Boolean(localSha && remoteSha && localSha !== remoteSha);
    const behind = compareStatus === 'behind' || (Number(behindBy) || 0) > 0;
    const diverged = compareStatus === 'diverged';
    const ahead = compareStatus === 'ahead';
    const identical = compareStatus === 'identical' || (localSha && remoteSha && localSha === remoteSha);

    if (!remoteSha && !remoteVersion) {
        return { updateAvailable: false, canUpdate: false, reason: 'offline' };
    }

    if (identical && !versionsDiffer) {
        return { updateAvailable: false, canUpdate: false, reason: 'same' };
    }

    if (ahead && !behind && !versionsDiffer) {
        return { updateAvailable: false, canUpdate: false, reason: 'ahead' };
    }

    const updateAvailable = behind || diverged || shasDiffer || versionsDiffer;
    if (!updateAvailable) {
        return { updateAvailable: false, canUpdate: false, reason: 'same' };
    }

    if (!hasGit || !gitAvailable) {
        return { updateAvailable: true, canUpdate: false, reason: hasGit ? 'no_git_binary' : 'not_git' };
    }

    if (!isDefaultBranch(branch, defaultBranch)) {
        return { updateAvailable: true, canUpdate: false, reason: 'wrong_branch' };
    }

    if (diverged) {
        return { updateAvailable: true, canUpdate: false, reason: 'diverged' };
    }

    if (!localSha || !remoteSha) {
        return { updateAvailable: true, canUpdate: false, reason: 'not_git' };
    }

    return { updateAvailable: true, canUpdate: true, reason: null };
}

async function runGit(args, options = {}) {
    const { stdout } = await execFileAsync('git', args, {
        cwd: REPO_ROOT,
        timeout: options.timeout || 30000,
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
        env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0',
            GIT_ASKPASS: 'echo',
        },
    });
    return String(stdout || '').trim();
}

async function gitAvailable() {
    try {
        await execFileAsync('git', ['--version'], {
            timeout: 8000,
            windowsHide: true,
        });
        return true;
    } catch {
        return false;
    }
}

async function readLocalGitState() {
    const hasGit = hasGitDirectory();
    const gitOk = hasGit ? await gitAvailable() : false;
    const version = readLocalPackageVersion();
    const base = {
        hasGit,
        gitAvailable: gitOk,
        version,
        sha: '',
        shortSha: '',
        branch: '',
        message: '',
        date: '',
        dirty: false,
    };
    if (!hasGit || !gitOk) {
        return base;
    }
    try {
        const sha = await runGit(['rev-parse', 'HEAD']);
        const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
        const message = firstLine(await runGit(['log', '-1', '--format=%s']));
        const date = await runGit(['log', '-1', '--format=%cI']);
        const porcelain = await runGit(['status', '--porcelain']);
        return {
            ...base,
            sha,
            shortSha: shortSha(sha),
            branch,
            message,
            date,
            dirty: porcelain.length > 0,
        };
    } catch (error) {
        console.error('[PanelUpdate] Failed to read local git state:', error.message);
        return base;
    }
}

async function resolveRemoteHead() {
    const listing = await runGit(['ls-remote', '--symref', OFFICIAL_GIT_URL, 'HEAD']);
    let branch = 'master';
    let sha = '';
    for (const line of listing.split(/\r?\n/)) {
        const sym = line.match(/^ref:\s+refs\/heads\/(\S+)\s+HEAD$/);
        if (sym) {
            branch = sym[1];
            continue;
        }
        const shaMatch = line.match(/^([a-f0-9]{40})\s+HEAD$/i);
        if (shaMatch) sha = shaMatch[1];
    }
    if (!sha) {
        const fallback = await runGit(['ls-remote', OFFICIAL_GIT_URL, 'refs/heads/master']);
        sha = (fallback.split(/\s+/)[0] || '').trim();
        branch = 'master';
    }
    if (!isSafeRef(branch)) branch = 'master';
    return { sha, branch };
}

async function readRemoteSnapshotViaGit(localSha) {
    const { sha: remoteSha, branch: defaultBranch } = await resolveRemoteHead();
    if (!remoteSha) {
        throw new Error('empty remote sha');
    }

    const htmlUrl = `https://github.com/${OFFICIAL_OWNER}/${OFFICIAL_REPO}/commit/${remoteSha}`;
    if (localSha && remoteSha === localSha) {
        return {
            defaultBranch,
            version: readLocalPackageVersion(),
            sha: remoteSha,
            shortSha: shortSha(remoteSha),
            branch: defaultBranch,
            message: firstLine(await runGit(['log', '-1', '--format=%s']).catch(() => '')),
            date: await runGit(['log', '-1', '--format=%cI']).catch(() => ''),
            htmlUrl,
            compareStatus: 'identical',
            behindBy: 0,
            aheadBy: 0,
            commits: [],
        };
    }

    await runGit(['fetch', '--quiet', OFFICIAL_GIT_URL, defaultBranch], { timeout: 120000 });
    const message = firstLine(await runGit(['log', '-1', '--format=%s', 'FETCH_HEAD']));
    const date = await runGit(['log', '-1', '--format=%cI', 'FETCH_HEAD']);
    let version = '';
    try {
        const pkgRaw = await runGit(['show', 'FETCH_HEAD:package.json']);
        version = JSON.parse(pkgRaw).version || '';
    } catch {
        version = '';
    }

    const behindBy = Number(await runGit(['rev-list', '--count', 'HEAD..FETCH_HEAD'])) || 0;
    const aheadBy = Number(await runGit(['rev-list', '--count', 'FETCH_HEAD..HEAD'])) || 0;
    let compareStatus = 'unknown';
    if (behindBy > 0 && aheadBy > 0) compareStatus = 'diverged';
    else if (behindBy > 0) compareStatus = 'behind';
    else if (aheadBy > 0) compareStatus = 'ahead';
    else compareStatus = 'identical';

    const log = await runGit([
        'log',
        `-n${MAX_COMMITS}`,
        '--format=%H%x1f%s%x1f%an%x1f%cI',
        'HEAD..FETCH_HEAD',
    ]);
    const commits = log
        ? log.split(/\r?\n/).map(parseGitLogLine).filter(Boolean)
        : [];

    return {
        defaultBranch,
        version,
        sha: remoteSha,
        shortSha: shortSha(remoteSha),
        branch: defaultBranch,
        message,
        date,
        htmlUrl,
        compareStatus,
        behindBy,
        aheadBy,
        commits,
    };
}

async function readRemotePackageVersion(ref) {
    if (!isSafeRef(ref)) return '';
    const payload = await fetchGithubJsonSafe(
        `https://api.github.com/repos/${OFFICIAL_OWNER}/${OFFICIAL_REPO}/contents/package.json?ref=${encodeURIComponent(ref)}`
    );
    if (!payload || !payload.content) return '';
    try {
        const decoded = Buffer.from(payload.content, 'base64').toString('utf8');
        return JSON.parse(decoded).version || '';
    } catch {
        return '';
    }
}

async function readRemoteSnapshotViaGithub(localSha) {
    const repo = await fetchGithubJsonSafe(`https://api.github.com/repos/${OFFICIAL_OWNER}/${OFFICIAL_REPO}`);
    const defaultBranch = (repo && repo.default_branch) || 'master';
    const latestCommit = await fetchGithubJsonSafe(
        `https://api.github.com/repos/${OFFICIAL_OWNER}/${OFFICIAL_REPO}/commits/${encodeURIComponent(defaultBranch)}`
    );
    if (!latestCommit || !latestCommit.sha) {
        throw new Error('GitHub API snapshot unavailable');
    }
    const remoteSha = latestCommit.sha;
    const latest = mapGithubCommit(latestCommit);
    const version = await readRemotePackageVersion(remoteSha || defaultBranch);

    let compareStatus = 'unknown';
    let behindBy = 0;
    let aheadBy = 0;
    let commits = [];

    if (localSha && remoteSha && localSha === remoteSha) {
        compareStatus = 'identical';
    } else if (localSha && remoteSha && isSafeRef(localSha) && isSafeRef(remoteSha)) {
        const compare = await fetchGithubJsonSafe(
            `https://api.github.com/repos/${OFFICIAL_OWNER}/${OFFICIAL_REPO}/compare/${localSha}...${remoteSha}`
        );
        if (compare) {
            behindBy = Number(compare.ahead_by) || 0;
            aheadBy = Number(compare.behind_by) || 0;
            if (behindBy > 0 && aheadBy > 0) compareStatus = 'diverged';
            else if (behindBy > 0) compareStatus = 'behind';
            else if (aheadBy > 0) compareStatus = 'ahead';
            else compareStatus = 'identical';
            commits = (compare.commits || []).slice(-MAX_COMMITS).reverse().map(mapGithubCommit).filter(Boolean);
        }
    }

    if (commits.length === 0 && remoteSha && localSha !== remoteSha) {
        const list = await fetchGithubJsonSafe(
            `https://api.github.com/repos/${OFFICIAL_OWNER}/${OFFICIAL_REPO}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=${MAX_COMMITS}`
        );
        if (Array.isArray(list)) {
            commits = [];
            for (const item of list) {
                if (item.sha === localSha) break;
                const mapped = mapGithubCommit(item);
                if (mapped) commits.push(mapped);
            }
        }
    }

    return {
        defaultBranch,
        version,
        sha: remoteSha,
        shortSha: shortSha(remoteSha),
        branch: defaultBranch,
        message: latest?.message || '',
        date: latest?.date || '',
        htmlUrl: latest?.htmlUrl || `https://github.com/${OFFICIAL_OWNER}/${OFFICIAL_REPO}`,
        compareStatus,
        behindBy,
        aheadBy,
        commits,
    };
}

async function readRemoteSnapshot(localSha) {
    const canGit = hasGitDirectory() && await gitAvailable();
    if (canGit) {
        try {
            return await readRemoteSnapshotViaGit(localSha);
        } catch (error) {
            console.error('[PanelUpdate] git remote snapshot failed:', error.message);
        }
    }
    return readRemoteSnapshotViaGithub(localSha);
}

function isActiveStage(stage) {
    return ACTIVE_STAGES.has(stage);
}

function readProgressFile() {
    try {
        if (!fs.existsSync(PROGRESS_PATH)) return null;
        return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    } catch {
        return null;
    }
}

function persistProgress() {
    try {
        fs.mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
        fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
    } catch (error) {
        console.error('[PanelUpdate] Failed to persist progress:', error.message);
    }
}

function emitSocketProgress() {
    if (process.env.BLOCKMINE_UPDATE_WORKER === '1') return;
    try {
        const { getIOSafe } = require('../../real-time/socketHandler');
        getIOSafe().emit('panel:update', {
            stage: progress.stage,
            percent: progress.percent,
            message: progress.message,
            log: progress.log,
        });
    } catch (error) {
        console.error('[PanelUpdate] Failed to emit progress:', error.message);
    }
}

function idleProgress() {
    return {
        stage: 'idle',
        percent: 0,
        message: '',
        log: [],
        at: Date.now(),
    };
}

function discardInactiveProgress() {
    const age = Date.now() - (progress.at || 0);
    const active = isActiveStage(progress.stage);
    if (active && age < STALE_PROGRESS_MS) return;
    if (progress.stage === 'error' && age < STALE_PROGRESS_MS) return;
    if (progress.stage === 'idle' && (!progress.log || progress.log.length === 0)) return;
    applying = false;
    stopProgressWatch();
    progress = idleProgress();
    persistProgress();
}

function getProgress() {
    resumeFromProgressFile();
    discardInactiveProgress();
    return { ...progress, applying };
}

function emitProgress(partial) {
    const nextLog = Array.isArray(progress.log) ? progress.log.slice() : [];
    if (Object.prototype.hasOwnProperty.call(partial, 'log') && Array.isArray(partial.log)) {
        nextLog.splice(0, nextLog.length, ...partial.log);
    }
    if (partial.line) {
        nextLog.push(String(partial.line).trimEnd());
        if (nextLog.length > 40) nextLog.splice(0, nextLog.length - 40);
    }
    progress = {
        ...progress,
        ...partial,
        log: nextLog,
        at: Date.now(),
    };
    persistProgress();
    emitSocketProgress();
}

function stopProgressWatch() {
    if (watchTimer) {
        clearInterval(watchTimer);
        watchTimer = null;
    }
}

function restartWithPm2() {
    const target = getPm2Target();
    if (!isSafeRef(target) && !/^\d+$/.test(target)) {
        process.emit('SIGINT');
        return;
    }
    const bins = process.platform === 'win32'
        ? ['pm2.cmd', 'pm2']
        : ['pm2'];
    const localBin = path.join(
        REPO_ROOT,
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'pm2.cmd' : 'pm2'
    );
    if (fs.existsSync(localBin)) {
        bins.push(localBin);
    }
    const sibling = path.join(
        path.dirname(process.execPath),
        process.platform === 'win32' ? 'pm2.cmd' : 'pm2'
    );
    if (fs.existsSync(sibling)) {
        bins.push(sibling);
    }

    const trySpawn = (index) => {
        if (index >= bins.length) {
            console.error('[PanelUpdate] pm2 not found, falling back to SIGINT');
            process.emit('SIGINT');
            return;
        }
        const child = spawn(bins[index], ['restart', target], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            env: process.env,
        });
        child.on('error', (error) => {
            if (error.code === 'ENOENT') {
                trySpawn(index + 1);
                return;
            }
            console.error('[PanelUpdate] pm2 restart failed:', error.message);
            process.emit('SIGINT');
        });
        child.unref();
    };
    trySpawn(0);
}

function handleRestartStage() {
    stopProgressWatch();
    applying = false;
    const method = resolveRestartMethod();
    if (method === 'none' || method === 'nodemon') {
        return;
    }
    if (method === 'pm2') {
        try {
            restartWithPm2();
        } catch (error) {
            console.error('[PanelUpdate] Failed to restart via PM2:', error.message);
            process.emit('SIGINT');
        }
        return;
    }
    try {
        scheduleRelaunch();
    } catch (error) {
        console.error('[PanelUpdate] Failed to schedule relaunch:', error.message);
    }
    process.emit('SIGINT');
}

function startProgressWatch() {
    if (process.env.BLOCKMINE_UPDATE_WORKER === '1') return;
    if (watchTimer) return;
    watchTimer = setInterval(() => {
        const data = readProgressFile();
        if (!data) return;
        progress = {
            stage: data.stage || 'idle',
            percent: data.percent || 0,
            message: data.message || '',
            log: Array.isArray(data.log) ? data.log : [],
            at: data.at || Date.now(),
        };
        applying = isActiveStage(progress.stage);
        emitSocketProgress();
        if (progress.stage === 'restarting') {
            handleRestartStage();
        }
        if (progress.stage === 'error' || progress.stage === 'done' || progress.stage === 'idle') {
            applying = false;
            stopProgressWatch();
        }
    }, 500);
}

function resumeFromProgressFile() {
    if (resumed) return;
    resumed = true;
    applying = false;
    progress = idleProgress();
    persistProgress();
}

async function checkForUpdate(options = {}) {
    resumeFromProgressFile();
    discardInactiveProgress();
    const fresh = Boolean(options.fresh);
    if (!fresh && checkCache.value && (Date.now() - checkCache.at) < CHECK_CACHE_MS) {
        return { ...checkCache.value, cached: true, applying };
    }

    const current = await readLocalGitState();
    let latest = {
        version: '',
        sha: '',
        shortSha: '',
        branch: '',
        message: '',
        date: '',
        htmlUrl: `https://github.com/${OFFICIAL_OWNER}/${OFFICIAL_REPO}`,
        commits: [],
        compareStatus: 'unknown',
        behindBy: 0,
        aheadBy: 0,
        defaultBranch: 'master',
    };

    try {
        latest = await readRemoteSnapshot(current.sha);
    } catch (error) {
        console.error('[PanelUpdate] Failed to read GitHub snapshot:', error.message);
        const decision = resolveUpdateDecision({
            hasGit: current.hasGit,
            gitAvailable: current.gitAvailable,
            localSha: current.sha,
            remoteSha: '',
            dirty: current.dirty,
            branch: current.branch,
            defaultBranch: latest.defaultBranch,
            compareStatus: 'unknown',
            behindBy: 0,
            localVersion: current.version,
            remoteVersion: '',
        });
        const result = {
            current: {
                version: current.version,
                sha: current.sha,
                shortSha: current.shortSha,
                branch: current.branch,
                message: current.message,
                date: current.date,
                dirty: current.dirty,
            },
            latest: {
                version: '',
                sha: '',
                shortSha: '',
                branch: '',
                message: '',
                date: '',
                htmlUrl: latest.htmlUrl,
            },
            commits: [],
            aheadBy: 0,
            behindBy: 0,
            installKind: current.hasGit ? 'git' : 'npx',
            restartMethod: resolveRestartMethod(),
            ...decision,
            applying,
            cached: false,
        };
        return result;
    }

    const decision = resolveUpdateDecision({
        hasGit: current.hasGit,
        gitAvailable: current.gitAvailable,
        localSha: current.sha,
        remoteSha: latest.sha,
        dirty: current.dirty,
        branch: current.branch,
        defaultBranch: latest.defaultBranch,
        compareStatus: latest.compareStatus,
        behindBy: latest.behindBy,
        localVersion: current.version,
        remoteVersion: latest.version,
    });

    const result = {
        current: {
            version: current.version,
            sha: current.sha,
            shortSha: current.shortSha,
            branch: current.branch,
            message: current.message,
            date: current.date,
            dirty: current.dirty,
        },
        latest: {
            version: latest.version,
            sha: latest.sha,
            shortSha: latest.shortSha,
            branch: latest.branch,
            message: latest.message,
            date: latest.date,
            htmlUrl: latest.htmlUrl,
        },
        commits: latest.commits || [],
        aheadBy: latest.aheadBy,
        behindBy: latest.behindBy,
        installKind: current.hasGit ? 'git' : 'npx',
        restartMethod: resolveRestartMethod(),
        ...decision,
        applying,
        cached: false,
    };

    checkCache = { at: Date.now(), value: result };
    return result;
}

function npmBin() {
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runLogged(command, args, timeout) {
    return new Promise((resolve, reject) => {
        const win = process.platform === 'win32';
        const needsShell = win && (command === 'npm' || command === 'npm.cmd' || /\.(cmd|bat)$/i.test(command));
        const child = execFile(command, args, {
            cwd: REPO_ROOT,
            timeout,
            maxBuffer: 8 * 1024 * 1024,
            windowsHide: true,
            shell: needsShell,
            env: {
                ...process.env,
                HUSKY: '0',
                GIT_TERMINAL_PROMPT: '0',
                GIT_ASKPASS: 'echo',
                PRISMA_ENGINES_MIRROR: process.env.PRISMA_ENGINES_MIRROR || 'https://cdn.npmmirror.com/binaries/prisma',
                PRISMA_BINARIES_MIRROR: process.env.PRISMA_BINARIES_MIRROR || 'https://cdn.npmmirror.com/binaries/prisma',
            },
        }, (error, stdout, stderr) => {
            if (error) {
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });

        const handleChunk = (chunk) => {
            const text = String(chunk);
            const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
            for (const line of lines.slice(-8)) {
                emitProgress({ line });
            }
        };
        child.stdout?.on('data', handleChunk);
        child.stderr?.on('data', handleChunk);
    });
}

function writeRestartStamp() {
    fs.writeFileSync(STAMP_PATH, JSON.stringify({ at: Date.now() }));
}

function usesStartBatSupervisor() {
    return process.platform === 'win32' && fs.existsSync(path.join(REPO_ROOT, 'start.bat'));
}

function writeUpdateRequest(branch) {
    fs.mkdirSync(path.dirname(UPDATE_REQUEST_PATH), { recursive: true });
    fs.writeFileSync(UPDATE_REQUEST_PATH, `${branch}\n`, 'utf8');
}

async function readWinProcess(pid) {
    const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}" | Select-Object ParentProcessId,CommandLine | ConvertTo-Json -Compress`,
    ], { timeout: 10000, windowsHide: true });
    const text = String(stdout || '').trim();
    if (!text) return null;
    return JSON.parse(text);
}

async function findDevSupervisorPid() {
    let pid = process.pid;
    for (let step = 0; step < 12; step += 1) {
        const info = await readWinProcess(pid);
        if (!info) break;
        const command = String(info.CommandLine || '');
        if (/start\.bat/i.test(command)) break;
        if (/concurrently/i.test(command)) return pid;
        if (/npm(?:\.cmd)?\s+run\s+dev/i.test(command) && !/workspace/i.test(command)) return pid;
        const parent = Number(info.ParentProcessId);
        if (!parent || parent === pid) break;
        pid = parent;
    }
    return process.ppid;
}

function scheduleDevShutdown() {
    setTimeout(() => {
        const finish = () => {
            process.exit(0);
        };
        if (process.platform !== 'win32') {
            killPortListeners(5173).finally(() => {
                try {
                    process.kill(process.ppid, 'SIGTERM');
                } catch {
                    finish();
                    return;
                }
                finish();
            });
            return;
        }
        findDevSupervisorPid().then((supervisorPid) => {
            execFile('taskkill', ['/F', '/T', '/PID', String(supervisorPid)], { windowsHide: true }, finish);
        }).catch(() => {
            killPortListeners(5173).finally(finish);
        });
    }, 1200);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseListeningPids(netstatOutput, port) {
    const pids = new Set();
    const needle = `:${port}`;
    for (const line of String(netstatOutput || '').split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const local = parts[1] || '';
        if (!local.endsWith(needle) && !local.includes(`:${port}]`)) continue;
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
}

async function killPids(pids) {
    const self = String(process.pid);
    for (const pid of pids) {
        if (!pid || pid === self) continue;
        try {
            if (process.platform === 'win32') {
                await execFileAsync('taskkill', ['/F', '/PID', String(pid)], { windowsHide: true, timeout: 15000 });
            } else {
                process.kill(Number(pid), 'SIGTERM');
            }
        } catch {
            continue;
        }
    }
}

async function killPortListeners(port) {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execFileAsync('netstat', ['-ano'], { timeout: 15000, windowsHide: true });
            await killPids(parseListeningPids(stdout, port));
            return;
        }
        try {
            await execFileAsync('fuser', ['-k', `${port}/tcp`], { timeout: 15000 });
        } catch {
            const { stdout } = await execFileAsync('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN'], { timeout: 15000 });
            await killPids(String(stdout).trim().split(/\s+/).filter(Boolean));
        }
    } catch {
        return;
    }
}

async function stopRunningPanel(restartMethod) {
    emitProgress({ stage: 'stopping', percent: 8, message: 'stopping', line: 'stopping panel' });
    if (restartMethod === 'pm2') {
        const target = getPm2Target();
        try {
            await runLogged(process.platform === 'win32' ? 'pm2.cmd' : 'pm2', ['stop', target], 60000);
        } catch {
            emitProgress({ line: 'pm2 stop failed, killing ports' });
        }
        return;
    }
    if (process.platform === 'win32') {
        try {
            await execFileAsync('taskkill', ['/F', '/FI', 'WINDOWTITLE eq BlockMine'], {
                windowsHide: true,
                timeout: 15000,
            });
        } catch {
            emitProgress({ line: 'no BlockMine console window' });
        }
    }
    await killPortListeners(3001);
    await killPortListeners(5173);
}

function relaunchPanel(restartMethod) {
    emitProgress({ stage: 'restarting', percent: 96, message: 'restarting', line: 'starting panel' });
    if (restartMethod === 'pm2') {
        const target = getPm2Target();
        const child = spawn(process.platform === 'win32' ? 'pm2.cmd' : 'pm2', ['restart', target], {
            cwd: REPO_ROOT,
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            shell: process.platform === 'win32',
            env: process.env,
        });
        child.unref();
        return;
    }

    const startBat = path.join(REPO_ROOT, 'start.bat');
    if (process.platform === 'win32' && fs.existsSync(startBat)) {
        spawnWindowsProcess(startBat, [], { hidden: false });
        return;
    }

    if (restartMethod === 'nodemon' || isDevelopment()) {
        const child = spawn(npmBin(), ['run', 'dev'], {
            cwd: REPO_ROOT,
            detached: true,
            stdio: 'ignore',
            windowsHide: false,
            shell: process.platform === 'win32',
            env: process.env,
        });
        child.unref();
        return;
    }

    const cli = path.join(REPO_ROOT, 'backend', 'cli.js');
    const child = spawn(process.execPath, [cli], {
        cwd: path.join(REPO_ROOT, 'backend'),
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: process.env,
    });
    child.unref();
}

function scheduleRelaunch() {
    relaunchPanel('spawn');
}

function psQuote(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
}

function spawnWindowsProcess(filePath, args, options = {}) {
    const argList = (args || []).map(psQuote).join(',');
    const windowStyle = options.hidden ? 'Hidden' : 'Normal';
    const command = [
        'Start-Process',
        '-FilePath', psQuote(filePath),
        '-WorkingDirectory', psQuote(REPO_ROOT),
        '-WindowStyle', windowStyle,
        argList ? `-ArgumentList @(${argList})` : '',
    ].filter(Boolean).join(' ');
    const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command',
        command,
    ], {
        cwd: REPO_ROOT,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: options.env || process.env,
    });
    child.unref();
}

function writeUpdateLauncher(branch, method) {
    const dir = path.join(os.homedir(), '.blockmine');
    fs.mkdirSync(dir, { recursive: true });
    const logPath = path.join(dir, 'update-worker.log');
    const cmdPath = path.join(dir, 'run-update.cmd');
    const launchPath = path.join(dir, 'launch-update.cmd');
    const workerPath = path.join(__dirname, 'panelUpdateWorker.js');
    const body = [
        '@echo off',
        `cd /d "${REPO_ROOT}"`,
        'set BLOCKMINE_UPDATE_WORKER=1',
        `set BLOCKMINE_RESTART_METHOD=${method}`,
        `>>"${logPath}" echo launch %date% %time%`,
        `"${process.execPath}" "${workerPath}" ${branch} ${method} >>"${logPath}" 2>&1`,
        `>>"${logPath}" echo exit %ERRORLEVEL% %date% %time%`,
    ].join('\r\n');
    fs.writeFileSync(cmdPath, body, 'utf8');
    fs.writeFileSync(launchPath, `@echo off\r\nstart "" /min "${cmdPath}"\r\n`, 'utf8');
    return launchPath;
}

function spawnUpdateWorker(branch, restartMethod) {
    const workerPath = path.join(__dirname, 'panelUpdateWorker.js');
    const method = restartMethod || 'nodemon';
    const env = {
        ...process.env,
        BLOCKMINE_UPDATE_WORKER: '1',
        BLOCKMINE_RESTART_METHOD: method,
    };
    if (process.platform === 'win32') {
        const launchPath = writeUpdateLauncher(branch, method);
        const child = spawn('cmd.exe', ['/c', launchPath], {
            cwd: REPO_ROOT,
            detached: true,
            stdio: 'ignore',
            env,
        });
        child.unref();
        return;
    }
    const child = spawn(process.execPath, [workerPath, branch, method], {
        cwd: REPO_ROOT,
        detached: true,
        stdio: 'ignore',
        env,
    });
    child.unref();
}

async function runPanelUpdateJob(branch, restartMethod) {
    if (!isSafeRef(branch)) {
        const error = new Error('invalid_branch');
        error.code = 'invalid_branch';
        throw error;
    }
    const method = restartMethod || process.env.BLOCKMINE_RESTART_METHOD || resolveRestartMethod();

    try {
        await sleep(1500);
        await stopRunningPanel(method);
        await sleep(1500);

        emitProgress({ stage: 'fetch', percent: 20, message: 'fetch', log: progress.log || [], line: `git fetch ${OFFICIAL_GIT_URL} ${branch}` });
        await runLogged('git', ['fetch', OFFICIAL_GIT_URL, branch], 120000);

        emitProgress({ stage: 'pull', percent: 35, message: 'pull', line: 'git merge --ff-only FETCH_HEAD' });
        await runLogged('git', ['merge', '--ff-only', 'FETCH_HEAD'], 120000);

        emitProgress({ stage: 'install', percent: 50, message: 'install', line: 'npm install' });
        await runLogged(npmBin(), ['install', '--no-fund', '--no-audit'], 15 * 60 * 1000);

        if (method !== 'nodemon' && !isDevelopment()) {
            emitProgress({ stage: 'build', percent: 80, message: 'build', line: 'npm run build' });
            await runLogged(npmBin(), ['run', 'build'], 15 * 60 * 1000);
        } else {
            emitProgress({ stage: 'build', percent: 88, message: 'build_skipped', line: 'dev: skip production build' });
        }

        relaunchPanel(method);
        emitProgress({ stage: 'restarting', percent: 100, message: 'restarting' });
        return { ok: true, restarting: true };
    } catch (error) {
        const detail = String(error.stderr || error.stdout || error.message || 'update_failed').slice(0, 2000);
        emitProgress({
            stage: 'error',
            percent: progress.percent || 0,
            message: 'error',
            line: detail,
        });
        try {
            relaunchPanel(method);
        } catch (relaunchError) {
            console.error('[PanelUpdate] Failed to relaunch after error:', relaunchError.message);
        }
        const wrapped = new Error('update_failed');
        wrapped.code = 'update_failed';
        wrapped.detail = detail;
        throw wrapped;
    }
}

async function applyUpdate() {
    resumeFromProgressFile();
    if (applying || isActiveStage(progress.stage)) {
        const error = new Error('update_in_progress');
        error.code = 'update_in_progress';
        throw error;
    }

    checkCache = { at: 0, value: null };
    const snapshot = await checkForUpdate({ fresh: true });
    if (!snapshot.canUpdate) {
        const error = new Error(snapshot.reason || 'cannot_update');
        error.code = snapshot.reason || 'cannot_update';
        throw error;
    }

    const branch = snapshot.latest.branch || 'master';
    if (!isSafeRef(branch)) {
        const error = new Error('invalid_branch');
        error.code = 'invalid_branch';
        throw error;
    }

    applying = true;
    emitProgress({ stage: 'stopping', percent: 5, message: 'stopping', log: [], line: 'starting updater' });

    if (usesStartBatSupervisor()) {
        writeUpdateRequest(branch);
        scheduleDevShutdown();
        return { ok: true, started: true, closing: true };
    }

    try {
        spawnUpdateWorker(branch, resolveRestartMethod());
        return { ok: true, started: true, closing: true };
    } catch (error) {
        applying = false;
        emitProgress({ stage: 'error', percent: 0, message: 'error', line: error.message });
        throw error;
    }
}

module.exports = {
    REPO_ROOT,
    OFFICIAL_OWNER,
    OFFICIAL_REPO,
    shortSha,
    firstLine,
    isDefaultBranch,
    isSafeRef,
    parseListeningPids,
    mapGithubCommit,
    parseGitLogLine,
    resolveUpdateDecision,
    resolveRestartMethod,
    getPm2Target,
    checkForUpdate,
    applyUpdate,
    runPanelUpdateJob,
    getProgress,
    isApplying: () => applying,
};
