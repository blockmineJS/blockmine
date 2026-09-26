const {
    shortSha,
    firstLine,
    isDefaultBranch,
    isSafeRef,
    officialUpdateRef,
    officialFetchRefspec,
    mapGithubCommit,
    parseGitLogLine,
    parseListeningPids,
    resolveUpdateDecision,
    resolveRestartMethod,
    getPm2Target,
} = require('../../core/services/PanelUpdateService');

describe('PanelUpdateService helpers', () => {
    test('shortSha берёт первые 7 символов', () => {
        expect(shortSha('abcdef1234567890')).toBe('abcdef1');
        expect(shortSha('')).toBe('');
        expect(shortSha(null)).toBe('');
    });

    test('firstLine отрезает тело коммита', () => {
        expect(firstLine('feat: panel update\n\nlonger body')).toBe('feat: panel update');
        expect(firstLine('')).toBe('');
    });

    test('isDefaultBranch понимает master/main и ветку репозитория', () => {
        expect(isDefaultBranch('master', 'main')).toBe(true);
        expect(isDefaultBranch('main', 'master')).toBe(true);
        expect(isDefaultBranch('HEAD', 'master')).toBe(true);
        expect(isDefaultBranch('feat/update', 'master')).toBe(false);
        expect(isDefaultBranch('develop', 'develop')).toBe(true);
    });

    test('isSafeRef отклоняет опасные аргументы git', () => {
        expect(isSafeRef('master')).toBe(true);
        expect(isSafeRef('feat/panel-update')).toBe(true);
        expect(isSafeRef('-c')).toBe(false);
        expect(isSafeRef('main; rm -rf /')).toBe(false);
        expect(isSafeRef('abc..def')).toBe(false);
    });

    test('обновление кладёт официальную ветку в свою ссылку, без FETCH_HEAD', () => {
        expect(officialUpdateRef('master')).toBe('refs/panel-update/master');
        expect(officialFetchRefspec('master')).toBe('+refs/heads/master:refs/panel-update/master');
        expect(officialFetchRefspec('-c')).toBe('+refs/heads/master:refs/panel-update/master');
    });

    test('parseListeningPids достаёт PID из netstat', () => {
        const sample = [
            'TCP    127.0.0.1:3001         0.0.0.0:0              LISTENING       12345',
            'TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       67890',
            'TCP    127.0.0.1:3001         127.0.0.1:54321        ESTABLISHED     11111',
        ].join('\n');
        expect(parseListeningPids(sample, 3001)).toEqual(['12345']);
        expect(parseListeningPids(sample, 5173)).toEqual(['67890']);
    });

    test('parseGitLogLine разбирает git log', () => {
        const mapped = parseGitLogLine('abcdef1234567890\x1ffeat: panel\x1fmerka\x1f2026-09-25T15:32:00+03:00');
        expect(mapped.shortSha).toBe('abcdef1');
        expect(mapped.message).toBe('feat: panel');
        expect(mapped.author).toBe('merka');
    });

    test('mapGithubCommit собирает короткое описание', () => {
        const mapped = mapGithubCommit({
            sha: '1234567890abcdef',
            html_url: 'https://github.com/blockmineJS/blockmine/commit/1234567890abcdef',
            commit: {
                message: 'fix: bot kick\n\ndetails',
                author: { name: 'merka', date: '2026-09-24T10:00:00Z' },
            },
        });
        expect(mapped.shortSha).toBe('1234567');
        expect(mapped.message).toBe('fix: bot kick');
        expect(mapped.author).toBe('merka');
    });
});

describe('resolveUpdateDecision', () => {
    const base = {
        hasGit: true,
        gitAvailable: true,
        localSha: 'aaa1111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        remoteSha: 'bbb2222bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        dirty: false,
        branch: 'master',
        defaultBranch: 'master',
        compareStatus: 'behind',
        behindBy: 4,
        localVersion: '1.27.1',
        remoteVersion: '1.27.1',
    };

    test('можно обновлять git-клон на master без локальных правок', () => {
        expect(resolveUpdateDecision(base)).toEqual({
            updateAvailable: true,
            canUpdate: true,
            reason: null,
        });
    });

    test('одинаковые коммиты — обновления нет', () => {
        const sha = base.localSha;
        expect(resolveUpdateDecision({
            ...base,
            remoteSha: sha,
            compareStatus: 'identical',
            behindBy: 0,
        })).toEqual({
            updateAvailable: false,
            canUpdate: false,
            reason: 'same',
        });
    });

    test('npx-установка видит новую версию, но без кнопки pull', () => {
        expect(resolveUpdateDecision({
            ...base,
            hasGit: false,
            gitAvailable: false,
            localSha: '',
            compareStatus: 'unknown',
            behindBy: 0,
            localVersion: '1.27.1',
            remoteVersion: '1.28.0',
        })).toEqual({
            updateAvailable: true,
            canUpdate: false,
            reason: 'not_git',
        });
    });

    test('локальные правки не блокируют кнопку', () => {
        expect(resolveUpdateDecision({ ...base, dirty: true })).toEqual({
            updateAvailable: true,
            canUpdate: true,
            reason: null,
        });
    });

    test('фича-ветка не обновляется автоматически', () => {
        expect(resolveUpdateDecision({ ...base, branch: 'feat/foo' })).toEqual({
            updateAvailable: true,
            canUpdate: false,
            reason: 'wrong_branch',
        });
    });

    test('разошедшаяся история не делает ff-only', () => {
        expect(resolveUpdateDecision({
            ...base,
            compareStatus: 'diverged',
            behindBy: 2,
        })).toEqual({
            updateAvailable: true,
            canUpdate: false,
            reason: 'diverged',
        });
    });

    test('Linux PM2 перезапускается через pm2 restart', () => {
        expect(resolveRestartMethod({ NODE_ENV: 'production', pm_id: '0' })).toBe('pm2');
        expect(getPm2Target({ pm_id: '0', name: 'blockmine' })).toBe('0');
        expect(resolveRestartMethod({ NODE_ENV: 'production' })).toBe('spawn');
        expect(resolveRestartMethod({ NODE_ENV: 'development' })).toBe('nodemon');
    });

    test('оффлайн GitHub не предлагает обновление', () => {
        expect(resolveUpdateDecision({
            ...base,
            remoteSha: '',
            remoteVersion: '',
            compareStatus: 'unknown',
            behindBy: 0,
        })).toEqual({
            updateAvailable: false,
            canUpdate: false,
            reason: 'offline',
        });
    });
});
